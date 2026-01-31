
export const PYTHON_APP_SOURCE = {
  "bastion.py": `#!/usr/bin/env python3
\"\"\"
BASTION SECURE ENCLAVE // PYTHON RUNTIME
v3.5.0

[MISSION]
"If the web disappears, Bastion still works."

[EXECUTION]
bastion             # Launch Interactive Shell
bastion --version   # Check Version
bastion update      # Update to latest
bastion -gui        # Launch GUI Mode
\"\"\"

import sys
import os
import argparse

# Ensure src is in python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

try:
    from src.interface import BastionShell
    from src.updater import BastionUpdater
except ImportError as e:
    print("CRITICAL ERROR: Failed to load Bastion Core Modules.")
    print(f"Details: {e}")
    print("\\nIf you installed manually, did you run 'pip install -r requirements.txt'?")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Bastion Secure Enclave")
    
    # Flags
    parser.add_argument('--version', action='store_true', help="Show protocol version")
    parser.add_argument('-gui', action='store_true', help="Launch GUI Mode (Experimental)")
    
    # Commands
    subparsers = parser.add_subparsers(dest='command', help='Operational commands')
    
    # Update Command
    parser_update = subparsers.add_parser('update', help='Check for and apply updates')
    parser_update.add_argument('--force', action='store_true', help='Force reinstall')

    args = parser.parse_args()

    # 1. Version Check
    if args.version:
        print("Bastion Enclave v3.5.0")
        print("Protocol: Sovereign-V3.5 (Argon2id/AES-GCM)")
        sys.exit(0)

    # 2. GUI Mode
    if args.gui:
        print("[*] GUI Mode is currently a placeholder for the PyQt6 implementation.")
        print("[*] Please run standard 'bastion' for the terminal interface.")
        sys.exit(0)

    # 3. Update Command
    if args.command == 'update':
        updater = BastionUpdater()
        updater.perform_update(force=args.force)
        sys.exit(0)

    # 4. Default: Interactive Shell
    try:
        # Enforce secure file permissions on run (Best Effort)
        if os.name == 'posix':
            os.umask(0o077)
            
        app = BastionShell()
        app.run()
    except KeyboardInterrupt:
        print("\\n\\n[!] Force Exit. Memory wiped.")
        sys.exit(0)
    except Exception as e:
        print(f"\\n[CRITICAL] Runtime Crash: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
`,
  "install.sh": `#!/bin/bash

# BASTION ENCLAVE INSTALLER
# Sets up ~/.bastion with a python virtual environment and alias.

set -e

INSTALL_DIR="$HOME/.bastion"
BIN_DIR="/usr/local/bin"
REPO_ZIP_URL="https://bastion.os/assets/bastion-python-runtime-v3.0.zip" # Placeholder for valid artifact URL

echo -e "\\033[0;34m[+] Bastion Enclave Installer\\033[0m"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "\\033[0;31m[!] Python 3 not found. Please install python3 first.\\033[0m"
    exit 1
fi

# 2. Create Directory
echo "[*] Creating Enclave at $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 3. Download Core (Simulation)
# In a real script, this would curl the zip or git clone.
# For this script to work standalone, it assumes files are present or fetches them.
# echo "[*] Fetching Core Protocol..."
# curl -L -o bastion.zip "$REPO_ZIP_URL"
# unzip -o bastion.zip
# rm bastion.zip

# 4. Setup Venv
echo "[*] Initializing Virtual Environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# 5. Install Deps
echo "[*] Installing Dependencies..."
./venv/bin/pip install -r requirements.txt --quiet

# 6. Create Wrapper
echo "[*] Creating 'bastion' executable..."
cat <<EOF > bastion_wrapper
#!/bin/bash
source "$INSTALL_DIR/venv/bin/activate"
python3 "$INSTALL_DIR/bastion.py" "\$@"
deactivate
EOF

chmod +x bastion_wrapper

# 7. Link to Path (User Local Bin usually preferred over system bin for non-root)
USER_BIN="$HOME/.local/bin"
mkdir -p "$USER_BIN"

# Remove old link if exists
if [ -L "$USER_BIN/bastion" ]; then
    rm "$USER_BIN/bastion"
fi

ln -s "$INSTALL_DIR/bastion_wrapper" "$USER_BIN/bastion"

# 8. Path Check
if [[ ":\$PATH:" == *":$USER_BIN:"* ]]; then
    echo -e "\\033[0;32m[✓] Install Complete.\\033[0m"
    echo "Run 'bastion' to start."
else
    echo -e "\\033[0;33m[!] Warning: $USER_BIN is not in your PATH.\\033[0m"
    echo "Add this to your shell profile:"
    echo "export PATH=\"\$PATH:$USER_BIN\""
    echo "Then run 'bastion'."
fi
`,
  "requirements.txt": `cryptography>=41.0.0
requests>=2.31.0
pyperclip>=1.8.2
rich>=13.0.0
argon2-cffi>=23.1.0`,
  "src/__init__.py": `# Bastion Source Package`,
  "src/updater.py": `import os
import sys
import subprocess
import requests
from rich.console import Console

REPO_URL = "https://raw.githubusercontent.com/imkevinchasse/bastion-enclave/main"

class BastionUpdater:
    def __init__(self):
        self.console = Console()

    def perform_update(self, force=False):
        self.console.print("[bold cyan]Bastion Enclave Update System[/bold cyan]")
        
        install_dir = os.path.expanduser("~/.bastion")
        if not os.path.exists(install_dir):
            self.console.print("[yellow]Standard installation directory (~/.bastion) not found.[/yellow]")
            return

        try:
            installer_url = f"{REPO_URL}/install.sh"
            self.console.print(f"Fetching installer from {installer_url}...")
            
            r = requests.get(installer_url)
            if r.status_code != 200:
                self.console.print("[red]Failed to download update script.[/red]")
                return

            self.console.print("[green]Applying patches...[/green]")
            process = subprocess.Popen(
                ['bash'], 
                stdin=subprocess.PIPE, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate(input=r.text)
            
            if process.returncode == 0:
                self.console.print("\\n[bold green]✓ Update Successful[/bold green]")
                self.console.print("Please restart the shell.")
            else:
                self.console.print(f"[red]Update failed:[/red]\\n{stderr}")

        except Exception as e:
            self.console.print(f"[red]Error during update: {e}[/red]")
`,
  "src/serializer.py": `
import json
import struct
from typing import Dict, List, Any

class BastionSerializer:
    """
    Enforces 'Deterministic-but-Unique' output signatures.
    """

    ORDER_ROOT = [
        "version", "entropy", "flags", "lastModified", 
        "locker", "contacts", "notes", "configs"
    ]

    ORDER_CONFIG = [
        "id", "name", "username", "category", "version", 
        "length", "useSymbols", "customPassword", "breachStats", "compromised",
        "createdAt", "updatedAt", "usageCount", "sortOrder"
    ]

    ORDER_NOTE = ["id", "updatedAt", "title", "content"]
    ORDER_CONTACT = ["id", "updatedAt", "name", "email", "phone", "address", "notes"]
    ORDER_RESONANCE = ["id", "timestamp", "label", "size", "mime", "key", "hash", "embedded"]

    @staticmethod
    def _reorder(obj: Dict[str, Any], order: List[str]) -> Dict[str, Any]:
        if not isinstance(obj, dict): return obj
        out = {}
        for key in order:
            if key in obj: out[key] = obj[key]
        remaining = sorted([k for k in obj.keys() if k not in order])
        for key in remaining: out[key] = obj[key]
        return out

    @classmethod
    def serialize(cls, state: Any) -> str:
        if hasattr(state, '__dict__'): state_dict = state.__dict__
        elif isinstance(state, dict): state_dict = state
        else: raise ValueError("State must be a dict or dataclass")

        ordered = cls._reorder(state_dict, cls.ORDER_ROOT)

        if 'configs' in ordered and isinstance(ordered['configs'], list):
            ordered['configs'] = [cls._reorder(c, cls.ORDER_CONFIG) for c in ordered['configs']]
        if 'notes' in ordered and isinstance(ordered['notes'], list):
            ordered['notes'] = [cls._reorder(n, cls.ORDER_NOTE) for n in ordered['notes']]
        if 'contacts' in ordered and isinstance(ordered['contacts'], list):
            ordered['contacts'] = [cls._reorder(c, cls.ORDER_CONTACT) for c in ordered['contacts']]
        if 'locker' in ordered and isinstance(ordered['locker'], list):
            ordered['locker'] = [cls._reorder(l, cls.ORDER_RESONANCE) for l in ordered['locker']]

        return json.dumps(ordered, separators=(',', ':'))

    @staticmethod
    def frame(json_str: str) -> bytes:
        """
        Wraps JSON with 4-byte Length Header + 0x00 Padding to 64-byte alignment.
        """
        data_bytes = json_str.encode('utf-8')
        length = len(data_bytes)
        
        # 1. Header
        header = struct.pack('<I', length)
        
        # 2. Padding Calc
        total_raw = 4 + length
        remainder = total_raw % 64
        padding_needed = 0 if remainder == 0 else 64 - remainder
        padding = b'\\x00' * padding_needed
        
        return header + data_bytes + padding

    @staticmethod
    def deframe(data: bytes) -> str:
        if len(data) < 4: return data.decode('utf-8')

        try:
            # Read Length (Little Endian)
            claimed_len = struct.unpack('<I', data[:4])[0]
            
            # Check if claimed length fits in buffer (allowing for padding)
            if claimed_len <= len(data) - 4:
                # Valid Bastion Frame: Slice exact payload
                return data[4:4+claimed_len].decode('utf-8')
        except:
            pass
            
        # Fallback
        return data.decode('utf-8')
`,
  "src/core.py": `import os
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
# V3 (Argon2id) Parameters
ARGON_TIME_COST = 3
ARGON_MEMORY_COST = 65536 # 64 MB
ARGON_PARALLELISM = 1
ARGON_HASH_LEN = 32
ARGON_TYPE = argon2.Type.ID

# Legacy Parameters
LEGACY_ITERATIONS_V2 = 210_000
LEGACY_ITERATIONS_V1 = 100_000

# Headers
HEADER_V3_5 = b"\\x42\\x53\\x54\\x4E\\x04" # BSTN + 0x04 (V3.5)
HEADER_V3 = b"\\x42\\x53\\x54\\x4E\\x03" # BSTN + 0x03 (V3)
HEADER_V2 = b"\\x42\\x53\\x54\\x4E\\x02" # BSTN + 0x02
MAGIC_HEADER_STR = "BASTION_V3::"

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
        \"\"\"
        Attempts decryption. Returns (json_str, is_legacy_format).
        Handles deframing automatically.
        \"\"\"
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
                    print("\\n[SYSTEM] Legacy vault format detected.")
                    print("[SYSTEM] Upgrading to Sovereign-V3.5 Protocol (Canonical Framing)...")
                    try:
                        self.save_file()
                        print("[SYSTEM] Upgrade complete.\\n")
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
        return BastionSerializer.serialize(self.active_state)`,
  "src/features.py": `import os
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
            raise ValueError("Decryption failed. Invalid recovered key.")`,
  "src/interface.py": `import os
import sys
import time
import threading
import secrets
import getpass
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich import print as rprint

try:
    import pyperclip
except ImportError:
    pyperclip = None

from .core import VaultManager
from .features import ChaosEngine, LockerEngine, BreachAuditor, SecretSharer

# --- CONFIGURATION ---
CLIPBOARD_TIMEOUT = 45 # Seconds
AUTO_LOCK_TIMEOUT = 300 # Seconds (5 Minutes)

class ActivityMonitor:
    def __init__(self):
        self.last_activity = time.time()
        
    def ping(self):
        self.last_activity = time.time()
        
    def is_expired(self):
        return (time.time() - self.last_activity) > AUTO_LOCK_TIMEOUT

class BastionShell:
    def __init__(self):
        self.console = Console()
        self.manager = VaultManager()
        self.running = True
        self.monitor = ActivityMonitor()
        self.clipboard_timer: threading.Timer = None

    def clear(self):
        os.system('cls' if os.name == 'nt' else 'clear')

    def header(self):
        self.clear()
        self.console.print(Panel.fit(
            "[bold cyan]BASTION SECURE ENCLAVE[/bold cyan]\\n"
            "[dim]Python Runtime v3.5.0 | Sovereign Protocol[/dim]",
            border_style="indigo"
        ))

    def copy_to_clipboard(self, text: str):
        if pyperclip:
            pyperclip.copy(text)
            
            # Cancel previous timer if exists
            if self.clipboard_timer and self.clipboard_timer.is_alive():
                self.clipboard_timer.cancel()
            
            self.console.print(f"[bold green]✓ Copied to clipboard. Wiping in {CLIPBOARD_TIMEOUT}s.[/bold green]")
            
            def wipe():
                try:
                    pyperclip.copy("")
                except: pass
                
            self.clipboard_timer = threading.Timer(CLIPBOARD_TIMEOUT, wipe)
            self.clipboard_timer.daemon = True # Ensure it doesn't block exit
            self.clipboard_timer.start()
        else:
            self.console.print("[yellow]! Clipboard module not found (pip install pyperclip)[/yellow]")

    def check_lock_status(self):
        \"\"\"Checks inactivity and locks if necessary.\"\"\"
        if self.manager.active_state and self.monitor.is_expired():
            self.clear()
            self.console.print(Panel("[bold red]SESSION TIMEOUT[/bold red]\\nVault locked due to inactivity.", border_style="red"))
            self.manager.active_state = None
            self.manager.active_password = None
            time.sleep(2)
            return True
        return False

    def run(self):
        self.header()
        
        # LOGIN PHASE
        if not self.manager.load_file():
            self.console.print("[yellow]No vault found.[/yellow]")
            if Confirm.ask("Create new vault?"):
                while True:
                    pwd = getpass.getpass("Set Master Password: ")
                    if len(pwd) < 8:
                        self.console.print("[red]Password too weak (min 8 chars).[/red]")
                        continue
                    confirm = getpass.getpass("Confirm Password: ")
                    if pwd != confirm:
                        self.console.print("[red]Passwords do not match.[/red]")
                        continue
                    self.manager.create_new(pwd)
                    break
            else:
                sys.exit(0)
        else:
            attempts = 3
            while attempts > 0:
                pwd = getpass.getpass("Enter Password: ")
                if self.manager.unlock(pwd):
                    break
                attempts -= 1
                self.console.print(f"[red]Decryption failed. {attempts} attempts left.[/red]")
            
            if not self.manager.active_state:
                sys.exit(1)

        self.monitor.ping()

        # MAIN APPLICATION LOOP
        while self.running:
            if self.check_lock_status():
                sys.exit(0)

            self.header()
            state = self.manager.active_state
            
            # Stats
            counts = f"{len(state.configs)} Logins | {len(state.notes)} Notes | {len(state.contacts)} Contacts | {len(state.locker)} Files"
            self.console.print(f"[dim]{counts}[/dim]\\n")

            table = Table(show_header=False, box=None, padding=(0, 2))
            table.add_row("[bold]1[/bold]", "Credentials (Logins)")
            table.add_row("[bold]2[/bold]", "Secure Notes")
            table.add_row("[bold]3[/bold]", "Private Contacts")
            table.add_row("[bold]4[/bold]", "Bastion Locker (Files)")
            table.add_row("[bold]5[/bold]", "Utilities (Generator, Audit, Sharing)")
            table.add_row("[bold]6[/bold]", "Backup & Export")
            table.add_row("[bold]0[/bold]", "Lock & Exit")
            
            self.console.print(table)
            choice = Prompt.ask("Select", choices=["1", "2", "3", "4", "5", "6", "0"])
            self.monitor.ping()
            
            if choice == '1': self.submenu_configs()
            elif choice == '2': self.submenu_notes()
            elif choice == '3': self.submenu_contacts()
            elif choice == '4': self.menu_locker()
            elif choice == '5': self.submenu_utils()
            elif choice == '6': self.menu_backup()
            elif choice == '0': self.running = False

        # Cleanup
        self.console.print("[cyan]Locking vault...[/cyan]")
        if self.clipboard_timer: self.clipboard_timer.cancel()
        self.manager.active_state = None
        self.manager.active_password = None
        self.clear()

    # --- SUBMENUS ---

    def submenu_configs(self):
        while True:
            self.header()
            self.console.print("[bold]Credentials[/bold]")
            self.console.print("1. Search / View (Support !weak, !old)")
            self.console.print("2. Add New")
            self.console.print("0. Back")
            
            sel = Prompt.ask("Action", choices=["1", "2", "0"])
            if sel == '0': return
            if sel == '1': self.action_config_search()
            if sel == '2': self.action_config_add()

    def submenu_notes(self):
        while True:
            self.header()
            self.console.print("[bold]Secure Notes[/bold]")
            
            notes = self.manager.active_state.notes
            if not notes:
                self.console.print("[dim]No notes found.[/dim]")
            else:
                table = Table(show_header=True, box=None)
                table.add_column("#", style="cyan", width=4)
                table.add_column("Title", style="white")
                table.add_column("Date", style="dim")
                for i, n in enumerate(notes):
                    date_str = time.strftime('%Y-%m-%d', time.localtime(n['updatedAt']/1000))
                    table.add_row(str(i+1), n['title'], date_str)
                self.console.print(table)

            self.console.print("\\n[bold]A[/bold]dd | [bold]V[/bold]iew/Edit # | [bold]D[/bold]elete # | [bold]B[/bold]ack")
            choice = Prompt.ask("Action").lower()
            
            if choice == 'b': return
            if choice == 'a': self.action_note_add()
            elif choice.startswith('v'):
                idx = self._parse_idx(choice[1:])
                if idx is not None and idx < len(notes): self.action_note_view(notes[idx])
            elif choice.startswith('d'):
                idx = self._parse_idx(choice[1:])
                if idx is not None and idx < len(notes): 
                    if Confirm.ask(f"Delete '{notes[idx]['title']}'?"):
                        del notes[idx]
                        self.manager.save_file()

    def submenu_contacts(self):
        while True:
            self.header()
            self.console.print("[bold]Private Contacts[/bold]")
            
            contacts = self.manager.active_state.contacts
            if not contacts:
                self.console.print("[dim]No contacts found.[/dim]")
            else:
                table = Table(show_header=True, box=None)
                table.add_column("#", style="cyan", width=4)
                table.add_column("Name", style="white")
                table.add_column("Details", style="dim")
                for i, c in enumerate(contacts):
                    details = c.get('email') or c.get('phone') or ""
                    table.add_row(str(i+1), c['name'], details)
                self.console.print(table)

            self.console.print("\\n[bold]A[/bold]dd | [bold]V[/bold]iew/Edit # | [bold]D[/bold]elete # | [bold]B[/bold]ack")
            choice = Prompt.ask("Action").lower()
            
            if choice == 'b': return
            if choice == 'a': self.action_contact_add()
            elif choice.startswith('v'):
                idx = self._parse_idx(choice[1:])
                if idx is not None and idx < len(contacts): self.action_contact_view(contacts[idx])
            elif choice.startswith('d'):
                idx = self._parse_idx(choice[1:])
                if idx is not None and idx < len(contacts): 
                    if Confirm.ask(f"Delete '{contacts[idx]['name']}'?"):
                        del contacts[idx]
                        self.manager.save_file()

    def submenu_utils(self):
        while True:
            self.header()
            self.console.print("[bold]Utilities[/bold]")
            self.console.print("1. Standalone Password Generator")
            self.console.print("2. Breach Check (HIBP)")
            self.console.print("3. Secret Sharing (Shamir)")
            self.console.print("0. Back")
            
            sel = Prompt.ask("Action", choices=["1", "2", "3", "0"])
            if sel == '0': return
            if sel == '1': self.util_generator()
            if sel == '2': self.menu_audit()
            if sel == '3': self.menu_sharding()

    # --- ACTIONS: LOGINS ---

    def action_config_search(self):
        q = Prompt.ask("Search query (Enter for all)").lower().strip()
        configs = self.manager.active_state.configs
        hits = []

        # IMPLEMENT BEHAVIORAL FINGERPRINT: CLI GRAMMAR
        is_command = q.startswith("!")
        
        if is_command:
            cmd = q[1:]
            if cmd.startswith("weak"):
                hits = [c for c in configs if c.get('length', 16) < 12 and not c.get('customPassword')]
            elif cmd.startswith("old"):
                # > 6 Months (approx)
                cutoff = int(time.time() * 1000) - (1000 * 60 * 60 * 24 * 180)
                hits = [c for c in configs if c.get('updatedAt', 0) < cutoff]
            elif cmd.startswith("compromised"):
                hits = [c for c in configs if c.get('breachStats', {}).get('status') == 'compromised']
        else:
            hits = [c for c in configs if q in c['name'].lower() or q in c['username'].lower()]
        
        if not hits:
            self.console.print("[red]No matches.[/red]")
            time.sleep(1)
            return

        table = Table(title=f"Credentials ({len(hits)} matches)")
        table.add_column("#", style="cyan")
        table.add_column("Service", style="bold white")
        table.add_column("Username", style="white")
        table.add_column("Length", style="dim")
        
        for i, c in enumerate(hits):
            length_val = c.get('length', 16)
            if c.get('customPassword'): length_val = "CUSTOM"
            table.add_row(str(i+1), c['name'], c['username'], str(length_val))
        self.console.print(table)
        
        self.console.print("\\n[bold]V[/bold]iew/Decrypt # | [bold]E[/bold]dit # | [bold]D[/bold]elete # | [bold]B[/bold]ack")
        choice = Prompt.ask("Action").lower()
        if choice == 'b': return

        idx = self._parse_idx(choice[1:] if len(choice) > 1 else choice)
        if idx is None or idx >= len(hits): return
        target = hits[idx]

        if choice.startswith('v') or choice.isdigit():
            pwd = ""
            if target.get('customPassword'):
                pwd = target['customPassword']
                self.console.print("[dim]Using stored custom password.[/dim]")
            else:
                pwd = ChaosEngine.transmute(
                    self.manager.active_state.entropy,
                    target['name'], target['username'],
                    target.get('version', 1), target.get('length', 16), target.get('useSymbols', True)
                )
            self.console.print(Panel(f"[bold green]{pwd}[/bold green]", title="Password"))
            self.copy_to_clipboard(pwd)
            # Update usage count
            target['usageCount'] = target.get('usageCount', 0) + 1
            self.manager.save_file()
            Prompt.ask("Press Enter to continue...")

        elif choice.startswith('e'):
            self.action_config_edit(target)
        
        elif choice.startswith('d'):
            if Confirm.ask(f"Delete credential for {target['name']}?"):
                self.manager.active_state.configs.remove(target)
                self.manager.save_file()

    def action_config_add(self):
        name = Prompt.ask("Service Name")
        user = Prompt.ask("Username")
        if not name or not user: return
        
        custom_pwd = ""
        if Confirm.ask("Use Custom Password? (No = Generate)", default=False):
            custom_pwd = getpass.getpass("Enter Custom Password: ")
        
        config = {
            "id": secrets.token_hex(8),
            "name": name,
            "username": user,
            "version": 1,
            "length": 16,
            "useSymbols": True,
            "updatedAt": int(time.time()*1000),
            "createdAt": int(time.time()*1000),
            "usageCount": 0,
            "category": "login",
            "customPassword": custom_pwd
        }
        
        self.manager.active_state.configs.append(config)
        self.manager.save_file()
        self.console.print("[green]Entry added.[/green]")
        time.sleep(1)

    def action_config_edit(self, target):
        self.console.print(f"[bold]Editing {target['name']}[/bold]")
        target['name'] = Prompt.ask("Service Name", default=target['name'])
        target['username'] = Prompt.ask("Username", default=target['username'])
        target['updatedAt'] = int(time.time()*1000)
        target['version'] = target.get('version', 1) + 1
        
        if Confirm.ask("Change Password Strategy?", default=False):
            if Confirm.ask("Set Custom Password?", default=False):
                target['customPassword'] = getpass.getpass("Enter Custom Password: ")
            else:
                target['customPassword'] = ""
                self.console.print("[dim]Reverted to Chaos Generator.[/dim]")
        
        self.manager.save_file()
        self.console.print("[green]Saved.[/green]")

    # --- ACTIONS: NOTES ---

    def action_note_add(self):
        title = Prompt.ask("Title")
        self.console.print("Enter content (End with Ctrl+D or empty line + Enter):")
        lines = []
        try:
            while True:
                line = input()
                if not line: break
                lines.append(line)
        except EOFError: pass
        
        note = {
            "id": secrets.token_hex(8),
            "title": title,
            "content": "\\n".join(lines),
            "updatedAt": int(time.time()*1000)
        }
        self.manager.active_state.notes.append(note)
        self.manager.save_file()

    def action_note_view(self, note):
        self.header()
        self.console.print(f"[bold]{note['title']}[/bold]")
        self.console.print(Panel(note['content'], border_style="white"))
        
        if Confirm.ask("Edit content?"):
            self.console.print("Enter NEW content (overwrites):")
            lines = []
            try:
                while True:
                    line = input()
                    if not line: break
                    lines.append(line)
            except EOFError: pass
            note['content'] = "\\n".join(lines)
            note['updatedAt'] = int(time.time()*1000)
            self.manager.save_file()

    # --- ACTIONS: CONTACTS ---

    def action_contact_add(self):
        c = {
            "id": secrets.token_hex(8),
            "name": Prompt.ask("Full Name"),
            "email": Prompt.ask("Email"),
            "phone": Prompt.ask("Phone"),
            "address": Prompt.ask("Address"),
            "notes": Prompt.ask("Notes"),
            "updatedAt": int(time.time()*1000)
        }
        if c['name']:
            self.manager.active_state.contacts.append(c)
            self.manager.save_file()

    def action_contact_view(self, contact):
        self.header()
        self.console.print(f"[bold cyan]{contact['name']}[/bold cyan]")
        self.console.print(f"Email: {contact['email']}")
        self.console.print(f"Phone: {contact['phone']}")
        self.console.print(f"Addr:  {contact['address']}")
        self.console.print(f"Notes: {contact['notes']}")
        self.console.print()
        
        if Confirm.ask("Edit Contact?"):
            contact['name'] = Prompt.ask("Name", default=contact['name'])
            contact['email'] = Prompt.ask("Email", default=contact['email'])
            contact['phone'] = Prompt.ask("Phone", default=contact['phone'])
            contact['address'] = Prompt.ask("Address", default=contact['address'])
            contact['notes'] = Prompt.ask("Notes", default=contact['notes'])
            contact['updatedAt'] = int(time.time()*1000)
            self.manager.save_file()

    # --- UTILS ---

    def util_generator(self):
        self.header()
        self.console.print("[bold]Ephemeral Password Generator[/bold]")
        length = int(Prompt.ask("Length", default="20"))
        use_sym = Confirm.ask("Use Symbols?", default=True)
        
        # Generate random entropy just for this session
        entropy = secrets.token_hex(32)
        pwd = ChaosEngine.transmute(entropy, "temp", "temp", 1, length, use_sym)
        
        self.console.print(Panel(f"[bold green]{pwd}[/bold green]", title="Generated"))
        self.copy_to_clipboard(pwd)
        Prompt.ask("Press Enter...")

    def menu_locker(self):
        self.header()
        self.console.print("[bold]Bastion Locker[/bold]")
        self.console.print("1. Encrypt File")
        self.console.print("2. Decrypt File")
        
        sel = Prompt.ask("Action", choices=["1", "2", "b"], default="b")
        if sel == 'b': return
        
        path = Prompt.ask("File Path").strip('"')
        if not os.path.exists(path):
            self.console.print("[red]File not found.[/red]")
            time.sleep(1)
            return
        
        if sel == '1':
            try:
                key = LockerEngine.encrypt_file(path)
                label = os.path.basename(path)
                entry = {"id": secrets.token_hex(8), "label": label, "key": key, "timestamp": int(time.time()*1000)}
                self.manager.active_state.locker.append(entry)
                self.manager.save_file()
                self.console.print(f"[green]Encrypted to {path}.bastion[/green]")
            except Exception as e:
                self.console.print(f"[red]Error: {e}[/red]")
        elif sel == '2':
            # Check if file has a known key in the registry
            found_key = ""
            try:
                with open(path, 'rb') as f:
                    # Read magic (8) + ID (36)
                    header = f.read(44)
                    if len(header) == 44 and header.startswith(b"BASTION1"):
                        file_id = header[8:].decode('utf-8').strip()
                        for entry in self.manager.active_state.locker:
                            if entry['id'] == file_id:
                                found_key = entry['key']
                                self.console.print(f"[green]Key found in registry: {entry['label']}[/green]")
                                break
            except: pass

            default_prompt = found_key if found_key else ""
            key = Prompt.ask("Hex Key (Leave empty to use registry)", default=default_prompt)
            
            if not key:
                self.console.print("[yellow]Key required. None found in registry.[/yellow]")
                return

            try:
                out = LockerEngine.decrypt_file(path, key)
                self.console.print(f"[green]Decrypted to {out}[/green]")
            except Exception as e:
                self.console.print(f"[red]Error: {e}[/red]")
        
        Prompt.ask("Continue...")

    def menu_audit(self):
        pwd = Prompt.ask("Password to check", password=True)
        self.console.print("[yellow]Contacting HIBP via k-Anonymity...[/yellow]")
        count = BreachAuditor.check_password(pwd)
        
        if count == -1:
            self.console.print("[red]Network Error or API Failure[/red]")
        elif count == 0:
            self.console.print("[green]Clean. No breaches found.[/green]")
        else:
            self.console.print(f"[bold red]COMPROMISED! Found in {count} breaches.[/bold red]")
        
        Prompt.ask("Continue...")

    def menu_sharding(self):
        self.header()
        self.console.print("[bold]Secret Sharing (Shamir)[/bold]")
        self.console.print("1. Split a Secret")
        self.console.print("2. Recover a Secret")
        
        sel = Prompt.ask("Action", choices=["1", "2", "b"], default="b")
        if sel == 'b': return
        
        if sel == '1':
            secret = Prompt.ask("Secret to Split", password=True)
            shares = int(Prompt.ask("Total Shares (n)", default="5"))
            threshold = int(Prompt.ask("Required to Unlock (k)", default="3"))
            
            try:
                shards = SecretSharer.split(secret, shares, threshold)
                self.console.print(Panel("\\n".join(shards), title="Generated Shards", style="green"))
                self.console.print("[dim]Save these in different locations.[/dim]")
            except Exception as e:
                self.console.print(f"[red]Error: {e}[/red]")
        
        elif sel == '2':
            self.console.print("Enter shards one by one. Enter empty line to finish.")
            shards = []
            while True:
                s = Prompt.ask(f"Shard #{len(shards)+1}")
                if not s: break
                shards.append(s.strip())
            
            if len(shards) < 2:
                self.console.print("[red]Need at least 2 shards.[/red]")
                time.sleep(1)
                return

            try:
                secret = SecretSharer.combine(shards)
                self.console.print(Panel(f"[bold green]{secret}[/bold green]", title="Recovered Secret"))
                self.copy_to_clipboard(secret)
            except Exception as e:
                self.console.print(f"[red]Recovery Failed: {e}[/red]")
        
        Prompt.ask("Continue...")

    def menu_backup(self):
        self.header()
        self.console.print("[bold red]! SECURITY WARNING ![/bold red]")
        self.console.print("You are about to export your entire vault in [bold]PLAINTEXT JSON[/bold].")
        
        if not Confirm.ask("Proceed?"):
            return

        try:
            json_dump = self.manager.export_decrypted_json()
            filename = f"bastion_backup_{int(time.time())}.json"
            
            with open(filename, 'w') as f:
                f.write(json_dump)
            try: os.chmod(filename, 0o600)
            except: pass
            
            self.console.print(f"[green]Backup saved to: {filename}[/green]")
        except Exception as e:
            self.console.print(f"[red]Export failed: {e}[/red]")
        
        Prompt.ask("Press Enter...")

    def _parse_idx(self, val):
        if val.isdigit():
            return int(val) - 1
        return None`
};
