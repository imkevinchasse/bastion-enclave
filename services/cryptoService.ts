
import { VaultState, Resonance, VaultConfig } from "../types";
import { argon2id } from 'hash-wasm';
import { BastionSerializer } from "./serializer";

// PBKDF2 Constants (Legacy Support)
const PBKDF2_V2_ITERATIONS = 210_000;
const PBKDF2_V1_ITERATIONS = 100_000;
const PBKDF2_DIGEST = "SHA-512"; // Used for Chaos Generator (Flux)

// Argon2id Constants (Current Standard)
const ARGON_MEM_KB = 65536; // 64 MB
const ARGON_ITERATIONS = 3;
const ARGON_PARALLELISM = 1;
const ARGON_HASH_LEN = 32; // 256 bits

const MAGIC_BYTES = new Uint8Array([0x42, 0x41, 0x53, 0x54, 0x49, 0x4f, 0x4e, 0x31]); // "BASTION1"

// Protocol Headers
const HEADER_V2 = new Uint8Array([0x42, 0x53, 0x54, 0x4E, 0x02]); // "BSTN" + 0x02 (PBKDF2)
const HEADER_V3 = new Uint8Array([0x42, 0x53, 0x54, 0x4E, 0x03]); // "BSTN" + 0x03 (Argon2id Raw)
const HEADER_V3_5 = new Uint8Array([0x42, 0x53, 0x54, 0x4E, 0x04]); // "BSTN" + 0x04 (Argon2id + Framed/Padded)

