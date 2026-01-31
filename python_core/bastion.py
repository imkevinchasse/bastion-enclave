
#!/usr/bin/env python3
"""
BASTION SECURE ENCLAVE // PYTHON RUNTIME
v3.5.0

[MISSION]
"If the web disappears, Bastion still works."

[EXECUTION]
pip install -r requirements.txt
python3 bastion.py
"""

import sys
import os

# Ensure src is in python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

try:
    from src.interface import BastionShell
except ImportError as e:
    print("CRITICAL ERROR: Failed to load Bastion Core Modules.")
    print(f"Details: {e}")
    print("\nDid you run 'pip install -r requirements.txt'?")
    sys.exit(1)

if __name__ == "__main__":
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
