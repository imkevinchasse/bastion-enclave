
import os
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
            "[bold cyan]BASTION SECURE ENCLAVE[/bold cyan]\n"
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
        """Checks inactivity and locks if necessary."""
        if self.manager.active_state and self.monitor.is_expired():
            self.clear()
            self.console.print(Panel("[bold red]SESSION TIMEOUT[/bold red]\nVault locked due to inactivity.", border_style="red"))
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
            self.console.print(f"[dim]{counts}[/dim]\n")

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

            self.console.print("\n[bold]A[/bold]dd | [bold]V[/bold]iew/Edit # | [bold]D[/bold]elete # | [bold]B[/bold]ack")
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

            self.console.print("\n[bold]A[/bold]dd | [bold]V[/bold]iew/Edit # | [bold]D[/bold]elete # | [bold]B[/bold]ack")
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
        
        self.console.print("\n[bold]V[/bold]iew/Decrypt # | [bold]E[/bold]dit # | [bold]D[/bold]elete # | [bold]B[/bold]ack")
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
            "content": "\n".join(lines),
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
            note['content'] = "\n".join(lines)
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
                self.console.print(Panel("\n".join(shards), title="Generated Shards", style="green"))
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
        return None
