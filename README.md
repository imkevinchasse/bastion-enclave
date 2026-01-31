
# Bastion Enclave :: Cryptographic Specification

**Version:** 3.0.0  
**Protocol:** Sovereign-V3  
**Architecture:** Offline-First, Zero-Knowledge, Stateless  
**Philosophy:** [The Manifesto](SECURITY_MANIFESTO.md)

---

> **"We choose constraint over scale, conviction over convenience, and permanence over growth."**

Bastion Enclave is an opinionated, offline-first password vault. It rejects the industry standard of "Cloud Sync" in favor of absolute client-side sovereignty. We do not ask for your trust; we prove our security through transparent architecture and immutable invariants.

---

## 1. The Chaos Engine™ (Deterministic Generation)

The Chaos Engine removes the need to store passwords by computing them mathematically on-the-fly. This process is stateless and deterministic: the same inputs will always yield the same output across all platforms (Web, Android, Java, Python).

### 1.1. Input Parameters
*   **$E$ (Entropy):** 32-byte (256-bit) cryptographically secure random master seed.
*   **$S$ (Service):** The name of the service (e.g., "GitHub").
*   **$U$ (Username):** The username/identity (e.g., "user@example.com").
*   **$V$ (Version):** Integer counter (starts at 1) for rotation.
*   **$L$ (Length):** Target length of the generated password.

### 1.2. Salt Construction (Domain Separation)
To prevent pre-computation attacks and collisions, we construct a context-aware salt using domain separation.

$$
Salt = \text{"BASTION\_GENERATOR\_V2::"} \parallel \text{lowercase}(S) \parallel \text{"::"} \parallel \text{lowercase}(U) \parallel \text{"::v"} \parallel V
$$

### 1.3. Key Derivation (The Flux)
We generate a pseudo-random stream of bytes (Flux) using PBKDF2.

$$
Flux = \text{PBKDF2-HMAC-SHA512}(P=E, S=Salt, c=210,000, dkLen=L \times 4)
$$

*   **PRF:** HMAC-SHA512
*   **Password ($P$):** The Hex String of the Master Entropy $E$.
*   **Iterations ($c$):** 210,000 (High cost to resist GPU brute-forcing).
*   **Derived Key Length ($dkLen$):** We request 4x bytes relative to the target length to ensure sufficient entropy for rejection sampling.

### 1.4. Unbiased Rejection Sampling
Standard modulo arithmetic (`byte % charset_length`) introduces bias if 256 is not perfectly divisible by the character set length. We strictly eliminate this bias.

1.  **Define Pool ($C$):**
    *   Alpha: `a-z` (26)
    *   Caps: `A-Z` (26)
    *   Num: `0-9` (10)
    *   Sym (Optional): `!@#$%^&*()_+-=[]{}|;:,.<>?` (32)
    *   Total Size ($N$): 62 (Alphanumeric) or 94 (Full).

2.  **Calculate Limit:**
    $$ Limit = 256 - (256 \pmod N) $$

3.  **Sampling Loop:**
    For each byte $b$ in $Flux$:
    *   If $b < Limit$:
        *   Index $i = b \pmod N$
        *   Append $C[i]$ to output.
    *   If $b \ge Limit$:
        *   **Reject $b$** (Discard byte to maintain uniform distribution).
    *   Repeat until Output Length equals $L$.

---

## 2. The Chaos Lock (Vault Storage)

The Vault State (JSON) is encrypted before persistence. The encryption key is derived from the user's Master Password, ensuring we (the software provider) can never access the data.

### 2.1. Key Derivation (V3 - Argon2id)
For maximum resistance against GPU/ASIC brute-force attacks, we use Argon2id.

*   **Algorithm:** Argon2id
*   **Memory ($m$):** 64 MB (65536 KB)
*   **Iterations ($t$):** 3
*   **Parallelism ($p$):** 1 (WebAssembly Safe)
*   **Salt:** 16 random bytes
*   **Output:** 32 bytes (256 bits)

$$
Key_{master} = \text{Argon2id}(P=Password, S=Salt, m=65536, t=3, p=1, l=32)
$$

### 2.2. Encryption (AES-GCM)
We use Authenticated Encryption to ensure confidentiality and integrity.

$$
IV = \text{CSPRNG}(12 \text{ bytes})
$$
$$
Ciphertext, Tag = \text{AES-256-GCM}(Key=Key_{master}, IV=IV, Plaintext=JSON)
$$

### 2.3. Blob Format (Base64 Encoded)
The storage blob is a concatenation of protocol identifiers and cryptographic data.

$$
Blob = \text{Header} \parallel Salt_{vault} \parallel IV \parallel Ciphertext \parallel Tag
$$

*   **Header (V3):** `BSTN` + `0x03`.
*   **Salt:** 16 bytes.
*   **IV:** 12 bytes.

*Legacy Support: The system maintains fallback support for V2 (PBKDF2-HMAC-SHA256) headers (`BSTN` + `0x02`) to ensure older vaults can be opened and automatically migrated.*