const GLYPHS = {
  ALPHA: "abcdefghijklmnopqrstuvwxyz",
  CAPS: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  NUM: "0123456789",
  SYM: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

const cryptoAPI = globalThis.crypto;

/* ===================== HELPERS ===================== */

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  // Explicitly cast to ArrayBuffer to satisfy strict TS checks involving SharedArrayBuffer types
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

/* ===================== CHAOS LOCK ===================== */

export class ChaosLock {
  static getUUID(): string {
    return cryptoAPI.randomUUID
      ? cryptoAPI.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  }

  static enc(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  static dec(view: Uint8Array): string {
    return new TextDecoder().decode(toArrayBuffer(view));
  }

  static concat(...arrays: Uint8Array[]): Uint8Array {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
      out.set(a, offset);
      offset += a.length;
    }
    return out;
  }

  static buf2hex(buf: ArrayBuffer): string {
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  static hex2buf(hex: string): Uint8Array {
    const clean = hex.trim();
    if (clean.length % 2 !== 0) throw new Error("Invalid hex string length");
    if (!/^[0-9a-fA-F]+$/.test(clean)) throw new Error("Invalid hex characters detected");
    
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  static async computeHash(data: Uint8Array): Promise<string> {
    // Cast data to any to bypass strict BufferSource check
    const hash = await cryptoAPI.subtle.digest("SHA-256", data as any);
    return this.buf2hex(hash);
  }

  static async generateKey(): Promise<string> {
    const key = await cryptoAPI.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    return this.buf2hex(await cryptoAPI.subtle.exportKey("raw", key));
  }

  static getFileIdFromBlob(blob: Uint8Array): string {
    const idBytes = blob.slice(8, 44);
    return this.dec(idBytes).trim();
  }

  /**
   * V3/V3.5: Argon2id Key Derivation
   */
  private static async deriveKeyArgon2id(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const derivedBytes = await argon2id({
      password,
      salt,
      parallelism: ARGON_PARALLELISM,
      iterations: ARGON_ITERATIONS,
      memorySize: ARGON_MEM_KB,
      hashLength: ARGON_HASH_LEN,
      outputType: 'binary'
    });

    return cryptoAPI.subtle.importKey(
      "raw",
      derivedBytes as any, // Cast to any to satisfy BufferSource type
      "AES-GCM",
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * V1/V2: PBKDF2 Key Derivation (Legacy)
   */
  private static async deriveKeyPBKDF2(password: string, salt: Uint8Array, useDomainSeparation: boolean = true, iterations: number = PBKDF2_V2_ITERATIONS): Promise<CryptoKey> {
    let finalSalt = salt;
    
    if (useDomainSeparation) {
        const domainPrefix = this.enc("BASTION_VAULT_V1::");
        finalSalt = this.concat(domainPrefix, salt);
    }

    const material = await cryptoAPI.subtle.importKey(
      "raw",
      this.enc(password) as any,
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return cryptoAPI.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: toArrayBuffer(finalSalt),
        iterations: iterations,
        hash: "SHA-256",
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async encryptBinary(data: Uint8Array, password: string): Promise<Uint8Array> {
    const salt = cryptoAPI.getRandomValues(new Uint8Array(16));
    const iv = cryptoAPI.getRandomValues(new Uint8Array(12));
    
    const key = await this.deriveKeyArgon2id(password, salt);

    const encrypted = await cryptoAPI.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      toArrayBuffer(data)
    );

    return this.concat(HEADER_V3_5, salt, iv, new Uint8Array(encrypted));
  }

  static async decryptBinary(blob: Uint8Array, password: string): Promise<{ data: Uint8Array, version: number }> {
    let offset = 0;
    let version = 1;

    if (blob.length > 5) {
        if (blob[0] === 0x42 && blob[1] === 0x53 && blob[2] === 0x54 && blob[3] === 0x4E) {
            const vByte = blob[4];
            if (vByte === 0x04) version = 4;
            else if (vByte === 0x03) version = 3;
            else if (vByte === 0x02) version = 2;
            offset = 5;
        }
    }

    const salt = blob.slice(offset, offset + 16);
    const iv = blob.slice(offset + 16, offset + 28);
    const cipher = blob.slice(offset + 28);

    try {
        let key: CryptoKey;
        if (version >= 3) {
            key = await this.deriveKeyArgon2id(password, salt);
        } else if (version === 2) {
            key = await this.deriveKeyPBKDF2(password, salt, true, PBKDF2_V2_ITERATIONS);
        } else {
            key = await this.deriveKeyPBKDF2(password, salt, true, PBKDF2_V2_ITERATIONS);
        }

        const decrypted = await cryptoAPI.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            toArrayBuffer(cipher)
        );
        return { data: new Uint8Array(decrypted), version };
    } catch (e) {
        // Migration Fallbacks
        try {
            const key = await this.deriveKeyPBKDF2(password, salt, false, PBKDF2_V2_ITERATIONS);
            const decrypted = await cryptoAPI.subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                toArrayBuffer(cipher)
            );
            return { data: new Uint8Array(decrypted), version: 0 };
        } catch (e) {}

        try {
            const key = await this.deriveKeyPBKDF2(password, salt, false, PBKDF2_V1_ITERATIONS);
            const decrypted = await cryptoAPI.subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                toArrayBuffer(cipher)
            );
            return { data: new Uint8Array(decrypted), version: 0 };
        } catch (e) {}

        throw new Error("Decryption failed. Invalid password or incompatible vault version.");
    }
  }

  static async pack(state: VaultState, password: string): Promise<string> {
    const canonicalJson = BastionSerializer.serialize(state);
    const framedBytes = BastionSerializer.frame(canonicalJson);
    const encrypted = await this.encryptBinary(framedBytes, password);
    return btoa(String.fromCharCode(...encrypted));
  }

  static async unpack(blob: string, password: string): Promise<{ state: VaultState, version: number }> {
    const bytes = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
    const { data, version } = await this.decryptBinary(bytes, password);
    
    let jsonStr: string;
    if (version >= 4) {
        jsonStr = BastionSerializer.deframe(data);
    } else {
        jsonStr = new TextDecoder().decode(data);
    }
    
    const state = JSON.parse(jsonStr);
    return { state, version };
  }
}

/* ===================== SECRET SHARER V2 (BIGINT PRIME FIELD) ===================== */

const PRIME = 2n ** 256n - 2n ** 32n - 977n;

const BN = {
    add: (a: bigint, b: bigint) => (a + b) % PRIME,
    sub: (a: bigint, b: bigint) => {
        const res = (a - b) % PRIME;
        return res < 0n ? res + PRIME : res;
    },
    mul: (a: bigint, b: bigint) => (a * b) % PRIME,
    pow: (base: bigint, exp: bigint) => {
        let res = 1n;
        base = base % PRIME;
        while (exp > 0n) {
            if (exp % 2n === 1n) res = (res * base) % PRIME;
            base = (base * base) % PRIME;
            exp /= 2n;
        }
        return res;
    },
    inv: (n: bigint) => BN.pow(n, PRIME - 2n),
    random: (limit: bigint = PRIME): bigint => {
        const bits = limit.toString(2).length;
        const bytes = Math.ceil(bits / 8);
        const buf = new Uint8Array(bytes);
        let val = 0n;
        do {
            crypto.getRandomValues(buf);
            val = 0n;
            for (const b of buf) {
                val = (val << 8n) + BigInt(b);
            }
        } while (val >= limit || val === 0n);
        return val;
    }
};

export class SecretSharer {
    static async split(secretStr: string, shares: number, threshold: number): Promise<string[]> {
        const sessionKeyBytes = crypto.getRandomValues(new Uint8Array(32));
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await crypto.subtle.importKey("raw", sessionKeyBytes as any, "AES-GCM", false, ["encrypt"]);
        const encryptedSecret = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            new TextEncoder().encode(secretStr)
        );
        
        const payload = new Uint8Array(12 + encryptedSecret.byteLength);
        payload.set(iv, 0);
        payload.set(new Uint8Array(encryptedSecret), 12);
        const payloadHex = ChaosLock.buf2hex(payload);

        let secretInt = 0n;
        for (const b of sessionKeyBytes) {
            secretInt = (secretInt << 8n) + BigInt(b);
        }

        const coeffs: bigint[] = [secretInt];
        for (let i = 1; i < threshold; i++) {
            coeffs.push(BN.random());
        }

        const shards: string[] = [];
        const setId = ChaosLock.buf2hex(crypto.getRandomValues(new Uint8Array(4)));

        for (let x = 1; x <= shares; x++) {
            const xBig = BigInt(x);
            let y = 0n;
            for (let i = coeffs.length - 1; i >= 0; i--) {
                y = BN.add(BN.mul(y, xBig), coeffs[i]);
            }
            const yHex = y.toString(16);
            shards.push(`bst_p256_${setId}_${threshold}_${x}_${yHex}_${payloadHex}`);
        }
        return shards;
    }
    
    static async combine(shards: string[]): Promise<string> {
        if (shards.length === 0) throw new Error("No shards provided");
        
        interface Shard { id: string; k: number; x: bigint; y: bigint; payload: string }
        const parsed: Shard[] = [];

        for (const s of shards) {
            const parts = s.trim().split('_');
            if (parts[0] !== 'bst' || (parts[1] !== 'p256' && parts[1] !== 's1')) {
                throw new Error("Invalid or unsupported shard format.");
            }
            if (parts[1] === 's1') {
                throw new Error("Legacy GF(2^8) shards detected.");
            }
            parsed.push({
                id: parts[2],
                k: parseInt(parts[3]),
                x: BigInt(parts[4]),
                y: BigInt("0x" + parts[5]),
                payload: parts[6]
            });
        }

        const first = parsed[0];
        if (parsed.length < first.k) throw new Error(`Need ${first.k} shards to recover (got ${parsed.length})`);

        const kShares = parsed.slice(0, first.k);
        let secretInt = 0n;

        for (let j = 0; j < kShares.length; j++) {
            const xj = kShares[j].x;
            const yj = kShares[j].y;
            let num = 1n;
            let den = 1n;
            for (let m = 0; m < kShares.length; m++) {
                if (m == j) continue;
                const xm = kShares[m].x;
                num = BN.mul(num, BN.sub(0n, xm));
                den = BN.mul(den, BN.sub(xj, xm));
            }
            const term = BN.mul(yj, BN.mul(num, BN.inv(den)));
            secretInt = BN.add(secretInt, term);
        }

        let hexKey = secretInt.toString(16);
        if (hexKey.length % 2 !== 0) hexKey = '0' + hexKey;
        hexKey = hexKey.padStart(64, '0');
        
        const sessionKeyBytes = ChaosLock.hex2buf(hexKey);

        try {
            const payloadBytes = ChaosLock.hex2buf(first.payload);
            const iv = payloadBytes.slice(0, 12);
            const cipher = payloadBytes.slice(12);

            const key = await crypto.subtle.importKey("raw", sessionKeyBytes as any, "AES-GCM", false, ["decrypt"]);
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                cipher
            );
            
            sessionKeyBytes.fill(0);
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            sessionKeyBytes.fill(0);
            throw new Error("Decryption failed. The reconstructed key was incorrect.");
        }
    }
}

/* ===================== RESONANCE ENGINE ===================== */

export class ResonanceEngine {
  static async bind(data: Uint8Array, label: string, mime: string): Promise<{ artifact: Uint8Array; resonance: Resonance }> {
    const id = ChaosLock.getUUID();
    const keyHex = await ChaosLock.generateKey();
    const iv = cryptoAPI.getRandomValues(new Uint8Array(12));
    const hash = await ChaosLock.computeHash(data);

    const key = await cryptoAPI.subtle.importKey(
      "raw",
      ChaosLock.hex2buf(keyHex) as any,
      "AES-GCM",
      false,
      ["encrypt"]
    );

    const encrypted = await cryptoAPI.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      toArrayBuffer(data)
    );

    const header = ChaosLock.concat(
      MAGIC_BYTES,
      ChaosLock.enc(id.padEnd(36, " ")).slice(0, 36),
      iv
    );

    return {
      artifact: ChaosLock.concat(header, new Uint8Array(encrypted)),
      resonance: {
        id,
        label,
        size: data.byteLength,
        mime,
        key: keyHex,
        hash,
        timestamp: Date.now(),
      },
    };
  }

  static async resolve(artifact: Uint8Array, res: Resonance): Promise<Uint8Array> {
    const iv = artifact.slice(44, 56);
    const cipher = artifact.slice(56);

    const key = await cryptoAPI.subtle.importKey(
      "raw",
      ChaosLock.hex2buf(res.key) as any,
      "AES-GCM",
      false,
      ["decrypt"]
    );

    const decrypted = await cryptoAPI.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      toArrayBuffer(cipher)
    );

    return new Uint8Array(decrypted);
  }
}

