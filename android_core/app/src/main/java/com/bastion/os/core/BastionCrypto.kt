
package com.bastion.os.core

import android.util.Base64
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import java.util.UUID
import java.util.Arrays

/**
 * BASTION CRYPTOGRAPHIC PROTOCOL (ANDROID)
 */
object BastionCrypto {
    private const val PBKDF2_VAULT_ALGO = "PBKDF2WithHmacSHA256"
    private const val PBKDF2_CHAOS_ALGO = "PBKDF2WithHmacSHA512"
    private const val AES_ALGO = "AES/GCM/NoPadding"
    private const val ITERATIONS = 210_000
    private const val SALT_LEN = 16
    private const val IV_LEN = 12
    private const val TAG_LEN = 128
    
    private val MAGIC_BYTES = "BASTION1".toByteArray(Charsets.UTF_8)

    // --- CHAOS LOCK (VAULT STORAGE) ---

    fun unpackVault(blob: String, password: String): String {
        val bytes = Base64.decode(blob, Base64.DEFAULT)
        if (bytes.size < SALT_LEN + IV_LEN) throw IllegalArgumentException("Invalid Blob Size")

        val salt = bytes.copyOfRange(0, SALT_LEN)
        val iv = bytes.copyOfRange(SALT_LEN, SALT_LEN + IV_LEN)
        val cipherText = bytes.copyOfRange(SALT_LEN + IV_LEN, bytes.size)

        // DOMAIN SEPARATION
        val domain = "BASTION_VAULT_V1::".toByteArray(StandardCharsets.UTF_8)
        val finalSalt = ByteArray(domain.size + salt.size)
        System.arraycopy(domain, 0, finalSalt, 0, domain.size)
        System.arraycopy(salt, 0, finalSalt, domain.size, salt.size)

        val spec = PBEKeySpec(password.toCharArray(), finalSalt, ITERATIONS, 256)
        val factory = SecretKeyFactory.getInstance(PBKDF2_VAULT_ALGO)
        val keyBytes = factory.generateSecret(spec).encoded
        val key = SecretKeySpec(keyBytes, "AES")

        val cipher = Cipher.getInstance(AES_ALGO)
        val gcmSpec = GCMParameterSpec(TAG_LEN, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec)
        
        val plainBytes = cipher.doFinal(cipherText)
        
        // --- DEFRAME ---
        // Protocol V3: [LENGTH (4 bytes LE)] + [JSON PAYLOAD] + [PADDING]
        if (plainBytes.size < 4) return String(plainBytes, StandardCharsets.UTF_8)
        
        val bb = ByteBuffer.wrap(plainBytes)
        bb.order(ByteOrder.LITTLE_ENDIAN)
        // Read uint32 (treat as positive long)
        val claimedLen = bb.int.toLong() and 0xFFFFFFFFL
        
        if (claimedLen <= plainBytes.size - 4) {
            val actualBytes = plainBytes.copyOfRange(4, 4 + claimedLen.toInt())
            return String(actualBytes, StandardCharsets.UTF_8)
        }
        
        // Fallback for V1/V2 (No header)
        return String(plainBytes, StandardCharsets.UTF_8)
    }

    fun packVault(jsonState: String, password: String): String {
        val salt = ByteArray(SALT_LEN)
        val iv = ByteArray(IV_LEN)
        SecureRandom().nextBytes(salt)
        SecureRandom().nextBytes(iv)

        // DOMAIN SEPARATION
        val domain = "BASTION_VAULT_V1::".toByteArray(StandardCharsets.UTF_8)
        val finalSalt = ByteArray(domain.size + salt.size)
        System.arraycopy(domain, 0, finalSalt, 0, domain.size)
        System.arraycopy(salt, 0, finalSalt, domain.size, salt.size)

        val spec = PBEKeySpec(password.toCharArray(), finalSalt, ITERATIONS, 256)
        val factory = SecretKeyFactory.getInstance(PBKDF2_VAULT_ALGO)
        val keyBytes = factory.generateSecret(spec).encoded
        val key = SecretKeySpec(keyBytes, "AES")

        val cipher = Cipher.getInstance(AES_ALGO)
        val gcmSpec = GCMParameterSpec(TAG_LEN, iv)
        cipher.init(Cipher.ENCRYPT_MODE, key, gcmSpec)
        
        // --- FRAME & PAD ---
        val jsonBytes = jsonState.toByteArray(StandardCharsets.UTF_8)
        val len = jsonBytes.size
        
        // Header
        val header = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(len).array()
        
        // Padding (Align to 64 bytes)
        val totalRaw = 4 + len
        val remainder = totalRaw % 64
        val paddingNeeded = if (remainder == 0) 0 else 64 - remainder
        val padding = ByteArray(paddingNeeded) // 0x00 initialized
        
        // Combine
        val plaintext = header + jsonBytes + padding
        
        val cipherText = cipher.doFinal(plaintext)

        val output = ByteArray(SALT_LEN + IV_LEN + cipherText.size)
        System.arraycopy(salt, 0, output, 0, SALT_LEN)
        System.arraycopy(iv, 0, output, SALT_LEN, IV_LEN)
        System.arraycopy(cipherText, 0, output, SALT_LEN + IV_LEN, cipherText.size)

        return Base64.encodeToString(output, Base64.NO_WRAP)
    }

