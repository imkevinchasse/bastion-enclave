
#!/usr/bin/env python3
"""
BASTION SECURE ENCLAVE (PYTHON RUNTIME)
v1.0.0

A modular, offline-first password manager and file encryptor.
Compatible with Bastion Protocol v2.6.

DEPENDENCIES:
  pip install cryptography

USAGE:
  python3 bastion.py [interactive|generate|encrypt|decrypt]
"""

import os
import sys
import json
import base64
import getpass
import secrets
import argparse
import time
from typing import List, Dict, Optional, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# --- CONFIGURATION ---
ITERATIONS = 100_000
MAGIC_BYTES = b"BASTION1"

# --- CORE CRYPTO MODULE ---

class BastionCrypto:
    @staticmethod
    def derive_key(password: str, salt: bytes, length: int = 32, algo=hashes.SHA256()) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=algo,
            length=length,
            salt=salt,
            iterations=ITERATIONS,
        )
        return kdf.derive(password.encode('utf-8'))

    @staticmethod
    def encrypt_vault(state: dict, password: str) -> str:
        salt = secrets.token_bytes(16)
        iv = secrets.token_bytes(12)
        
        # Salt is treated as raw bytes in Bastion Protocol
        key = BastionCrypto.derive_key(password, salt)
        aesgcm = AESGCM(key)
        
        plaintext = json.dumps(state).encode('utf-8')
        ciphertext = aesgcm.encrypt(iv, plaintext, None)
        
        # Blob Structure: SALT(16) | IV(12) | CIPHERTEXT
        blob = salt + iv + ciphertext
        return base64.b64encode(blob).decode('utf-8')

    @staticmethod
    def decrypt_vault(blob_b64: str, password: str) -> dict:
        try:
            data = base64.b64decode(blob_b64)
            if len(data) < 28:
                raise ValueError("Invalid blob size")
            
            salt = data[0:16]
            iv = data[16:28]
            ciphertext = data[28:]
            
            key = BastionCrypto.derive_key(password, salt)
            aesgcm = AESGCM(key)
            
            plaintext = aesgcm.decrypt(iv, ciphertext, None)
            return json.loads(plaintext.decode('utf-8'))
        except Exception as e:
            raise ValueError("Decryption failed. Wrong password or corrupted file.")

# --- CHAOS ENGINE (DETERMINISTIC PASSWORDS) ---

class ChaosEngine:
    ALPHA = "abcdefghijklmnopqrstuvwxyz"
    CAPS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    NUM = "0123456789"
    SYM = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    @staticmethod
    def transmute(entropy: str, service: str, username: str, version: int = 1, length: int = 16, symbols: bool = True) -> str:
        # Salt Construction: "FORTRESS_V1::service::username::v1"
        salt_str = f"FORTRESS_V1::{service.lower()}::{username.lower()}::v{version}"
        
        # Uses SHA-512 for higher entropy pool, matching JS/Android implementation
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA512(),
            length=512, # Large buffer
            salt=salt_str.encode('utf-8'),
            iterations=ITERATIONS,
        )
        flux_bytes = kdf.derive(entropy.encode('utf-8'))
        
        pool = ChaosEngine.ALPHA + ChaosEngine.CAPS + ChaosEngine.NUM
        if symbols:
            pool += ChaosEngine.SYM
            
        password = []
        for i in range(length):
            byte_val = flux_bytes[i % len(flux_bytes)]
            char_idx = byte_val % len(pool)
            password.append(pool[char_idx])
            
        return "".join(password)

# --- LOCKER ENGINE (FILE ENCRYPTION) ---

class Locker:
    @staticmethod
    def encrypt_file(filepath: str) -> str:
        if not os.path.exists(filepath):
            raise FileNotFoundError("File not found")
            
        with open(filepath, 'rb') as f:
            data = f.read()
            
        file_id = str(secrets.token_hex(18)) # 36 chars approx
        key = secrets.token_bytes(32)
        iv = secrets.token_bytes(12)
        
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(iv, data, None)
        
        # Header: MAGIC(8) | ID(36) | IV(12)
        id_bytes = f"{file_id:<36}".encode('utf-8')
        header = MAGIC_BYTES + id_bytes + iv
        
        out_path = filepath + ".bastion"
        with open(out_path, 'wb') as f:
            f.write(header + ciphertext)
            
        return f"ENCRYPTED: {out_path}\nKEY (SAVE THIS): {key.hex()}\nID: {file_id.strip()}"

    @staticmethod
    def decrypt_file(filepath: str, key_hex: str):
        if not os.path.exists(filepath):
            raise FileNotFoundError("File not found")
            
        with open(filepath, 'rb') as f:
            data = f.read()
            
        if len(data) < 56:
            raise ValueError("Corrupted file")
            
        magic = data[0:8]
        if magic != MAGIC_BYTES:
            raise ValueError("Not a Bastion file")
            
        # iv is at 44 (8+36)
        iv = data[44:56]
        ciphertext = data[56:]
        
        try:
            key = bytes.fromhex(key_hex.strip())
            aesgcm = AESGCM(key)
            plaintext = aesgcm.decrypt(iv, ciphertext, None)
            
            out_path = filepath.replace(".bastion", ".decrypted")
            with open(out_path, 'wb') as f:
                f.write(plaintext)
            print(f"SUCCESS: Decrypted to {out_path}")
        except Exception as e:
            print(f"ERROR: Decryption failed. {e}")

