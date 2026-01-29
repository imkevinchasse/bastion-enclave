
import { VaultState, Resonance, VaultConfig } from "../types";

const CURRENT_ITERATIONS = 210_000;
const LEGACY_ITERATIONS = 100_000; // Fallback for older vaults
const DIGEST = "SHA-512";
const MAGIC_BYTES = new Uint8Array([0x42, 0x41, 0x53, 0x54, 0x49, 0x4f, 0x4e, 0x31]); // "BASTION1"

// Protocol Headers for Storage Migration
const PROTOCOL_HEADER = new Uint8Array([0x42, 0x53, 0x54, 0x4E, 0x02]); // "BSTN" + Version 2 (Current)

const GLYPHS = {
  ALPHA: "abcdefghijklmnopqrstuvwxyz",
  CAPS: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  NUM: "0123456789",
  SYM: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

const cryptoAPI = globalThis.crypto;

/* ===================== HELPERS ===================== */

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
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
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  static async computeHash(data: Uint8Array): Promise<string> {
    const hash = await cryptoAPI.subtle.digest("SHA-256", toArrayBuffer(data));
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
   * Derives a key using the specific algorithm parameters.
   * Allows supporting multiple "eras" of the software.
   */
  private static async deriveKey(password: string, salt: Uint8Array, useDomainSeparation: boolean = true, iterations: number = CURRENT_ITERATIONS): Promise<CryptoKey> {
    let finalSalt = salt;
    
    if (useDomainSeparation) {
        const domainPrefix = this.enc("BASTION_VAULT_V1::");
        finalSalt = this.concat(domainPrefix, salt);
    }

    const material = await cryptoAPI.subtle.importKey(
      "raw",
      this.enc(password),
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
    
    // Always encrypt using the Latest Standard (Domain Separation + High Iterations)
    const key = await this.deriveKey(password, salt, true, CURRENT_ITERATIONS);

    const encrypted = await cryptoAPI.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      toArrayBuffer(data)
    );

    // V2 Format: [HEADER: 5] + [SALT: 16] + [IV: 12] + [CIPHER]
    return this.concat(PROTOCOL_HEADER, salt, iv, new Uint8Array(encrypted));
  }

  static async decryptBinary(blob: Uint8Array, password: string): Promise<Uint8Array> {
    // 1. Check for Protocol Header (V2)
    // Header is 5 bytes: 'B', 'S', 'T', 'N', 0x02
    let offset = 0;
    let isV2 = false;

    if (blob.length > 5 && 
        blob[0] === 0x42 && blob[1] === 0x53 && blob[2] === 0x54 && blob[3] === 0x4E && blob[4] === 0x02) {
        isV2 = true;
        offset = 5;
    }

    // Extraction
    const salt = blob.slice(offset, offset + 16);
    const iv = blob.slice(offset + 16, offset + 28);
    const cipher = blob.slice(offset + 28);

    // MIGRATION STRATEGY: Try algorithms in order of likelihood
    
    // Attempt 1: If V2 header, use V2 params. If no header, assume Legacy V1 (Domain separated, 210k)
    // NOTE: Previous versions used 210k + Domain Separation as default, but lacked header.
    try {
        const key = await this.deriveKey(password, salt, true, CURRENT_ITERATIONS);
        const decrypted = await cryptoAPI.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            toArrayBuffer(cipher)
        );
        return new Uint8Array(decrypted);
    } catch (e) {
        // Fallthrough
    }

    // Attempt 2: Legacy (No Domain Separation, High Iterations) - Possible intermediate version
    try {
        const key = await this.deriveKey(password, salt, false, CURRENT_ITERATIONS);
        const decrypted = await cryptoAPI.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            toArrayBuffer(cipher)
        );
        console.log("Migrating from Legacy Format (No Domain Sep)");
        return new Uint8Array(decrypted);
    } catch (e) {
        // Fallthrough
    }

    // Attempt 3: Ancient Legacy (No Domain Separation, Low Iterations)
    try {
        const key = await this.deriveKey(password, salt, false, LEGACY_ITERATIONS);
        const decrypted = await cryptoAPI.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            toArrayBuffer(cipher)
        );
        console.log("Migrating from Ancient Format (100k Iterations)");
        return new Uint8Array(decrypted);
    } catch (e) {
        // Fallthrough
    }

    throw new Error("Decryption failed. Invalid password or incompatible vault version.");
  }

  static async pack(state: VaultState, password: string): Promise<string> {
    // Pack always produces the latest format
    const encrypted = await this.encryptBinary(this.enc(JSON.stringify(state)), password);
    return btoa(String.fromCharCode(...encrypted));
  }

  static async unpack(blob: string, password: string): Promise<VaultState> {
    const bytes = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
    const decrypted = await this.decryptBinary(bytes, password);
    return JSON.parse(this.dec(decrypted));
  }
}