---

## 3. Secret Sharer (Shamir over Prime Field)

Used to split the Master Password or any secret into $n$ shards, requiring $k$ shards to reconstruct.
**Updated in v2.8:** Replaces GF(2^8) byte-splitting with Hybrid Encryption + Shamir over the secp256k1 Prime Field.

### 3.1. Field Definition
Arithmetic is performed modulo the prime $P$ (secp256k1 order):
$$ P = 2^{256} - 2^{32} - 977 $$

This large prime field prevents "small field" brute-force attacks and allows for cryptographically secure scalar multiplication.

### 3.2. Hybrid Scheme (KEM-Style)
To support secrets of arbitrary length while using a Prime Field (which natively supports only integers $< P$):

1.  **Session Key Generation ($K$):** Generate a random 256-bit integer $K$, where $0 < K < P$.
2.  **Encryption:** Encrypt the user's Secret ($S$) using $K$ with AES-256-GCM.
    $$ C, T = \text{AES-GCM}(Key=K, Plaintext=S) $$
    *(where $C$ is Ciphertext and $T$ is the Auth Tag)*
3.  **Polynomial Generation:** Create a random polynomial $f(x)$ of degree $k-1$, where the constant term is the session key $K$.
    $$ f(x) = K + a_1x + a_2x^2 + \dots + a_{k-1}x^{k-1} \pmod P $$
4.  **Sharding:** Generate $n$ points $(x, y)$ where $x \in \{1 \dots n\}$.
    $$ y_i = f(x_i) \pmod P $$
5.  **Distribution:** Each shard contains the share $(x, y)$ AND the ciphertext payload $(IV \parallel C \parallel T)$.

### 3.3. Reconstruction (Lagrange Interpolation)
To recover the secret from any $k$ shares:

1.  Use Lagrange Interpolation over $\mathbb{F}_P$ to recover $K$.
    $$ K = \sum_{j=0}^{k-1} y_j \left( \prod_{\substack{m=0 \\ m \ne j}}^{k-1} \frac{x_m}{x_m - x_j} \right) \pmod P $$
    *Note: Division is performed as multiplication by modular inverse: $a / b = a \cdot b^{P-2} \pmod P$.*

2.  Use the recovered $K$ to decrypt the ciphertext $C$.

### 3.4. Integrity & Verifiability (Pseudo-VSS)
While not a traditional Verifiable Secret Sharing (VSS) scheme involving homomorphic commitments (like Pedersen), our Hybrid approach achieves **computational integrity** via AEAD:

1.  If a user provides invalid shards (or a mix of shards from different secrets), the interpolated key $K'$ will be mathematically incorrect ($K' \neq K$).
2.  When attempting to decrypt the payload with $K'$, the **AES-GCM Tag Check** will fail.
3.  The system raises a cryptographic integrity error (`Decryption failed`), effectively proving the shards are invalid before returning a garbage secret.

---

## 4. Resonance Engine (Secure File Locker)

Implements a "Split-Horizon" security model where the Decryption Key and the Encrypted Payload are stored separately.

### 4.1. Process
1.  **Key Gen:** $Key_{file} = \text{CSPRNG}(32 \text{ bytes})$.
2.  **Encryption:** AES-256-GCM with a random 12-byte IV.
3.  **Storage:**
    *   **Payload:** Stored in browser `IndexedDB` or filesystem as an opaque blob.
    *   **Key:** Stored inside the encrypted Vault JSON (`Chaos Lock`).

### 4.2. Invariant
Possessing the file blob (Payload) without the Vault (Key) renders the file mathematically indistinguishable from random noise.

---

## 5. Network Privacy (k-Anonymity)

Used for the "Breach Scanner" to check passwords against HaveIBeenPwned without revealing the password to the API.

1.  **Hash:** $H = \text{SHA-1}(Password)$.
2.  **Prefix:** $P = \text{substring}(H, 0, 5)$. This reduces the search space from $2^{160}$ to $16^5 \approx 1,000,000$ buckets.
3.  **Suffix:** $S = \text{substring}(H, 5)$.
4.  **Query:** `GET https://api.pwnedpasswords.com/range/{P}`.
5.  **Local Match:** The API returns a list of ~500 suffixes. The client searches for $S$ in that list locally.

*The server never receives the full hash, ensuring the password remains private even if the request is intercepted.*

---

## 6. Zero-Trace Memory Hygiene

To mitigate RAM scraping and cold-boot attacks, the application enforces strict memory discipline within the constraints of the JavaScript runtime:

1.  **Ephemeral Decryption:** The Master Key exists in memory *only* during the transmutation or decryption operation.
2.  **Immediate Zeroization:** Critical buffers (e.g., the reconstructed session key in Secret Sharing) are explicitly overwritten with zeros (`buffer.fill(0)`) immediately after use, before the garbage collector runs.
3.  **Volatile State:** The application state is held in volatile RAM. Closing the tab triggers the browser's process termination, wiping the memory.