    // --- CHAOS ENGINE (DETERMINISTIC PASSWORDS) ---

    private const val ALPHA = "abcdefghijklmnopqrstuvwxyz"
    private const val CAPS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    private const val NUM = "0123456789"
    private const val SYM = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    fun transmute(
        masterEntropy: String,
        serviceName: String,
        username: String,
        version: Int,
        length: Int,
        useSymbols: Boolean
    ): String {
        // DOMAIN SEPARATION
        val saltStr = "BASTION_GENERATOR_V2::${serviceName.lowercase()}::${username.lowercase()}::v$version"
        val saltBytes = saltStr.toByteArray(StandardCharsets.UTF_8)

        val dkLen = length * 32 // Surplus for rejection
        val spec = PBEKeySpec(masterEntropy.toCharArray(), saltBytes, ITERATIONS, dkLen)
        val factory = SecretKeyFactory.getInstance(PBKDF2_CHAOS_ALGO)
        val fluxBytes = factory.generateSecret(spec).encoded

        val poolBuilder = StringBuilder().append(ALPHA).append(CAPS).append(NUM)
        if (useSymbols) poolBuilder.append(SYM)
        val pool = poolBuilder.toString()

        // REJECTION SAMPLING
        val limit = 256 - (256 % pool.length)
        val sb = StringBuilder()
        var i = 0
        
        while (sb.length < length && i < fluxBytes.size) {
            val byteVal = fluxBytes[i].toInt() and 0xFF
            i++
            
            if (byteVal < limit) {
                val charIndex = byteVal % pool.length
                sb.append(pool[charIndex])
            }
        }

        return sb.toString()
    }

    // --- LOCKER ENGINE (FILE ENCRYPTION) ---

    data class LockerResult(val id: String, val keyHex: String, val artifact: ByteArray)

    fun encryptFile(data: ByteArray): LockerResult {
        val id = UUID.randomUUID().toString()
        val key = ByteArray(32)
        val iv = ByteArray(IV_LEN)
        SecureRandom().nextBytes(key)
        SecureRandom().nextBytes(iv)

        val keySpec = SecretKeySpec(key, "AES")
        val cipher = Cipher.getInstance(AES_ALGO)
        val spec = GCMParameterSpec(TAG_LEN, iv)
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, spec)
        val cipherText = cipher.doFinal(data)

        // Structure: MAGIC(8) + ID(36) + IV(12) + CipherText(N)
        val idBytes = String.format("%-36s", id).toByteArray(Charsets.UTF_8)
        val output = MAGIC_BYTES + idBytes + iv + cipherText

