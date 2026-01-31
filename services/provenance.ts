
/**
 * BASTION PROVENANCE SYSTEM
 * 
 * This module allows the application to cryptographically verify its own origin.
 * It implements a "Silent Provenance" chain:
 * 1. A Public Key is embedded in the code (The Identity).
 * 2. A Build Manifest is embedded (The Claim).
 * 3. A Signature is embedded (The Proof).
 * 
 * If the Signature matches the Manifest using the Public Key, the build is "Official".
 * If not, it is a "Community Fork" or "Dev Build".
 * 
 * INVARIANT: Verification failure MUST NOT block application functionality.
 */

// --- 1. THE IDENTITY (Public Key) ---
// In a real release, this is the Bastion Release Key.
// For this source distribution, we use a Development Key.
const PROVENANCE_PUBLIC_KEY = {
    kty: "EC",
    crv: "P-256",
    x: "usW4X_Y1_1zI-a4a-7s1_1zI-a4a-7s1_1zI-a4a-7s", // Placeholder for valid P-256 coordinate
    y: "3c9X_Y1_1zI-a4a-7s1_1zI-a4a-7s1_1zI-a4a-7s", // Placeholder for valid P-256 coordinate
    ext: true,
};

// --- 2. THE CLAIM (Build Metadata) ---
export const BUILD_METADATA = {
    product: "Bastion Enclave",
    version: "3.0.0",
    protocol: "Sovereign-V3",
    epoch: 1710979200, // Release Timestamp
    channel: "Source Distribution"
};

// --- 3. THE PROOF (Signature) ---
// ECDSA P-256 Signature of JSON.stringify(BUILD_METADATA)
// This is a placeholder. In a real build pipeline, this is injected by the signer.
const BUILD_SIGNATURE_HEX = "0000000000000000000000000000000000000000000000000000000000000000";

// --- VERIFICATION LOGIC ---

export type ProvenanceStatus = 'OFFICIAL' | 'COMMUNITY' | 'DEV' | 'INVALID';

export interface ProvenanceReport {
    status: ProvenanceStatus;
    verified: boolean;
    issuer: string;
    timestamp: number;
}

export class ProvenanceService {
    
    private static async getPublicKey(): Promise<CryptoKey | null> {
        try {
            // We construct a valid JWK for import
            // Note: Since we are using placeholders above, this import might fail in strict mode
            // without valid coordinates. We handle this gracefully.
            return await window.crypto.subtle.importKey(
                "jwk",
                PROVENANCE_PUBLIC_KEY as JsonWebKey,
                { name: "ECDSA", namedCurve: "P-256" },
                false,
                ["verify"]
            );
        } catch (e) {
            console.warn("Provenance: Invalid Public Key format.");
            return null;
        }
    }

    private static hexToBuf(hex: string): Uint8Array {
        if (hex.length % 2 !== 0) return new Uint8Array();
        const buf = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            buf[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return buf;
    }

    static async verify(): Promise<ProvenanceReport> {
        try {
            // 1. Prepare Data
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(BUILD_METADATA));
            const signature = this.hexToBuf(BUILD_SIGNATURE_HEX);
            
            // 2. Import Key
            const key = await this.getPublicKey();
            
            if (!key) {
                return {
                    status: 'DEV',
                    verified: false,
                    issuer: 'Self-Signed (Dev)',
                    timestamp: BUILD_METADATA.epoch
                };
            }

            // 3. Verify
            const isValid = await window.crypto.subtle.verify(
                { name: "ECDSA", hash: { name: "SHA-256" } },
                key,
                signature,
                data
            );

            return {
                status: isValid ? 'OFFICIAL' : 'COMMUNITY',
                verified: isValid,
                issuer: isValid ? 'Bastion Enclave Authority' : 'Unknown / Fork',
                timestamp: BUILD_METADATA.epoch
            };

        } catch (e) {
            return {
                status: 'INVALID',
                verified: false,
                issuer: 'Error',
                timestamp: Date.now()
            };
        }
    }
}
