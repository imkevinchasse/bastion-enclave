
import os
import sys
import time
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
from .features import ChaosEngine, LockerEngine, BreachAuditor

class BastionShell:
    def __init__(self):
        self.console = Console()
        self.manager = VaultManager()
        self.running = True

    def clear(self):
        os.system('cls' if os.name == 'nt' else 'clear')

    def header(self):
        self.clear()
        self.console.print(Panel.fit(
            "[bold cyan]BASTION SECURE ENCLAVE[/bold cyan]\n[dim]Python Runtime v2.8.0[/dim]",
            border_style="indigo"
        ))

    def copy_to_clipboard(self, text: str):
        if pyperclip:
            pyperclip.copy(text)
            self.console.print("[bold green]✓ Copied to clipboard[/bold green]")
        else:
            self.console.print("[yellow]! Clipboard module not found (pip install pyperclip)[/yellow]")

    def run(self):
        self.header()
        
        # LOGIN
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

        # MAIN LOOP
        while self.running:
            self.header()
            state = self.manager.active_state
            
            table = Table(show_header=False, box=None)
            table.add_row("[bold]1[/bold]", "Search Credentials")
            table.add_row("[bold]2[/bold]", "Add New Login")
            table.add_row("[bold]3[/bold]", "Edit Login")
            table.add_row("[bold]4[/bold]", "Bastion Locker (Files)")
            table.add_row("[bold]5[/bold]", "Breach Check (HIBP)")
            table.add_row("[bold]0[/bold]", "Lock & Exit")
            
            self.console.print(table)
            self.console.print(f"[dim]Stats: {len(state.configs)} Logins | {len(state.locker)} Files[/dim]")
            
            choice = Prompt.ask("Select", choices=["1", "2", "3", "4", "5", "0"])
            
            if choice == '1': self.menu_search()
            elif choice == '2': self.menu_add()
            elif choice == '3': self.menu_edit()
            elif choice == '4': self.menu_locker()
            elif choice == '5': self.menu_audit()
            elif choice == '0': self.running = False

    def menu_search(self):
        q = Prompt.ask("Search query").lower()
        configs = self.manager.active_state.configs
        hits = [c for c in configs if q in c['name'].lower() or q in c['username'].lower()]
        
        if not hits:
            self.console.print("[red]No matches.[/red]")
            time.sleep(1)
            return

        table = Table(title="Search Results")
        table.add_column("#", style="cyan")
        table.add_column("Service", style="bold white")
        table.add_column("Username", style="white")
        table.add_column("Type", style="dim")
        
        for i, c in enumerate(hits):
            ctype = "Custom" if c.get('customPassword') else "Generated"
            table.add_row(str(i+1), c['name'], c['username'], ctype)
        
        self.console.print(table)
        
        sel = Prompt.ask("Select # to reveal (Enter to cancel)", default="")
        if sel.isdigit() and 0 < int(sel) <= len(hits):
            target = hits[int(sel)-1]
            
            pwd = ""
            # CHECK FOR CUSTOM PASSWORD
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
            Prompt.ask("Press Enter to clear screen...")

    def menu_add(self):
        name = Prompt.ask("Service Name")
        user = Prompt.ask("Username")
        if not name or not user: return
        
        custom_pwd = ""
        if Confirm.ask("Use Custom Password?", default=False):
            custom_pwd = getpass.getpass("Enter Custom Password: ")
        
        config = {
            "id": secrets.token_hex(8),
            "name": name,
            "username": user,
            "version": 1,
            "length": 16,
            "useSymbols": True,
            "updatedAt": int(time.time()*1000),
            "customPassword": custom_pwd
        }
        
        self.manager.active_state.configs.append(config)
        self.manager.save_file()
        self.console.print("[green]Entry added.[/green]")
        time.sleep(1)

    def menu_edit(self):
        q = Prompt.ask("Search entry to edit").lower()
        configs = self.manager.active_state.configs
        hits = [c for c in configs if q in c['name'].lower() or q in c['username'].lower()]
        
        if not hits:
            self.console.print("[red]No matches.[/red]")
            time.sleep(1)
            return

        for i, c in enumerate(hits):
            self.console.print(f"[{i+1}] {c['name']} ({c['username']})")
            
        sel = Prompt.ask("Select #", default="")
        if not sel.isdigit() or not (0 < int(sel) <= len(hits)): return
        
        target = hits[int(sel)-1]
        
        # EDIT LOOP
        self.console.print(f"[bold]Editing {target['name']}[/bold]")
        new_name = Prompt.ask("Service Name", default=target['name'])
        new_user = Prompt.ask("Username", default=target['username'])
        
        target['name'] = new_name
        target['username'] = new_user
        target['updatedAt'] = int(time.time()*1000)
        target['version'] = target.get('version', 1) + 1 # Auto-rotate version on edit
        
        if Confirm.ask("Change Password Strategy?", default=False):
            if Confirm.ask("Set Custom Password?", default=False):
                target['customPassword'] = getpass.getpass("Enter Custom Password: ")
            else:
                target['customPassword'] = "" # Clear custom to use generator
                self.console.print("[dim]Reverted to Chaos Generator.[/dim]")

        self.manager.save_file()
        self.console.print("[green]Entry updated.[/green]")
        time.sleep(1)

    def menu_locker(self):
        self.header()
        self.console.print("[bold]Bastion Locker[/bold]")
        self.console.print("1. Encrypt File")
        self.console.print("2. Decrypt File")
        
        sel = Prompt.ask("Action", choices=["1", "2", "b"], default="b")
        if sel == 'b': return
        
        path = Prompt.ask("File Path").strip('"')
        
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
            key = Prompt.ask("Hex Key (Leave empty to search registry)", default="")
            # Logic to find key if empty omitted for brevity, assumes manual entry or simple search
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