        return LockerResult(id, bytesToHex(key), output)
    }

    fun decryptFile(artifact: ByteArray, keyHex: String): ByteArray {
        if (artifact.size < 56) throw IllegalArgumentException("Corrupted artifact")
        
        // Check Magic
        val magic = artifact.copyOfRange(0, 8)
        if (!magic.contentEquals(MAGIC_BYTES)) throw IllegalArgumentException("Invalid File Format")

        val iv = artifact.copyOfRange(44, 56)
        val cipherText = artifact.copyOfRange(56, artifact.size)
        val key = hexToBytes(keyHex)

        val keySpec = SecretKeySpec(key, "AES")
        val cipher = Cipher.getInstance(AES_ALGO)
        val spec = GCMParameterSpec(TAG_LEN, iv)
        cipher.init(Cipher.DECRYPT_MODE, keySpec, spec)
        
        return cipher.doFinal(cipherText)
    }

    fun getFileId(artifact: ByteArray): String? {
        if (artifact.size < 44) return null
        val magic = artifact.copyOfRange(0, 8)
        if (!magic.contentEquals(MAGIC_BYTES)) return null
        val idBytes = artifact.copyOfRange(8, 44)
        return String(idBytes, Charsets.UTF_8).trim()
    }

    // --- SECRET SHARER (RESONANCE SPLITTING) ---
    
    object SecretSharer {
        private val LOG = IntArray(256)
        private val EXP = IntArray(256)

        init {
            // Initialize GF(256) tables for polynomial x^8 + x^4 + x^3 + x + 1 (0x11B)
            var x = 1
            for (i in 0 until 255) {
                EXP[i] = x
                LOG[x] = i
                x = x shl 1
                if ((x and 0x100) != 0) x = x xor 0x11B
            }
        }

        private fun mul(a: Int, b: Int): Int {
            if (a == 0 || b == 0) return 0
            var idx = LOG[a] + LOG[b]
            if (idx >= 255) idx -= 255
            return EXP[idx]
        }

        private fun div(a: Int, b: Int): Int {
            if (b == 0) throw ArithmeticException("Div by zero")
            if (a == 0) return 0
            var idx = LOG[a] - LOG[b]
            if (idx < 0) idx += 255
            return EXP[idx]
        }
        
        private fun pow(a: Int, b: Int): Int {
            if (b == 0) return 1
            if (a == 0) return 0
            val logA = LOG[a]
            val logRes = (logA * b) % 255
            return EXP[logRes]
        }

        fun split(secretStr: String, shares: Int, threshold: Int): List<String> {
            val secret = secretStr.toByteArray(StandardCharsets.UTF_8)
            val len = secret.size
            val coeffs = ByteArray(len * (threshold - 1))
            SecureRandom().nextBytes(coeffs)
            
            val idBytes = ByteArray(4)
            SecureRandom().nextBytes(idBytes)
            val id = bytesToHex(idBytes)

            val shards = ArrayList<String>()

            for (x in 1..shares) {
                val shareData = ByteArray(len)
                for (i in 0 until len) {
                    var y = secret[i].toInt() and 0xFF // Term 0 (the secret)
                    for (j in 0 until threshold - 1) {
                        val a = coeffs[i * (threshold - 1) + j].toInt() and 0xFF
                        val term = mul(a, pow(x, j + 1))
                        y = y xor term
                    }
                    shareData[i] = y.toByte()
                }
                shards.add("bst_s1_${id}_${threshold}_${x}_${bytesToHex(shareData)}")
            }
            return shards
        }

        fun combine(shards: List<String>): String {
            if (shards.isEmpty()) throw IllegalArgumentException("No shards provided")
            
            data class Shard(val id: String, val k: Int, val x: Int, val data: ByteArray)
            
            val parsed = shards.map { s ->
                val parts = s.trim().split("_")
                if (parts.size != 6 || parts[0] != "bst" || parts[1] != "s1") throw IllegalArgumentException("Invalid shard format")
                Shard(parts[2], parts[3].toInt(), parts[4].toInt(), hexToBytes(parts[5]))
            }

            val first = parsed[0]
            if (parsed.size < first.k) throw IllegalArgumentException("Need ${first.k} shards to recover (Got ${parsed.size})")
            
            // Verify all belong to same secret
            if (parsed.any { it.id != first.id }) throw IllegalArgumentException("Shards belong to different secrets")

            val len = first.data.size
            val kShares = parsed.take(first.k)
            val secret = ByteArray(len)

            for (i in 0 until len) {
                var sum = 0
                for (j in kShares.indices) {
                    val xj = kShares[j].x
                    val yj = kShares[j].data[i].toInt() and 0xFF
                    
                    var basis = 1
                    for (m in kShares.indices) {
                        if (m == j) continue
                        val xm = kShares[m].x
                        val num = xm
                        val den = xj xor xm // sub is xor in GF256
                        if (den == 0) throw IllegalArgumentException("Duplicate shares detected")
                        basis = mul(basis, div(num, den))
                    }
                    sum = sum xor mul(yj, basis)
                }
                secret[i] = sum.toByte()
            }
            return String(secret, StandardCharsets.UTF_8)
        }
    }

    private fun bytesToHex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }
    private fun hexToBytes(hex: String): ByteArray = hex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
