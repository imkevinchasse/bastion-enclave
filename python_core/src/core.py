
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
import argon2

from .serializer import BastionSerializer

# --- CONSTANTS ---
# V3 (Argon2id) Parameters - Matches TypeScript
ARGON_TIME_COST = 3
ARGON_MEMORY_COST = 65536 # 64 MB
ARGON_PARALLELISM = 1
ARGON_HASH_LEN = 32
ARGON_TYPE = argon2.Type.ID

# Legacy Parameters
LEGACY_ITERATIONS_V2 = 210_000
LEGACY_ITERATIONS_V1 = 100_000

# Headers
HEADER_V3_5 = b"\x42\x53\x54\x4E\x04" # BSTN + 0x04 (V3.5 with Padding)
HEADER_V3 = b"\x42\x53\x54\x4E\x03" # BSTN + 0x03 (V3 Raw)
HEADER_V2 = b"\x42\x53\x54\x4E\x02" # BSTN + 0x02 (Legacy)
MAGIC_HEADER_STR = "BASTION_V3::" # Wrapper for text file storage

# --- DATA MODELS ---

@dataclass
class VaultState:
    entropy: str
    configs: List[Dict] = field(default_factory=list)
    locker: List[Dict] = field(default_factory=list)
    version: int = 1
    lastModified: int = 0
    flags: int = 0
    notes: List[Dict] = field(default_factory=list)
    contacts: List[Dict] = field(default_factory=list)

# --- CRYPTO PRIMITIVES ---

