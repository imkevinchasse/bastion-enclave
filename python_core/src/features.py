
import os
import secrets
import hashlib
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITERATIONS = 210_000

class ChaosEngine:
    ALPHA = "abcdefghijklmnopqrstuvwxyz"
    CAPS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    NUM = "0123456789"
    SYM = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    @staticmethod
    def transmute(entropy: str, service: str, username: str, version: int = 1, length: int = 16, symbols: bool = True) -> str:
        salt_str = f"BASTION_GENERATOR_V2::{service.lower()}::{username.lower()}::v{version}"
        dk_len = length * 32 # Surplus for rejection sampling
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA512(),
            length=dk_len, 
            salt=salt_str.encode('utf-8'),
            iterations=ITERATIONS,
        )
        flux_bytes = kdf.derive(entropy.encode('utf-8'))
        
        pool = ChaosEngine.ALPHA + ChaosEngine.CAPS + ChaosEngine.NUM
        if symbols: pool += ChaosEngine.SYM
            
        limit = 256 - (256 % len(pool))
        password = []
        buf_idx = 0
        
        while len(password) < length and buf_idx < len(flux_bytes):
            byte_val = flux_bytes[buf_idx]
            buf_idx += 1
            if byte_val < limit:
                char_idx = byte_val % len(pool)
                password.append(pool[char_idx])
            
        return "".join(password)

class LockerEngine:
    MAGIC = b"BASTION1"

    @staticmethod
    def encrypt_file(filepath: str) -> str:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
            
        with open(filepath, 'rb') as f:
            data = f.read()
            
        file_id = str(secrets.token_hex(18)) 
        key = secrets.token_bytes(32)
        iv = secrets.token_bytes(12)
        
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(iv, data, None)
        
        id_bytes = f"{file_id:<36}".encode('utf-8')
        header = LockerEngine.MAGIC + id_bytes + iv
        
        out_path = filepath + ".bastion"
        with open(out_path, 'wb') as f:
            f.write(header + ciphertext)
            
        return key.hex()

    @staticmethod
    def decrypt_file(filepath: str, key_hex: str) -> str:
        with open(filepath, 'rb') as f:
            data = f.read()
            
        if len(data) < 56: raise ValueError("File corrupt")
        if data[0:8] != LockerEngine.MAGIC: raise ValueError("Invalid Magic")
        
        iv = data[44:56]
        ciphertext = data[56:]
        key = bytes.fromhex(key_hex.strip())
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(iv, ciphertext, None)
        
        out_path = filepath.replace(".bastion", ".decrypted")
        with open(out_path, 'wb') as f:
            f.write(plaintext)
        return out_path

class BreachAuditor:
    @staticmethod
    def check_password(password: str) -> int:
        sha1 = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
        prefix = sha1[:5]
        suffix = sha1[5:]
        
        url = f"https://api.pwnedpasswords.com/range/{prefix}"
        headers = {'Add-Padding': 'true'}
        
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code != 200: return -1
            
            for line in r.text.splitlines():
                hash_suffix, count = line.split(':')
                if hash_suffix == suffix:
                    return int(count)
            return 0
        except Exception:
            return -1

class SecretSharer:
    # secp256k1 Field Prime
    PRIME = 2**256 - 2**32 - 977

    @staticmethod
    def _mod_inv(a: int) -> int:
        return pow(a, -1, SecretSharer.PRIME)

    @staticmethod
    def split(secret_str: str, shares: int, threshold: int) -> List[str]:
        # 1. Generate 256-bit Session Key
        session_key = secrets.token_bytes(32)
        
        # 2. Encrypt Secret with Session Key
        aes = AESGCM(session_key)
        iv = secrets.token_bytes(12)
        ciphertext = aes.encrypt(iv, secret_str.encode('utf-8'), None)
        
        # Payload = IV + Ciphertext
        payload = iv + ciphertext
        payload_hex = payload.hex()
        
        # 3. Split Session Key (as Integer)
        secret_int = int.from_bytes(session_key, 'big')
        
        # Coefficients
        coeffs = [secret_int] + [secrets.randbelow(SecretSharer.PRIME) for _ in range(threshold - 1)]
        
        shards = []
        share_id = secrets.token_hex(4)
        
        for x in range(1, shares + 1):
            y = 0
            for i, coeff in enumerate(coeffs):
                y = (y + coeff * pow(x, i, SecretSharer.PRIME)) % SecretSharer.PRIME
            
            y_hex = hex(y)[2:] # strip 0x
            # Format: bst_p256_{id}_{k}_{x}_{y}_{payload}
            shards.append(f"bst_p256_{share_id}_{threshold}_{x}_{y_hex}_{payload_hex}")
            
        return shards

    @staticmethod
    def combine(shards: List[str]) -> str:
        if not shards: raise ValueError("No shards provided")
        
        parsed = []
        for s in shards:
            parts = s.strip().split('_')
            # Check Format
            if parts[0] != 'bst': raise ValueError("Invalid shard")
            
            if parts[1] == 's1':
                raise ValueError("Legacy GF(256) shards detected. Use V2 runtime.")
            
            if parts[1] != 'p256' or len(parts) != 7:
                raise ValueError("Invalid shard format")

            parsed.append({
                'id': parts[2],
                'k': int(parts[3]),
                'x': int(parts[4]),
                'y': int(parts[5], 16),
                'payload': parts[6]
            })
            
        first = parsed[0]
        if any(p['id'] != first['id'] for p in parsed):
            raise ValueError("Shards belong to different secrets")
        if any(p['payload'] != first['payload'] for p in parsed):
            raise ValueError("Payload mismatch")
        if len(parsed) < first['k']:
            raise ValueError(f"Need {first['k']} shards, got {len(parsed)}")
            
        # Lagrange Interpolation
        k_shares = parsed[:first['k']]
        secret_int = 0
        P = SecretSharer.PRIME
        
        for j in range(len(k_shares)):
            xj = k_shares[j]['x']
            yj = k_shares[j]['y']
            
            num = 1
            den = 1
            
            for m in range(len(k_shares)):
                if m == j: continue
                xm = k_shares[m]['x']
                
                num = (num * (0 - xm)) % P
                den = (den * (xj - xm)) % P
                
            term = (yj * num * SecretSharer._mod_inv(den)) % P
            secret_int = (secret_int + term) % P
            
        # Decrypt
        session_key = secret_int.to_bytes(32, 'big')
        payload_bytes = bytes.fromhex(first['payload'])
        iv = payload_bytes[:12]
        ciphertext = payload_bytes[12:]
        
        aes = AESGCM(session_key)
        try:
            plaintext = aes.decrypt(iv, ciphertext, None)
            return plaintext.decode('utf-8')
        except Exception:
            raise ValueError("Decryption failed. Invalid recovered key.")
