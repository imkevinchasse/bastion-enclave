export const PYTHON_BASTION_SCRIPT = `
import os
import json
import base64
import hashlib
import hmac
import struct
import sys
import getpass
import time
import uuid
from typing import Dict, Any, Optional

# --- CONFIGURATION ---
ITERATIONS = 100000
ALGO_HASH = 'sha256'
MAGIC_BYTES = b'BASTION1'

# --- CRYPTO PRIMITIVES ---
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("WARNING: 'cryptography' library not found. Vault operations disabled.")
    print("         Run 'pip install cryptography' to enable full features.")
    print("         Deterministic Password Generator is strictly available below.\\n")

class ChaosEngine:
    @staticmethod
    def derive_key(password: str, salt: bytes) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=ITERATIONS,
            backend=default_backend()
        )
        return kdf.derive(password.encode())

    @staticmethod
    def decrypt_vault(blob_b64: str, password: str) -> Dict[str, Any]:
        if not CRYPTO_AVAILABLE:
            raise ImportError("Cryptography module required.")
            
        data = base64.b64decode(blob_b64)
        if len(data) < 28:
            raise ValueError("Invalid blob size")

        salt = data[0:16]
        iv = data[16:28]
        ciphertext = data[28:]

        key = ChaosEngine.derive_key(password, salt)
        aesgcm = AESGCM(key)
        
        try:
            plaintext = aesgcm.decrypt(iv, ciphertext, None)
            return json.loads(plaintext.decode('utf-8'))
        except Exception as e:
            raise ValueError("Decryption failed. Invalid password or corrupted blob.")

    @staticmethod
    def encrypt_vault(vault_data: Dict[str, Any], password: str) -> str:
        if not CRYPTO_AVAILABLE:
            raise ImportError("Cryptography module required.")
        
        salt = os.urandom(16)
        iv = os.urandom(12)
        key = ChaosEngine.derive_key(password, salt)
        aesgcm = AESGCM(key)
        
        plaintext = json.dumps(vault_data).encode('utf-8')
        ciphertext = aesgcm.encrypt(iv, plaintext, None)
        
        # Concat: Salt + IV + Ciphertext
        blob_bytes = salt + iv + ciphertext
        return base64.b64encode(blob_bytes).decode('utf-8')

    @staticmethod
    def transmute(entropy_hex: str, name: str, username: str, version: int = 1, length: int = 16, use_symbols: bool = True) -> str:
        salt_str = f"FORTRESS_V1::{name.lower()}::{username.lower()}::v{version}"
        master_entropy_bytes = entropy_hex.encode()
        
        dk = hashlib.pbkdf2_hmac('sha512', master_entropy_bytes, salt_str.encode(), ITERATIONS, 64)
        buffer = list(dk)
        
        glyphs = {
            'alpha': 'abcdefghijklmnopqrstuvwxyz',
            'caps': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            'num': '0123456789',
            'sym': '!@#$%^&*()_+-=[]{}|;:,.<>?'
        }
        
        pool = glyphs['alpha'] + glyphs['caps'] + glyphs['num']
        if use_symbols:
            pool += glyphs['sym']
            
        artifact = []
        artifact.append(glyphs['alpha'][buffer[0] % len(glyphs['alpha'])])
        artifact.append(glyphs['caps'][buffer[1] % len(glyphs['caps'])])
        artifact.append(glyphs['num'][buffer[2] % len(glyphs['num'])])
        artifact.append(glyphs['sym'][buffer[3] % len(glyphs['sym'])] if use_symbols else glyphs['alpha'][buffer[3] % len(glyphs['alpha'])])
            
        for i in range(4, length):
            byte = buffer[i % len(buffer)] ^ buffer[(i + 13) % len(buffer)]
            artifact.append(pool[byte % len(pool)])
            
        final_str = "".join(artifact)
        seed_byte = buffer[63]
        arr = list(final_str)
        n = len(arr)
        for i in range(n - 1, 0, -1):
            seed_byte = (seed_byte * 1664525 + 1013904223) % 4294967296
            j = abs(int(seed_byte)) % (i + 1)
            arr[i], arr[j] = arr[j], arr[i]
            
        return "".join(arr)

def main():
    print(f"\\n{'='*60}")
    print(" BASTION SECURE ENCLAVE // PYTHON RUNTIME v2.0")
    print(f"{'='*60}\\n")
    
    print("1. Decrypt & Search Vault")
    print("2. Generate Password (Manual)")
    print("3. Encrypt New Vault (Reset)")
    print("4. Add Entry to Existing Vault")
    choice = input("\\nSelect Operation [1-4]: ")
    
    if choice == '1':
        if not CRYPTO_AVAILABLE: return
        blob = input("\\nPaste Vault Blob: ").strip()
        pwd = getpass.getpass("Master Password: ")
        
        try:
            vault = ChaosEngine.decrypt_vault(blob, pwd)
            print(f"\\n[+] DECRYPTION SUCCESSFUL. Entropy: {vault.get('entropy')}")
            
            # Interactive Search Loop
            while True:
                query = input("\\nSearch (Enter to list all, 'q' to quit): ").lower().strip()
                if query == 'q': break
                
                configs = vault.get('configs', [])
                found = 0
                for conf in configs:
                    if query in conf['name'].lower() or query in conf['username'].lower():
                        p = ChaosEngine.transmute(
                            vault['entropy'], 
                            conf['name'], 
                            conf['username'], 
                            conf.get('version', 1), 
                            conf.get('length', 16), 
                            conf.get('useSymbols', True)
                        )
                        print(f"\\nService:  {conf['name']}")
                        print(f"Username: {conf['username']}")
                        print(f"Password: {p}")
                        found += 1
                
                if found == 0:
                    print("No matches found.")
                else:
                    print(f"\\nFound {found} results.")

        except Exception as e:
            print(f"\\n[!] FATAL: {str(e)}")

    elif choice == '2':
        entropy = input("\\nEnter Master Entropy (Hex): ").strip()
        service = input("Service Name: ").strip()
        username = input("Username: ").strip()
        length = int(input("Length [16]: ") or "16")
        
        pwd = ChaosEngine.transmute(entropy, service, username, length=length)
        print(f"\\nArtifact: {pwd}")

    elif choice == '3':
        if not CRYPTO_AVAILABLE: return
        print("\\n--- NEW VAULT CREATION ---")
        pwd = getpass.getpass("Set Master Password: ")
        entropy = os.urandom(32).hex()
        vault = {
            "entropy": entropy,
            "configs": [],
            "version": 1,
            "lastModified": int(time.time() * 1000)
        }
        blob = ChaosEngine.encrypt_vault(vault, pwd)
        print(f"\\n[+] NEW VAULT GENERATED. SAVE THIS BLOB SECURELY:\\n")
        print(blob)

    elif choice == '4':
        if not CRYPTO_AVAILABLE: return
        print("\\n--- ADD ENTRY TO VAULT ---")
        blob = input("Paste Existing Vault Blob: ").strip()
        pwd = getpass.getpass("Master Password: ")
        
        try:
            vault = ChaosEngine.decrypt_vault(blob, pwd)
            print(f"[+] Vault Unlocked. Entries: {len(vault.get('configs', []))}")
            
            name = input("New Service Name: ").strip()
            username = input("New Username: ").strip()
            
            if not name or not username:
                print("[!] Error: Name and Username required.")
                return

            new_config = {
                "id": str(uuid.uuid4()),
                "name": name,
                "username": username,
                "version": 1,
                "length": 16,
                "useSymbols": True,
                "category": "login",
                "updatedAt": int(time.time() * 1000)
            }
            
            vault.setdefault('configs', []).append(new_config)
            vault['version'] = vault.get('version', 0) + 1
            vault['lastModified'] = int(time.time() * 1000)
            
            new_blob = ChaosEngine.encrypt_vault(vault, pwd)
            print(f"\\n[+] ENTRY ADDED. HERE IS YOUR NEW VAULT BLOB:\\n")
            print(new_blob)
            
        except Exception as e:
            print(f"\\n[!] ERROR: {str(e)}")

if __name__ == "__main__":
    main()
`;
