
import os
import sys
import subprocess
import requests
from rich.console import Console
from rich.progress import track

REPO_URL = "https://raw.githubusercontent.com/imkevinchasse/bastion-enclave/main"

class BastionUpdater:
    def __init__(self):
        self.console = Console()

    def get_remote_version(self):
        try:
            # In a real scenario, we'd check a VERSION file. 
            # For this standalone demo, we simulate a check.
            # r = requests.get(f"{REPO_URL}/VERSION")
            return "3.5.0" 
        except:
            return None

    def perform_update(self, force=False):
        self.console.print("[bold cyan]Bastion Enclave Update System[/bold cyan]")
        
        # 1. Check Env
        install_dir = os.path.expanduser("~/.bastion")
        if not os.path.exists(install_dir):
            self.console.print("[yellow]Standard installation directory (~/.bastion) not found.[/yellow]")
            self.console.print("Cannot perform automatic update on portable/manual installs.")
            return

        self.console.print(f"Target: {install_dir}")
        self.console.print("Checking remote repository...")
        
        # Simulate network latency
        import time
        time.sleep(1)

        # 2. Re-run Installer (The robust way to update is to re-run the install script)
        try:
            installer_url = f"{REPO_URL}/install.sh"
            self.console.print(f"Fetching installer from {installer_url}...")
            
            # Fetch script
            r = requests.get(installer_url)
            if r.status_code != 200:
                self.console.print("[red]Failed to download update script.[/red]")
                return

            # Execute
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
                self.console.print("\n[bold green]✓ Update Successful[/bold green]")
                self.console.print("Please restart the shell.")
            else:
                self.console.print(f"[red]Update failed:[/red]\n{stderr}")

        except Exception as e:
            self.console.print(f"[red]Error during update: {e}[/red]")
