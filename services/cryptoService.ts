

import { VaultState, Resonance } from "../types";

const ITERATIONS = 100_000;
const DIGEST = "SHA-512";
const MAGIC_BYTES = new Uint8Array([0x42, 0x41, 0x53, 0x54, 0x49, 0x4f, 0x4e, 0x31]);

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
    // Header structure: MAGIC (8) | ID (36) | IV (12) | Ciphertext
    // ID starts at index 8 and has length 36
    const idBytes = blob.slice(8, 44);
    return this.dec(idBytes).trim();
  }

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
        salt: toArrayBuffer(salt),
        iterations: ITERATIONS,
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
    const key = await this.deriveKey(password, salt);

    const encrypted = await cryptoAPI.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      toArrayBuffer(data)
    );

    return this.concat(salt, iv, new Uint8Array(encrypted));
  }

  static async decryptBinary(blob: Uint8Array, password: string): Promise<Uint8Array> {
    if (blob.byteLength < 28) throw new Error("Invalid data");

    const salt = blob.slice(0, 16);
    const iv = blob.slice(16, 28);
    const cipher = blob.slice(28);

    const key = await this.deriveKey(password, salt);

    const decrypted = await cryptoAPI.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      toArrayBuffer(cipher)
    );

    return new Uint8Array(decrypted);
  }

  static async pack(state: VaultState, password: string): Promise<string> {
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

// GF(256) finite field arithmetic tables
const LOG = new Uint8Array(256);
const EXP = new Uint8Array(256);

// Precompute tables for GF(2^8) with polynomial x^8 + x^4 + x^3 + x + 1 (0x11B)
(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11B; // AES polynomial
  }
})();

export class SecretSharer {
  /**
   * Splits a secret string into N shards, requiring Threshold K to reconstruction.
   * Returns an array of secure shard strings.
   */
  static split(secretStr: string, shares: number, threshold: number): string[] {
    const secret = ChaosLock.enc(secretStr);
    const len = secret.length;
    
    // Generate random coefficients for polynomial f(x) for each byte
    // f(0) = secret byte
    // We need (threshold - 1) coefficients per byte
    const coeffs = new Uint8Array(len * (threshold - 1));
    crypto.getRandomValues(coeffs);

    const shards: string[] = [];
    const id = ChaosLock.buf2hex(crypto.getRandomValues(new Uint8Array(4))); // Random session ID to prevent mixing shards

    for (let x = 1; x <= shares; x++) {
      const shareData = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        // Evaluate polynomial f(x) at x for byte i
        // f(x) = s + a1*x + a2*x^2 + ...
        let y = secret[i]; // Term 0 (the secret)
        
        for (let j = 0; j < threshold - 1; j++) {
          const a = coeffs[i * (threshold - 1) + j];
          const term = this.mul(a, this.pow(x, j + 1));
          y = y ^ term; // Addition in GF(256) is XOR
        }
        shareData[i] = y;
      }
      // Format: bst_s1_<id>_<threshold>_<x>_<hexData>
      shards.push(`bst_s1_${id}_${threshold}_${x}_${ChaosLock.buf2hex(shareData)}`);
    }
    return shards;
  }

  /**
   * Reconstructs the secret from an array of shard strings.
   */
  static combine(shards: string[]): string {
    if (shards.length === 0) throw new Error("No shards provided");

    // Parse shards
    // bst_s1_<id>_<threshold>_<x>_<hexData>
    const parsed = shards.map(s => {
      const parts = s.trim().split('_');
      if (parts[0] !== 'bst' || parts[1] !== 's1') throw new Error("Invalid format");
      return {
        id: parts[2],
        threshold: parseInt(parts[3]),
        x: parseInt(parts[4]),
        data: ChaosLock.hex2buf(parts[5])
      };
    });

    // Validate consistency
    const first = parsed[0];
    if (parsed.length < first.threshold) throw new Error(`Need ${first.threshold} shards to unlock (Got ${parsed.length})`);
    const len = first.data.length;
    
    parsed.forEach(p => {
        if (p.id !== first.id) throw new Error("Shards belong to different secrets");
        if (p.data.length !== len) throw new Error("Shard corruption detected");
    });

    // Lagrange Interpolation at x=0
    const secret = new Uint8Array(len);
    
    // We only need 'threshold' shares to recover
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
          // basis *= (0 - xm) / (xj - xm)
          // In GF(256): 0 - xm = xm (since -a = a)
          // div(a, b) = mul(a, inv(b))
          const num = xm;
          const den = (xj ^ xm); // sub is xor
          if (den === 0) throw new Error("Duplicate shares detected");
          
          basis = this.mul(basis, this.div(num, den));
        }
        
        sum = sum ^ this.mul(yj, basis);
      }
      secret[i] = sum;
    }

    return ChaosLock.dec(secret);
  }

  // --- GF(256) Primitives ---
  private static mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    let idx = LOG[a] + LOG[b];
    if (idx >= 255) idx -= 255;
    return EXP[idx];
  }

  private static div(a: number, b: number): number {
    if (b === 0) throw new Error("Div by zero");
    if (a === 0) return 0;
    let idx = LOG[a] - LOG[b];
    if (idx < 0) idx += 255;
    return EXP[idx];
  }

  private static pow(a: number, b: number): number {
      if (b === 0) return 1;
      if (a === 0) return 0;
      let logA = LOG[a];
      let logRes = (logA * b) % 255;
      return EXP[logRes];
  }
}

/* ===================== RESONANCE ENGINE ===================== */

export class ResonanceEngine {
  static async bind(data: Uint8Array, label: string, mime: string) {
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
  private static async flux(entropy: string, salt: string): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const baseKey = await cryptoAPI.subtle.importKey(
      "raw",
      enc.encode(entropy),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const bits = await cryptoAPI.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: ITERATIONS,
        hash: DIGEST,
      },
      baseKey,
      512
    );

    return new Uint8Array(bits);
  }

  static generateEntropy(): string {
    return [...cryptoAPI.getRandomValues(new Uint8Array(32))]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  static async transmute(master: string, ctx: {
    name: string;
    username: string;
    version: number;
    length: number;
    useSymbols: boolean;
  }): Promise<string> {
    
    // Construct Salt: Includes Service, Username, Version.
    const salt = `FORTRESS_V1::${ctx.name.toLowerCase()}::${ctx.username.toLowerCase()}::v${ctx.version}`;
    const buf = await this.flux(master, salt);

    let pool = GLYPHS.ALPHA + GLYPHS.CAPS + GLYPHS.NUM;
    if (ctx.useSymbols) pool += GLYPHS.SYM;

    let out = "";
    for (let i = 0; i < ctx.length; i++) {
      out += pool[buf[i % buf.length] % pool.length];
    }

    return out;
  }
}