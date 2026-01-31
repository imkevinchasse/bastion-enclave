
#!/usr/bin/env python3
"""
BASTION SECURE ENCLAVE // PYTHON RUNTIME
v3.5.0

[MISSION]
"If the web disappears, Bastion still works."

[EXECUTION]
bastion             # Launch Interactive Shell
bastion --version   # Check Version
bastion update      # Update to latest
bastion -gui        # Launch GUI Mode
"""

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
    print("\nIf you installed manually, did you run 'pip install -r requirements.txt'?")
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
        print("\n\n[!] Force Exit. Memory wiped.")
        sys.exit(0)
    except Exception as e:
        print(f"\n[CRITICAL] Runtime Crash: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
