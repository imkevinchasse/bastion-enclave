
import { VaultState } from "../types";

/**
 * BASTION BEHAVIORAL GUARDRAILS
 * 
 * This module enforces the "Behavioral Fingerprints" of the application.
 * It ensures that the state evolves according to strict physical laws (Time, Causality, Identity).
 * 
 * Clones often miss these invariants, leading to "uncanny valley" bugs.
 */
export class Guardrail {

    /**
     * Enforces strict schema correctness for a loaded vault.
     * Prevents "loose" JSON objects from being treated as valid VaultStates.
     */
    static validateSchema(state: any): void {
        if (!state) throw new Error("Guardrail: State is null");
        
        // 1. Identity Fingerprint
        if (!state.entropy || typeof state.entropy !== 'string') {
            throw new Error("Guardrail: Missing Entropy (Identity Lost)");
        }
        if (state.entropy.length !== 64) {
            throw new Error("Guardrail: Entropy Malformed (Must be 32-byte Hex)");
        }

        // 2. Structural Integrity
        if (!Array.isArray(state.configs)) throw new Error("Guardrail: Configs Corrupted");
        if (!Array.isArray(state.notes)) throw new Error("Guardrail: Notes Corrupted");
        if (!Array.isArray(state.contacts)) throw new Error("Guardrail: Contacts Corrupted");
        if (!Array.isArray(state.locker)) throw new Error("Guardrail: Locker Corrupted");

        // 3. Protocol Versioning
        if (typeof state.version !== 'number' || state.version < 0) {
            throw new Error("Guardrail: Invalid Protocol Version");
        }
    }

    /**
     * Enforces valid transitions between two states during a session.
     * This prevents "Time Travel" bugs and "Identity Swaps".
     */
    static validateTransition(prev: VaultState, next: VaultState): void {
        // 1. Identity Invariant: The soul of the vault cannot change.
        if (prev.entropy !== next.entropy) {
            throw new Error("CRITICAL: Identity Mutation Detected. Entropy cannot be changed at runtime.");
        }

        // 2. Causal Invariant: Version must strictly increment.
        // We allow +1 for normal saves.
        // We do NOT allow gaps or regression during a live session.
        if (next.version !== prev.version + 1) {
             throw new Error(`CRITICAL: Causal Break. Version gap detected (v${prev.version} -> v${next.version}).`);
        }

        // 3. Temporal Invariant: Time must move forward.
        if (next.lastModified <= prev.lastModified) {
             // We allow == if it happened in the same millisecond (rare but possible in batched updates),
             // strictly < is forbidden.
             if (next.lastModified < prev.lastModified) {
                 throw new Error("CRITICAL: Temporal Regression. New state is older than previous state.");
             }
        }
    }
}
