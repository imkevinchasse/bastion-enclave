
import os
import json
import base64
import secrets
import shutil
import time
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# --- CONSTANTS ---
CURRENT_ITERATIONS = 210_000
LEGACY_ITERATIONS = 100_000
MAGIC_HEADER = "BASTION_V3::"

# --- DATA MODELS ---

@dataclass
class VaultState:
    entropy: str
    configs: List[Dict] = field(default_factory=list)
    locker: List[Dict] = field(default_factory=list)
    version: int = 1
    lastModified: int = 0
    flags: int = 0

# --- CRYPTO PRIMITIVES ---

class BastionCrypto:
    @staticmethod
    def derive_key(password: str, salt: bytes, use_domain_sep: bool = True, iterations: int = CURRENT_ITERATIONS) -> bytes:
        final_salt = salt
        if use_domain_sep:
            domain_prefix = b"BASTION_VAULT_V1::"
            final_salt = domain_prefix + salt

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=final_salt,
            iterations=iterations,
        )
        return kdf.derive(password.encode('utf-8'))

    @staticmethod
    def encrypt_blob(data_json: str, password: str) -> str:
        salt = secrets.token_bytes(16)
        iv = secrets.token_bytes(12)
        
        # Always encrypt using Current Standard
        key = BastionCrypto.derive_key(password, salt, use_domain_sep=True, iterations=CURRENT_ITERATIONS)
        aesgcm = AESGCM(key)
        
        plaintext = data_json.encode('utf-8')
        ciphertext = aesgcm.encrypt(iv, plaintext, None)
        
        # Blob Structure: SALT(16) | IV(12) | CIPHERTEXT
        blob = salt + iv + ciphertext
        return base64.b64encode(blob).decode('utf-8')

    @staticmethod
    def decrypt_blob(blob_b64: str, password: str) -> Tuple[Optional[str], bool]:
        """
        Attempts to decrypt the blob using multiple strategies.
        Returns: (decrypted_json_string, is_legacy_format)
        """
        try:
            data = base64.b64decode(blob_b64)
            if len(data) < 28: return None, False
            
            salt = data[0:16]
            iv = data[16:28]
            ciphertext = data[28:]
            
            def try_strategy(domain_sep: bool, iters: int) -> Optional[str]:
                try:
                    key = BastionCrypto.derive_key(password, salt, domain_sep, iters)
                    aesgcm = AESGCM(key)
                    plaintext = aesgcm.decrypt(iv, ciphertext, None)
                    return plaintext.decode('utf-8')
                except Exception:
                    return None

            # Strategy 1: Current Standard (V3/V2)
            # Domain Separation + 210k Iterations
            res = try_strategy(True, CURRENT_ITERATIONS)
            if res: return res, False

            # Strategy 2: Legacy V1
            # No Domain Separation + 210k Iterations
            res = try_strategy(False, CURRENT_ITERATIONS)
            if res: return res, True # Legacy

            # Strategy 3: Ancient
            # No Domain Separation + 100k Iterations
            res = try_strategy(False, LEGACY_ITERATIONS)
            if res: return res, True # Legacy

            return None, False

        except Exception:
            return None, False

# --- STORAGE MANAGER ---

class VaultManager:
    def __init__(self, filepath="bastion.vault"):
        self.filepath = filepath
        self.blobs: List[str] = []
        self.active_state: Optional[VaultState] = None
        self.active_password: Optional[str] = None
        self.active_blob_index: int = -1

    def load_file(self) -> bool:
        if not os.path.exists(self.filepath):
            return False
        
        try:
            with open(self.filepath, "r") as f:
                content = f.read().strip()
            
            if content.startswith(MAGIC_HEADER):
                # V3 Format
                payload = content[len(MAGIC_HEADER):]
                decoded = base64.b64decode(payload).decode('utf-8')
                self.blobs = json.loads(decoded)
            elif content.startswith("["):
                # JSON Array (Legacy)
                self.blobs = json.loads(content)
            else:
                # Raw Blob (Legacy V1)
                self.blobs = [content]
            return True
        except Exception as e:
            print(f"Error loading file: {e}")
            return False

    def save_file(self):
        if self.active_state and self.active_password:
            # Update active blob
            self.active_state.lastModified = int(time.time() * 1000)
            new_blob = BastionCrypto.encrypt_blob(
                json.dumps(asdict(self.active_state)), 
                self.active_password
            )
            
            if self.active_blob_index >= 0:
                self.blobs[self.active_blob_index] = new_blob
            else:
                self.blobs.append(new_blob)
                self.active_blob_index = len(self.blobs) - 1

        payload = json.dumps(self.blobs)
        b64 = base64.b64encode(payload.encode('utf-8')).decode('utf-8')
        final_out = MAGIC_HEADER + b64
        
        # Atomic Write
        temp = self.filepath + ".tmp"
        with open(temp, "w") as f:
            f.write(final_out)
        shutil.move(temp, self.filepath)
        # Secure Permissions
        try:
            os.chmod(self.filepath, 0o600)
        except:
            pass

    def unlock(self, password: str) -> bool:
        for idx, blob in enumerate(self.blobs):
            decrypted_json, is_legacy = BastionCrypto.decrypt_blob(blob, password)
            
            if decrypted_json:
                data = json.loads(decrypted_json)
                self.active_state = VaultState(**data)
                self.active_password = password
                self.active_blob_index = idx
                
                # --- AUTOMATIC MIGRATION CHECK ---
                if is_legacy:
                    print("\n[SYSTEM] Legacy encryption format detected.")
                    print("[SYSTEM] Seamlessly migrating vault to V3 Algorithm (AES-GCM + Domain Separation)...")
                    try:
                        self.save_file()
                        print("[SYSTEM] Migration complete. Vault secured with latest standards.\n")
                    except Exception as e:
                        print(f"[WARN] Automatic migration failed: {e}")
                
                return True
        return False

    def create_new(self, password: str):
        entropy = secrets.token_hex(32)
        state = VaultState(entropy=entropy, lastModified=int(time.time()*1000))
        self.blobs = []
        self.active_state = state
        self.active_password = password
        self.active_blob_index = 0
        self.blobs.append("") # Placeholder
        self.save_file()
