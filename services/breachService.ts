
/**
 * BASTION BREACH SERVICE
 * 
 * Handles interaction with HaveIBeenPwned API using k-Anonymity.
 * Enforces rate limiting and congestion control.
 */

// SHA-1 Helper (Client-Side)
const sha1 = async (str: string): Promise<string> => {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-1', enc.encode(str));
    return Array.from(new Uint8Array(hash))
        .map(v => v.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
};

export class BreachService {
    /**
     * Checks a single password against HIBP Range API.
     * @param password The plaintext password (hashed internally, never sent)
     * @param signal AbortSignal for cancellation
     * @returns number of times pwned (0 if safe), or throws Error
     */
    static async checkPassword(password: string, signal?: AbortSignal): Promise<number> {
        const hash = await sha1(password);
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);

        try {
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                headers: { 'Add-Padding': 'true' },
                signal
            });

            if (response.status === 429) {
                throw new Error("CONGESTION");
            }

            if (!response.ok) {
                throw new Error(`API_ERROR_${response.status}`);
            }

            const text = await response.text();
            const lines = text.split('\n');
            const match = lines.find(line => line.startsWith(suffix));

            if (match) {
                return parseInt(match.split(':')[1], 10);
            }
            return 0;

        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
            if (e.message === "CONGESTION") throw e;
            console.warn("Breach scan network error:", e);
            throw new Error("NETWORK_ERROR");
        }
    }
}
