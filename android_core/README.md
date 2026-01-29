
# Bastion Android: Installation Guide

This folder contains the complete, pre-structured Android module for the Bastion Secure Enclave.

## Fast Track Installation (Drag & Drop)

We have organized the files to match the standard Android Studio project structure. This allows you to simply copy the folder instead of creating files manually.

### Step 1: Create Project
1.  Open **Android Studio**.
2.  Create a **New Project**.
3.  Select **Phone and Tablet** -> **Empty Activity** (Compose).
4.  **Configuration:**
    *   **Name:** `Bastion`
    *   **Package name:** `com.bastion.os` (Must match exactly).
    *   **Language:** `Kotlin`
    *   **Build configuration:** `Kotlin DSL (build.gradle.kts)`
    *   Click **Finish**.
5.  Wait for the project to sync, then **Close Android Studio**.

### Step 2: Merge Files
1.  Navigate to your newly created project folder on your computer (usually `~/AndroidStudioProjects/Bastion`).
2.  Open the `app` folder inside your project.
3.  **Copy** the `app` folder from this directory (`android_core/app`).
4.  **Paste** it into your project folder, merging/overwriting the existing `app` folder.
    *   *Mac:* Click "Merge" or "Replace" if prompted.
    *   *Windows:* Confirm folder merges and file replacements.

### Step 3: Run
1.  Open **Android Studio** again.
2.  Allow Gradle to Sync.
3.  Connect your phone or start an Emulator.
4.  Click **Run** (Green Triangle).

---

## Directory Structure Verification

After copying, your project structure in Android Studio (Project View) should look like this:

```text
app
 ├── build.gradle.kts
 └── src
     └── main
         ├── AndroidManifest.xml
         └── java
             └── com
                 └── bastion
                     └── os
                         ├── MainActivity.kt
                         ├── core
                         │   └── BastionCrypto.kt
                         └── model
                             └── BastionModels.kt
```

If your structure matches this, the application will compile and run immediately.