/* ===================== SECRET SHARER (SSS) ===================== */
const LOG = new Uint8Array(256);
const EXP = new Uint8Array(256);
(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11B; 
  }
})();
export class SecretSharer {
    static split(secretStr: string, shares: number, threshold: number): string[] {
        const secret = ChaosLock.enc(secretStr);
        const len = secret.length;
        const coeffs = new Uint8Array(len * (threshold - 1));
        crypto.getRandomValues(coeffs);
        const shards: string[] = [];
        const id = ChaosLock.buf2hex(crypto.getRandomValues(new Uint8Array(4)));
        for (let x = 1; x <= shares; x++) {
          const shareData = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            let y = secret[i];
            for (let j = 0; j < threshold - 1; j++) {
              const a = coeffs[i * (threshold - 1) + j];
              const term = SecretSharer['mul'](a, SecretSharer['pow'](x, j + 1));
              y = y ^ term;
            }
            shareData[i] = y;
          }
          shards.push(`bst_s1_${id}_${threshold}_${x}_${ChaosLock.buf2hex(shareData)}`);
        }
        return shards;
    }
    static combine(shards: string[]): string {
        if (shards.length === 0) throw new Error("No shards provided");
        const parsed = shards.map(s => {
          const parts = s.trim().split('_');
          if (parts[0] !== 'bst' || parts[1] !== 's1') throw new Error("Invalid format");
          return { id: parts[2], threshold: parseInt(parts[3]), x: parseInt(parts[4]), data: ChaosLock.hex2buf(parts[5]) };
        });
        const first = parsed[0];
        if (parsed.length < first.threshold) throw new Error(`Need ${first.threshold} shards`);
        const len = first.data.length;
        const secret = new Uint8Array(len);
        const kShares = parsed.slice(0, first.threshold);
        for (let i = 0; i < len; i++) {
          let sum = 0;
          for (let j = 0; j < kShares.length; j++) {
            const xj = kShares[j].x;
            const yj = kShares[j].data[i];
            let basis = 1;
            for (let m = 0; m < kShares.length; m++) {
              if (m === j) continue;
              const xm = kShares[m].x;
              const num = xm;
              const den = (xj ^ xm);
              if (den === 0) throw new Error("Duplicate shares");
              basis = SecretSharer['mul'](basis, SecretSharer['div'](num, den));
            }
            sum = sum ^ SecretSharer['mul'](yj, basis);
          }
          secret[i] = sum;
        }
        return ChaosLock.dec(secret);
    }
}
// @ts-ignore
SecretSharer['mul'] = function(a: number, b: number) { if (a===0||b===0) return 0; let i = LOG[a]+LOG[b]; return EXP[i >= 255 ? i-255 : i]; }
// @ts-ignore
SecretSharer['div'] = function(a: number, b: number) { if (b===0) throw new Error("Div0"); if(a===0) return 0; let i = LOG[a]-LOG[b]; return EXP[i < 0 ? i+255 : i]; }
// @ts-ignore
SecretSharer['pow'] = function(a: number, b: number) { if(b===0)return 1; if(a===0)return 0; return EXP[(LOG[a]*b)%255]; }


/* ===================== RESONANCE ENGINE ===================== */

export class ResonanceEngine {
  static async bind(data: Uint8Array, label: string, mime: string): Promise<{ artifact: Uint8Array; resonance: Resonance }> {
    const id = ChaosLock.getUUID();
    const keyHex = await ChaosLock.generateKey();
    const iv = cryptoAPI.getRandomValues(new Uint8Array(12));
    const hash = await ChaosLock.computeHash(data);

    const key = await cryptoAPI.subtle.importKey(
      "raw",
      ChaosLock.hex2buf(keyHex),
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
      ChaosLock.hex2buf(res.key),
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
      enc.encode(entropy),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    // Fetch more bits than needed to allow for Rejection Sampling
    // 4 bytes per char should be sufficient overhead for rejecting biased values
    const bitsNeeded = length * 8 * 4; 

    const bits = await cryptoAPI.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: CURRENT_ITERATIONS, // Always use current for generator
        hash: DIGEST,
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
    // If a custom password is set, use it directly (bypass generator)
    if (ctx.customPassword && ctx.customPassword.length > 0) {
        return ctx.customPassword;
    }

    // DOMAIN SEPARATION: Updated salt format to avoid collision with any other system
    const salt = `BASTION_GENERATOR_V2::${ctx.name.toLowerCase()}::${ctx.username.toLowerCase()}::v${ctx.version}`;
    
    // Generate flux buffer
    const buf = await this.flux(master, salt, ctx.length);

    let pool = GLYPHS.ALPHA + GLYPHS.CAPS + GLYPHS.NUM;
    if (ctx.useSymbols) pool += GLYPHS.SYM;

    // UNBIASED REJECTION SAMPLING
    const limit = 256 - (256 % pool.length);
    
    let out = "";
    let bufIdx = 0;

    while (out.length < ctx.length) {
        if (bufIdx >= buf.length) {
            break; 
        }
        
        const byte = buf[bufIdx++];
        
        // REJECT if byte is in the biased zone
        if (byte < limit) {
            out += pool[byte % pool.length];
        }
    }

    return out;
  }
}