class BastionCrypto:
    @staticmethod
    def derive_key_argon2(password: str, salt: bytes) -> bytes:
        return argon2.low_level.hash_secret_raw(
            secret=password.encode('utf-8'),
            salt=salt,
            time_cost=ARGON_TIME_COST,
            memory_cost=ARGON_MEMORY_COST,
            parallelism=ARGON_PARALLELISM,
            hash_len=ARGON_HASH_LEN,
            type=ARGON_TYPE
        )

    @staticmethod
    def derive_key_pbkdf2(password: str, salt: bytes, use_domain_sep: bool = True, iterations: int = LEGACY_ITERATIONS_V2) -> bytes:
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
    def encrypt_blob(vault_state: VaultState, password: str) -> str:
        # 1. Canonical Serialization
        canonical_json = BastionSerializer.serialize(vault_state)
        
        # 2. Framing (Length Prefixing + Padding)
        framed_bytes = BastionSerializer.frame(canonical_json)

        # 3. Encryption (V3.5: Argon2id + AES-GCM + Framing)
        salt = secrets.token_bytes(16)
        iv = secrets.token_bytes(12)
        
        key = BastionCrypto.derive_key_argon2(password, salt)
        aesgcm = AESGCM(key)
        
        ciphertext = aesgcm.encrypt(iv, framed_bytes, None)
        
        # Structure: Header + Salt + IV + Cipher
        blob = HEADER_V3_5 + salt + iv + ciphertext
        return base64.b64encode(blob).decode('utf-8')

    @staticmethod
    def decrypt_blob(blob_b64: str, password: str) -> Tuple[Optional[str], bool]:
        """
        Attempts decryption. Returns (json_str, is_legacy_format).
        Handles deframing automatically.
        """
        try:
            data = base64.b64decode(blob_b64)
            decrypted_bytes = None
            is_legacy = False
            version = 1
            
            # Check for Protocol Headers
            if len(data) > 5 and data[0:4] == b"BSTN":
                v_byte = data[4]
                if v_byte == 4: version = 4 # V3.5
                elif v_byte == 3: version = 3 # V3.0
                elif v_byte == 2: version = 2 # V2.0
            
            if version >= 3:
                # V3/V3.5: Argon2id
                salt = data[5:21]
                iv = data[21:33]
                ciphertext = data[33:]
                try:
                    key = BastionCrypto.derive_key_argon2(password, salt)
                    aesgcm = AESGCM(key)
                    decrypted_bytes = aesgcm.decrypt(iv, ciphertext, None)
                    if version == 3: is_legacy = True # Needs upgrade to V3.5 framing
                except Exception:
                    return None, False

            elif version == 2:
                # V2: PBKDF2
                salt = data[5:21]
                iv = data[21:33]
                ciphertext = data[33:]
                try:
                    key = BastionCrypto.derive_key_pbkdf2(password, salt, True, LEGACY_ITERATIONS_V2)
                    aesgcm = AESGCM(key)
                    decrypted_bytes = aesgcm.decrypt(iv, ciphertext, None)
                    is_legacy = True
                except Exception:
                    return None, False
            
            # --- LEGACY FALLBACKS (No Header) ---
            if decrypted_bytes is None:
                if len(data) < 28: return None, False
                salt = data[0:16]
                iv = data[16:28]
                ciphertext = data[28:]

                # Try V1 (PBKDF2 with Domain Sep)
                try:
                    key = BastionCrypto.derive_key_pbkdf2(password, salt, True, LEGACY_ITERATIONS_V2)
                    aesgcm = AESGCM(key)
                    decrypted_bytes = aesgcm.decrypt(iv, ciphertext, None)
                    is_legacy = True
                except: 
                    # Try V0 (Ancient)
                    try:
                        key = BastionCrypto.derive_key_pbkdf2(password, salt, False, LEGACY_ITERATIONS_V1)
                        aesgcm = AESGCM(key)
                        decrypted_bytes = aesgcm.decrypt(iv, ciphertext, None)
                        is_legacy = True
                    except:
                        return None, False

            # 4. Deframe based on version
            if decrypted_bytes:
                if version >= 4:
                    json_str = BastionSerializer.deframe(decrypted_bytes)
                else:
                    json_str = decrypted_bytes.decode('utf-8')
                return json_str, is_legacy
            
            return None, False

        except Exception as e:
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
            
            if content.startswith(MAGIC_HEADER_STR):
                # Wrapped Format
                payload = content[len(MAGIC_HEADER_STR):]
                decoded = base64.b64decode(payload).decode('utf-8')
                self.blobs = json.loads(decoded)
            elif content.startswith("["):
                # Plain JSON Array (Legacy Wrapper)
                self.blobs = json.loads(content)
            else:
                # Raw Blob
                self.blobs = [content]
            return True
        except Exception as e:
            print(f"Error loading file: {e}")
            return False

    def save_file(self):
        if self.active_state and self.active_password:
            # Update active blob using V3.5
            self.active_state.lastModified = int(time.time() * 1000)
            self.active_state.version += 1
            
            # Encrypt logic now handles Serialization & Framing via BastionCrypto
            new_blob = BastionCrypto.encrypt_blob(self.active_state, self.active_password)
            
            if self.active_blob_index >= 0:
                self.blobs[self.active_blob_index] = new_blob
            else:
                self.blobs.append(new_blob)
                self.active_blob_index = len(self.blobs) - 1

        payload = json.dumps(self.blobs)
        b64 = base64.b64encode(payload.encode('utf-8')).decode('utf-8')
        final_out = MAGIC_HEADER_STR + b64
        
        # Atomic Write
        temp = self.filepath + ".tmp"
        with open(temp, "w") as f:
            f.write(final_out)
        shutil.move(temp, self.filepath)
        try:
            os.chmod(self.filepath, 0o600)
        except:
            pass

    def unlock(self, password: str) -> bool:
        for idx, blob in enumerate(self.blobs):
            decrypted_json, is_legacy = BastionCrypto.decrypt_blob(blob, password)
            
            if decrypted_json:
                data = json.loads(decrypted_json)
                # Handle missing fields in older vaults
                self.active_state = VaultState(
                    entropy=data['entropy'],
                    configs=data.get('configs', []),
                    locker=data.get('locker', []),
                    version=data.get('version', 1),
                    lastModified=data.get('lastModified', 0),
                    flags=data.get('flags', 0),
                    notes=data.get('notes', []),
                    contacts=data.get('contacts', [])
                )
                self.active_password = password
                self.active_blob_index = idx
                
                if is_legacy:
                    print("\n[SYSTEM] Legacy vault format detected.")
                    print("[SYSTEM] Upgrading to Sovereign-V3.5 Protocol (Canonical Framing)...")
                    try:
                        self.save_file()
                        print("[SYSTEM] Upgrade complete.\n")
                    except Exception as e:
                        print(f"[WARN] Upgrade failed: {e}")
                
                return True
        return False

    def create_new(self, password: str):
        entropy = secrets.token_hex(32)
        state = VaultState(entropy=entropy, lastModified=int(time.time()*1000))
        self.blobs = []
        self.active_state = state
        self.active_password = password
        self.active_blob_index = 0
        self.blobs.append("") 
        self.save_file()

    def export_decrypted_json(self) -> str:
        if not self.active_state:
            raise PermissionError("Vault locked")
        return BastionSerializer.serialize(self.active_state)
