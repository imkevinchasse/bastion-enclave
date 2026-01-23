export interface VaultConfig {
  id: string;
  name: string; // Service Name
  username: string; // Public Identifier
  version: number; // To rotate passwords, increment version
  length: number;
  useSymbols: boolean;
  category: 'login' | 'card' | 'note';
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  updatedAt: number;
}

/**
 * RESONANCE (formerly LockerEntry)
 * A cryptographic binding between the Vault (Key) and an External Blob (Ciphertext).
 * 
 * SECURITY INVARIANTS:
 * 1. DECOUPLED ENTROPY: The `key` is purely random (32 bytes). It is NOT derived from the password or filename.
 * 2. DEAD-MAN DEPENDENCY: Loss of this `Resonance` object = Irreversible loss of the file.
 * 3. INTEGRITY: The `hash` ensures the decrypted payload matches the original exact state.
 */
export interface Resonance {
  id: string; // UUID linking to the physical file header
  label: string; // Human readable label (Metadata only, not used for seed)
  size: number;
  mime: string;
  key: string; // Hex-encoded 256-bit AES key (THE RESONANCE)
  hash: string; // SHA-256 integrity check of original file
  timestamp: number;
}

// Legacy alias for compatibility during migration
export type LockerEntry = Resonance;

// The complete state of the user's vault
export interface VaultState {
  entropy: string; // 32 bytes hex - The internal random seed for this vault
  configs: VaultConfig[];
  notes: Note[];
  contacts: Contact[];
  locker: Resonance[];
  
  // Security & Integrity Meta
  version: number; // Monotonic counter to detect rollback
  lastModified: number; // Timestamp of last write
}

export enum SecurityLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface AuditResult {
  score: number;
  level: SecurityLevel;
  suggestions: string[];
  analysis: string;
}

export enum AppTab {
  VAULT = 'VAULT',
  NOTES = 'NOTES',
  CONTACTS = 'CONTACTS',
  LOCKER = 'LOCKER',
  GENERATOR = 'GENERATOR',
  AUDITOR = 'AUDITOR',
  EXTENSIONS = 'EXTENSIONS',
  NEWS = 'NEWS',
}

export interface LLMStatus {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress: number;
  message: string;
}