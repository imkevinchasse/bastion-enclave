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