# --- CLI INTERFACE ---

def interactive_mode():
    print(r"""
    ____  ___   _____________  ____  _   __
   / __ )/   | / ___/_  __/ / / __ \/ | / /
  / __  / /| | \__ \ / / / / / / / /  |/ / 
 / /_/ / ___ |___/ // / / / / /_/ / /|  /  
/_____/_/  |_/____//_/ /_/  \____/_/ |_/   
    
    SECURE ENCLAVE (PYTHON)
    """)
    
    vault_state = None
    vault_pass = None
    
    while True:
        if not vault_state:
            print("\n[AUTH MENU]")
            print("1. Create New Vault")
            print("2. Open Vault (Paste Blob)")
            print("3. File Locker Tool (No Vault Needed)")
            print("q. Quit")
            
            choice = input("Select > ").strip().lower()
            
            if choice == '1':
                pwd = getpass.getpass("Set Master Password: ")
                if len(pwd) < 8:
                    print("Password too short.")
                    continue
                entropy = secrets.token_hex(32)
                vault_state = {"entropy": entropy, "configs": [], "version": 1}
                vault_pass = pwd
                print("Vault created in memory.")
                
            elif choice == '2':
                blob = input("Paste Vault Blob: ").strip()
                pwd = getpass.getpass("Master Password: ")
                try:
                    vault_state = BastionCrypto.decrypt_vault(blob, pwd)
                    vault_pass = pwd
                    print("Vault Unlocked.")
                except Exception as e:
                    print(f"Error: {e}")
            
            elif choice == '3':
                locker_menu()
                
            elif choice == 'q':
                sys.exit(0)
        
        else:
            print(f"\n[VAULT: v{vault_state.get('version', 0)}]")
            print("1. List Logins")
            print("2. Add Login")
            print("3. Get Password")
            print("4. Save & Export Blob")
            print("5. Lock (Logout)")
            
            choice = input("Select > ").strip()
            
            if choice == '1':
                print(f"\n{'SERVICE':<20} {'USERNAME':<30}")
                print("-" * 50)
                for c in vault_state.get("configs", []):
                    print(f"{c['name']:<20} {c['username']:<30}")
            
            elif choice == '2':
                name = input("Service Name: ")
                user = input("Username: ")
                length = int(input("Length (16): ") or 16)
                
                new_config = {
                    "id": secrets.token_hex(8),
                    "name": name,
                    "username": user,
                    "length": length,
                    "useSymbols": True,
                    "version": 1,
                    "updatedAt": int(time.time() * 1000)
                }
                vault_state.setdefault("configs", []).append(new_config)
                print("Added.")
                
            elif choice == '3':
                search = input("Search Service: ").lower()
                found = [c for c in vault_state.get("configs", []) if search in c['name'].lower()]
                if not found:
                    print("Not found.")
                    continue
                
                target = found[0]
                pwd = ChaosEngine.transmute(
                    vault_state['entropy'], 
                    target['name'], 
                    target['username'], 
                    target['version'], 
                    target['length'], 
                    target['useSymbols']
                )
                print(f"\nService: {target['name']}")
                print(f"Password: {pwd}")
                input("(Press Enter to clear screen)...")
                print("\033c", end="") # Simple clear
                
            elif choice == '4':
                vault_state['version'] = vault_state.get('version', 0) + 1
                vault_state['lastModified'] = int(time.time() * 1000)
                blob = BastionCrypto.encrypt_vault(vault_state, vault_pass)
                print("\n--- VAULT BLOB (COPY THIS) ---")
                print(blob)
                print("------------------------------")
                
            elif choice == '5':
                vault_state = None
                vault_pass = None

def locker_menu():
    print("\n[LOCKER]")
    print("1. Encrypt File")
    print("2. Decrypt File")
    print("b. Back")
    
    c = input("> ").strip().lower()
    if c == '1':
        path = input("File Path: ").strip().strip("'").strip('"')
        try:
            print(Locker.encrypt_file(path))
        except Exception as e:
            print(f"Error: {e}")
    elif c == '2':
        path = input("File Path (.bastion): ").strip().strip("'").strip('"')
        key = input("Hex Key: ").strip()
        Locker.decrypt_file(path, key)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bastion Secure Enclave")
    parser.add_argument('--mode', choices=['interactive'], default='interactive')
    args = parser.parse_args()
    
    try:
        interactive_mode()
    except KeyboardInterrupt:
        print("\nTerminated.")
