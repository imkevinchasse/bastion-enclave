
/**
 * BASTION ENCLAVE :: IMMUTABLE SYSTEM INVARIANTS
 * 
 * This file acts as the "Regression Sentinel" for the project's philosophy.
 * These constants define the boundaries of "The One". 
 * 
 * WARNING: Changing any value in this file from `false` to `true` (or vice-versa) 
 * constitutes a fundamental breach of the Bastion Protocol.
 */

// --- 1. SOVEREIGNTY AXIOMS ---

/**
 * INVARIANT: The application must be capable of full functionality without network access.
 * Violation: Adding a feature that blocks the UI if offline.
 */
export const IS_OFFLINE_ONLY = true;

/**
 * INVARIANT: No user data shall ever be transmitted to a central server for storage or synchronization.
 * Violation: Adding Firebase, AWS Amplify, or custom sync endpoints.
 */
export const CLOUD_SYNC_ALLOWED = false;

/**
 * INVARIANT: No analytics engine shall track user behavior without explicit, granular, opt-in consent.
 * (Currently, we strictly disable all analytics).
 */
export const SILENT_TELEMETRY_ALLOWED = false;

// --- 2. CRYPTOGRAPHIC AXIOMS ---

/**
 * INVARIANT: Security must not rely on the source code being hidden.
 * Violation: Using proprietary obfuscated KDFs or "Magic Numbers" that are not standard constants.
 */
export const RELIES_ON_OBFUSCATION = false;

/**
 * INVARIANT: The Vault Format must be canonical and versioned.
 * Violation: Changing the schema without incrementing the protocol version byte.
 */
export const PROTOCOL_VERSION_ENFORCED = true;

/**
 * The current canonical protocol version.
 * v3.0.0 = Argon2id + AES-GCM + Prime Field Sharing
 */
export const CURRENT_PROTOCOL_VERSION = 3;

// --- 3. UX ENFORCEMENT ---

/**
 * INVARIANT: The system must refuse to generate a new seed if the vault state hasn't changed.
 * This enforces cryptographic discipline over user convenience.
 */
export const REQUIRE_MUTATION_FOR_NEW_SEED = true;

/**
 * INVARIANT: Passwords/Secrets must be wiped from memory immediately after use.
 * Violation: Storing the decrypted master password in Redux/Context state for the entire session.
 */
export const EPHEMERAL_MEMORY_ONLY = true;

// --- 4. IDENTITY ---

export const PROJECT_CODENAME = "THE_ONE";
export const SECURITY_MODE = "PARANOID"; 
