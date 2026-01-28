
package com.bastion.os.core

import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import java.util.UUID

/**
 * BASTION CRYPTOGRAPHIC PROTOCOL (ANDROID)
 * 
 * Provides exact parity with the Web/TypeScript implementation.
 */
object BastionCrypto {
    private const val PBKDF2_VAULT_ALGO = "PBKDF2WithHmacSHA256"
    private const val PBKDF2_CHAOS_ALGO = "PBKDF2WithHmacSHA512"
    private const val AES_ALGO = "AES/GCM/NoPadding"
    private const val ITERATIONS = 100_000
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

        val spec = PBEKeySpec(password.toCharArray(), String(salt, Charsets.ISO_8859_1).toByteArray(Charsets.ISO_8859_1), ITERATIONS, 256)
        val factory = SecretKeyFactory.getInstance(PBKDF2_VAULT_ALGO)
        val keyBytes = factory.generateSecret(spec).encoded
        val key = SecretKeySpec(keyBytes, "AES")

        val cipher = Cipher.getInstance(AES_ALGO)
        val gcmSpec = GCMParameterSpec(TAG_LEN, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec)
        
        return String(cipher.doFinal(cipherText), StandardCharsets.UTF_8)
    }

    fun packVault(jsonState: String, password: String): String {
        val salt = ByteArray(SALT_LEN)
        val iv = ByteArray(IV_LEN)
        SecureRandom().nextBytes(salt)
        SecureRandom().nextBytes(iv)

        // Web parity: Web uses raw bytes for salt in PBKDF2. Android PBEKeySpec takes char[] or byte[]?
        // Standard Java PBEKeySpec takes salt as byte[].
        val spec = PBEKeySpec(password.toCharArray(), String(salt, Charsets.ISO_8859_1).toByteArray(Charsets.ISO_8859_1), ITERATIONS, 256)
        val factory = SecretKeyFactory.getInstance(PBKDF2_VAULT_ALGO)
        val keyBytes = factory.generateSecret(spec).encoded
        val key = SecretKeySpec(keyBytes, "AES")

        val cipher = Cipher.getInstance(AES_ALGO)
        val gcmSpec = GCMParameterSpec(TAG_LEN, iv)
        cipher.init(Cipher.ENCRYPT_MODE, key, gcmSpec)
        val cipherText = cipher.doFinal(jsonState.toByteArray(StandardCharsets.UTF_8))

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
        val saltStr = "FORTRESS_V1::${serviceName.lowercase()}::${username.lowercase()}::v$version"
        val saltBytes = saltStr.toByteArray(StandardCharsets.UTF_8)

        val spec = PBEKeySpec(masterEntropy.toCharArray(), saltBytes, ITERATIONS, 512)
        val factory = SecretKeyFactory.getInstance(PBKDF2_CHAOS_ALGO)
        val fluxBytes = factory.generateSecret(spec).encoded

        val poolBuilder = StringBuilder().append(ALPHA).append(CAPS).append(NUM)
        if (useSymbols) poolBuilder.append(SYM)
        val pool = poolBuilder.toString()

        val sb = StringBuilder()
        for (i in 0 until length) {
            val byteVal = fluxBytes[i % fluxBytes.size].toInt() and 0xFF
            val charIndex = byteVal % pool.length
            sb.append(pool[charIndex])
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

    private fun bytesToHex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }
    private fun hexToBytes(hex: String): ByteArray = hex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
