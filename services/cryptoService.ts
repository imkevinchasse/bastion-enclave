import { VaultState, Resonance } from "../types";

/**
 * CHAOS ENGINE
 * Deterministic Password Artifact Generator & Secure Storage
 */

const ITERATIONS = 100000;
const DIGEST = 'SHA-512';
const MAGIC_BYTES = new Uint8Array([0x42, 0x41, 0x53, 0x54, 0x49, 0x4F, 0x4E, 0x31]); // "BASTION1"

// Standard charset definitions for bitwise mapping
const GLYPHS = {
  ALPHA: 'abcdefghijklmnopqrstuvwxyz',
  CAPS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  NUM: '0123456789',
  SYM: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * ChaosLock: Handles the encryption (Packing) and decryption (Unpacking)
 * of the entire Vault State into a single string.
 */
export class ChaosLock {
  
  /**
   * Safe UUID Generator that works in environments where crypto.randomUUID
   * might not be strictly typed or available in the target ES version.
   */
  public static getUUID(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // @ts-ignore - TS might complain depending on lib target
      return crypto.randomUUID();
    }
    // Fallback v4 UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public static _enc(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  public static _dec(buff: ArrayBuffer): string {
    return new TextDecoder().decode(buff);
  }

  // Concatenate buffers
  public static _concat(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
    const result = new Uint8Array(totalLength);
    let length = 0;
    for (const array of arrays) {
      result.set(array, length);
      length += array.length;
    }
    return result;
  }

  // Utility: Buffer to Hex
  public static buf2hex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  }

  // Utility: Hex to Buffer
  public static hex2buf(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  public static async computeHash(data: Uint8Array): Promise<string> {
      // TS Fix: Cast to any to avoid SharedArrayBuffer mismatch
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data as any);
      return this.buf2hex(hashBuffer);
  }

  public static async generateKey(): Promise<string> {
      const key = await window.crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"]
      );
      const exported = await window.crypto.subtle.exportKey("raw", key);
      return this.buf2hex(exported);
  }

  // Base64 encoding for the final blob
  private static _toBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static _fromBase64(str: string): Uint8Array {
    const binaryString = atob(str);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Derive a CryptoKey from a user password
  private static async _deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      this._enc(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as any, // TS Fix: Cast salt to any
        iterations: ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * PACK: Encrypts the VaultState into a single Base64 string.
   * Format: Salt(16b) + IV(12b) + Ciphertext
   */
  public static async pack(state: VaultState, password: string): Promise<string> {
    const jsonStr = JSON.stringify(state);
    const binary = await this.encryptBinary(this._enc(jsonStr), password);
    return this._toBase64(binary);
  }

  /**
   * UNPACK: Decrypts the blob string using the password.
   */
  public static async unpack(blob: string, password: string): Promise<VaultState> {
    try {
        const encryptedBytes = this._fromBase64(blob);
        const decryptedBytes = await this.decryptBinary(encryptedBytes, password);
        const jsonStr = this._dec(decryptedBytes);
        return JSON.parse(jsonStr) as VaultState;
    } catch (e) {
        throw new Error("Decryption failed. Invalid Password or Corrupt Vault String.");
    }
  }

  /**
   * ENCRYPT BINARY (Password Derived): Direct binary encryption for Vault Blob.
   * Format: Salt(16) + IV(12) + Ciphertext(n)
   */
  public static async encryptBinary(data: Uint8Array, password: string): Promise<Uint8Array> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this._deriveKey(password, salt);
    
    // TS Fix: Cast inputs to any to avoid strict BufferSource checks
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as any },
      key,
      data as any
    );

    return this._concat(salt, iv, new Uint8Array(encrypted));
  }

  /**
   * DECRYPT BINARY (Password Derived)
   */
  public static async decryptBinary(data: Uint8Array, password: string): Promise<Uint8Array> {
    try {
      if (data.byteLength < 28) throw new Error("Invalid file format");

      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const cipher = data.slice(28);

      const key = await this._deriveKey(password, salt);

      // TS Fix: Cast inputs to any
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as any },
        key,
        cipher as any
      );
      
      return new Uint8Array(decrypted);
    } catch (e) {
      throw new Error("Decryption failed. Invalid Password or Corrupted File.");
    }
  }

  public static getFileIdFromBlob(data: Uint8Array): string {
      if (data.byteLength < 44) throw new Error("Invalid header");
      const idBytes = data.slice(8, 44);
      return this._dec(idBytes).trim();
  }
}

/**
 * RESONANCE ENGINE
 * Handles the cryptographic binding of external files.
 * Ensures strict decoupling of Entropy from Content.
 */
export class ResonanceEngine {
  
