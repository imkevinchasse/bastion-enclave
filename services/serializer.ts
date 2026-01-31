
import { VaultState } from "../types";

/**
 * BASTION CANONICAL SERIALIZER (Protocol V3.5)
 * 
 * Enforces "Deterministic-but-Unique" output signatures.
 * 1. Fields are serialized in a strict, non-alphabetical order.
 * 2. Payloads are framed with explicit byte-length prefixes.
 * 3. Total size is aligned to 64-byte blocks via deterministic padding.
 */
export class BastionSerializer {

    // --- 1. FIELD ORDERING DEFINITIONS ---
    
    private static ORDER_ROOT = [
        "version",      // 1. Protocol Version
        "entropy",      // 2. Master Seed
        "flags",        // 3. Feature Flags
        "lastModified", // 4. Timestamp
        "locker",       // 5. Heavy Data
        "contacts",     // 6. Network
        "notes",        // 7. Knowledge
        "configs"       // 8. Credentials
    ];

    private static ORDER_CONFIG = [
        "id", "name", "username", "category", "version", 
        "length", "useSymbols", "customPassword", "breachStats", "compromised",
        "createdAt", "updatedAt", "usageCount", "sortOrder"
    ];

    private static ORDER_NOTE = [
        "id", "updatedAt", "title", "content"
    ];

    private static ORDER_CONTACT = [
        "id", "updatedAt", "name", "email", "phone", "address", "notes"
    ];

    private static ORDER_RESONANCE = [
        "id", "timestamp", "label", "size", "mime", "key", "hash", "embedded"
    ];

    /**
     * Recursively re-orders the VaultState to match the Canonical Signature.
     */
    static serialize(state: VaultState): string {
        const ordered: any = this.reorder(state, this.ORDER_ROOT);

        if (state.configs) ordered.configs = state.configs.map((c: any) => this.reorder(c, this.ORDER_CONFIG));
        if (state.notes) ordered.notes = state.notes.map((n: any) => this.reorder(n, this.ORDER_NOTE));
        if (state.contacts) ordered.contacts = state.contacts.map((c: any) => this.reorder(c, this.ORDER_CONTACT));
        if (state.locker) ordered.locker = state.locker.map((l: any) => this.reorder(l, this.ORDER_RESONANCE));

        return JSON.stringify(ordered);
    }

    private static reorder(obj: any, order: string[]): any {
        if (!obj) return obj;
        const out: any = {};
        
        // 1. Known keys in Strict Order
        for (const key of order) {
            if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
                out[key] = obj[key];
            }
        }
        
        // 2. Unknown keys (Forward Compatibility) - Sorted Alphabetically
        const remaining = Object.keys(obj).filter(k => !order.includes(k)).sort();
        for (const key of remaining) {
             if (obj[key] !== undefined) {
                out[key] = obj[key];
            }
        }
        return out;
    }

    /**
     * Wraps the JSON string in a binary frame with Deterministic Padding.
     * Format: [LENGTH (4B LE)] + [JSON] + [PADDING (0x00...)]
     * Total size aligned to 64 bytes.
     */
    static frame(json: string): Uint8Array {
        const encoder = new TextEncoder();
        const jsonBytes = encoder.encode(json);
        const len = jsonBytes.length;
        
        // Calculate Padding
        // Header (4) + Payload (len) + Padding (p) = Multiple of 64
        const totalRaw = 4 + len;
        const remainder = totalRaw % 64;
        const paddingNeeded = remainder === 0 ? 0 : 64 - remainder;
        
        const buffer = new Uint8Array(totalRaw + paddingNeeded);
        const view = new DataView(buffer.buffer);
        
        // 1. Write Length Header (Little Endian)
        view.setUint32(0, len, true); 
        
        // 2. Write Payload
        buffer.set(jsonBytes, 4);
        
        // 3. Write Padding (Already 0x00 initialized by new Uint8Array)
        if (paddingNeeded > 0) {
            buffer.fill(0, totalRaw, totalRaw + paddingNeeded);
        }
        
        return buffer;
    }

    /**
     * Unwraps a binary frame.
     * STRICT: Reads 4 bytes length, slices exactly that amount.
     * TOLERANT: Ignores trailing bytes (padding).
     */
    static deframe(data: Uint8Array): string {
        if (data.length < 4) {
            // Fallback for malformed V4 blobs (should not happen)
            return new TextDecoder().decode(data);
        }
        
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const claimedLen = view.getUint32(0, true);
        
        // VALIDATION: Claimed length must fit inside the buffer
        if (claimedLen <= data.length - 4) {
            // Valid Bastion Frame (Slice exact payload, ignore padding)
            return new TextDecoder().decode(data.slice(4, 4 + claimedLen));
        } else {
            // Fallback for Legacy V1/V2 (Raw JSON) if header logic failed
            return new TextDecoder().decode(data);
        }
    }
}
