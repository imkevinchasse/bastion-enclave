
# Bastion Secure Enclave

![Bastion Banner](https://bastion.os/assets/screenshot-desktop.png)

> **"If the web disappears, Bastion still works."**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.8.0-green.svg)](package.json)
[![Security](https://img.shields.io/badge/Encryption-AES--256--GCM-lock.svg)](src/services/cryptoService.ts)
[![AI](https://img.shields.io/badge/AI-WebGPU%20Local-violet.svg)](src/services/llmService.ts)

**Bastion Enclave** is a sovereign, zero-knowledge identity vault. Unlike traditional password managers that store your data on a central cloud server, Bastion is an **offline-first protocol** that runs entirely within your device's memory. It combines deterministic password generation, military-grade file encryption, and on-device AI security auditing.

---

## 🛡️ Core Architecture

Bastion operates on a **Zero-Trust, Zero-Backend** architecture.

1.  **Volatile Memory:** Your unencrypted secrets exist only in RAM. Closing the application wipes them instantly.
2.  **Opaque Storage:** Data is persisted to disk/local storage only as an AES-256-GCM encrypted blob.
3.  **Client-Side AI:** The Neural Auditor (TinyLlama 1.1B) runs locally via WebGPU. Your passwords are never sent to an AI server.
4.  **No Tracking:** No analytics, no cookies, no external API calls (except for k-Anonymity breach checks).

---

## ⚡ Key Modules

### 1. Chaos Engine™ (Deterministic Generation)
Instead of storing passwords, Bastion computes them on the fly.
`Pass = HMAC-SHA512(MasterKey + Salt + Context)`
*   **Result:** You get the same complex password every time without it ever being written to a database.
*   **Tech:** PBKDF2 (210,000 Iterations) + Unbiased Rejection Sampling.

### 2. Bastion Locker (File Encryption)
A secure local file system for sensitive documents.
*   Files are encrypted in the browser before storage.
*   Unique 256-bit key per file.
*   **Ghost Mode:** Keys are synced via the encrypted vault, but heavy file payloads remain anchored to the specific device to save bandwidth.

### 3. Neural Auditor
An embedded Large Language Model that audits your credentials for semantic weaknesses.
*   Detects social engineering patterns in emails.
*   Analyzes passwords for context leaks (e.g., using your username inside your password).
*   **Powered by:** `@mlc-ai/web-llm` (WebGPU).

### 4. Shadow Rolodex
A graph-based encrypted contact manager for sensitive connections.

---