  /**
   * BIND: Creates a Resonance Artifact.
   * 1. Generates a completely RANDOM 256-bit key (Entropy Source).
   * 2. Encrypts the payload with that key.
   * 3. Returns the artifact bytes and the resonance metadata.
   */
  public static async bind(data: Uint8Array, label: string, mime: string): Promise<{
    artifact: Uint8Array;
    resonance: Resonance;
  }> {
      const newId = ChaosLock.getUUID();
      const newKeyHex = await ChaosLock.generateKey(); // RANDOM ENTROPY
      const iv = window.crypto.getRandomValues(new Uint8Array(12)); // RANDOM IV
      const integrityHash = await ChaosLock.computeHash(data);

      const keyBuffer = ChaosLock.hex2buf(newKeyHex);
      const cryptoKey = await window.crypto.subtle.importKey(
          "raw", keyBuffer, { name: "AES-GCM" }, false, ["encrypt"]
      );

      // TS Fix: Cast inputs to any
      const encrypted = await window.crypto.subtle.encrypt(
          { name: "AES-GCM", iv: iv as any },
          cryptoKey,
          data as any
      );

      // Pad ID to 36 bytes for fixed header
      const idBytes = ChaosLock._enc(newId.padEnd(36, ' ')).slice(0, 36);
      
      // Header: MAGIC(8) + ID(36) + IV(12)
      const artifact = ChaosLock._concat(MAGIC_BYTES, idBytes, iv, new Uint8Array(encrypted));

      const resonance: Resonance = {
          id: newId,
          label: label,
          size: data.byteLength,
          mime: mime,
          key: newKeyHex,
          hash: integrityHash,
          timestamp: Date.now()
      };

      return { artifact, resonance };
  }

  /**
   * RESOLVE: Unlocks a Resonance Artifact using the Key from the Vault.
   */
  public static async resolve(artifact: Uint8Array, resonance: Resonance): Promise<Uint8Array> {
      // Header Check
      if (artifact.byteLength < 56) throw new Error("Artifact corrupted: Header too short");
      
      // Magic Bytes Check
      for (let i = 0; i < 8; i++) {
          if (artifact[i] !== MAGIC_BYTES[i]) throw new Error("Artifact mismatch: Invalid magic bytes");
      }

      // Extract parts
      // ID is at 8..44, but we rely on the passed Resonance object for the Key
      const iv = artifact.slice(44, 56);
      const cipher = artifact.slice(56);

      const keyBuffer = ChaosLock.hex2buf(resonance.key);
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw", keyBuffer, { name: "AES-GCM" }, false, ["decrypt"]
      );

      // TS Fix: Cast inputs to any
      const decrypted = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv as any },
          cryptoKey,
          cipher as any
      );

      return new Uint8Array(decrypted);
  }
}

/**
 * The ChaosEngine handles the mathematical transformation of seed data.
 */
export class ChaosEngine {
  private static async _flux(entropy: string, salt: string): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const k = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(entropy),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const bits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt) as any, // TS Fix: Cast to any
        iterations: ITERATIONS,
        hash: DIGEST
      },
      k,
      512 
    );

    return new Uint8Array(bits);
  }

  // Generate 32 bytes of random entropy for a NEW vault
  public static generateEntropy(): string {
    const entropy = new Uint8Array(32); 
    window.crypto.getRandomValues(entropy);
    return Array.from(entropy)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Deterministically generates a password.
   */
  public static async transmute(
    masterEntropy: string,
    context: {
      name: string;
      username: string;
      version: number;
      length: number;
      useSymbols: boolean;
    }
  ): Promise<string> {
    const contextSalt = `FORTRESS_V1::${context.name.toLowerCase()}::${context.username.toLowerCase()}::v${context.version}`;
    const buffer = await this._flux(masterEntropy, contextSalt);

    let pool = GLYPHS.ALPHA + GLYPHS.CAPS + GLYPHS.NUM;
    if (context.useSymbols) pool += GLYPHS.SYM;

    let artifact = '';
    const forcedChars = [
      GLYPHS.ALPHA[buffer[0] % GLYPHS.ALPHA.length],
      GLYPHS.CAPS[buffer[1] % GLYPHS.CAPS.length],
      GLYPHS.NUM[buffer[2] % GLYPHS.NUM.length],
      context.useSymbols ? GLYPHS.SYM[buffer[3] % GLYPHS.SYM.length] : GLYPHS.ALPHA[buffer[3] % GLYPHS.ALPHA.length]
    ];

    for (let i = 0; i < context.length; i++) {
      if (i < 4) {
        artifact += forcedChars[i];
      } else {
        const byte = buffer[i % buffer.length] ^ buffer[(i + 13) % buffer.length];
        artifact += pool[byte % pool.length];
      }
    }

    return this._scramble(artifact, buffer[63]);
  }

  private static _scramble(str: string, seedByte: number): string {
    const arr = str.split('');
    let n = arr.length;
    for(let i = n - 1; i > 0; i--) {
       seedByte = (seedByte * 1664525 + 1013904223) % 4294967296;
       const j = Math.abs(seedByte) % (i + 1);
       [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }
}