/* ===================== CHAOS ENGINE ===================== */

export class ChaosEngine {
  private static async flux(entropy: string, salt: string, length: number): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const baseKey = await cryptoAPI.subtle.importKey(
      "raw",
      enc.encode(entropy) as any,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const bitsNeeded = length * 8 * 4; 

    const bits = await cryptoAPI.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: PBKDF2_V2_ITERATIONS,
        hash: PBKDF2_DIGEST,
      },
      baseKey,
      bitsNeeded 
    );

    return new Uint8Array(bits);
  }

  static generateEntropy(): string {
    return [...cryptoAPI.getRandomValues(new Uint8Array(32))]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  static async transmute(master: string, ctx: VaultConfig): Promise<string> {
    if (ctx.customPassword && ctx.customPassword.length > 0) {
        return ctx.customPassword;
    }

    const salt = `BASTION_GENERATOR_V2::${ctx.name.toLowerCase()}::${ctx.username.toLowerCase()}::v${ctx.version}`;
    const buf = await this.flux(master, salt, ctx.length);

    let pool = GLYPHS.ALPHA + GLYPHS.CAPS + GLYPHS.NUM;
    if (ctx.useSymbols) pool += GLYPHS.SYM;

    const limit = 256 - (256 % pool.length);
    
    let out = "";
    let bufIdx = 0;

    while (out.length < ctx.length) {
        if (bufIdx >= buf.length) {
            break; 
        }
        
        const byte = buf[bufIdx++];
        if (byte < limit) {
            out += pool[byte % pool.length];
        }
    }

    return out;
  }
}
