
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
        # Matches JS/Kotlin Implementation
        salt_str = f"BASTION_GENERATOR_V2::{service.lower()}::{username.lower()}::v{version}"
        dk_len = length * 4 
        
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
        
        while len(password) < length:
            if buf_idx >= len(flux_bytes): break
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
            
        file_id = str(secrets.token_hex(18)) # 36 chars
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
        """
        Checks HIBP API using k-Anonymity.
        Returns count of breaches (0 if safe/unknown).
        """
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
