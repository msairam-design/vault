# 🔐 Family Vault Password Manager

A secure, self-hosted password manager for families. Built with **Supabase** (PostgreSQL + Auth) and **Vanilla JavaScript** (no frameworks required).

\---

## ✨ Features

### Core Security

* **Zero-Knowledge Encryption** – Your encryption keys (8-digit numbers) never leave your device.
* **PBKDF2 with 600,000 iterations** + **AES-256-GCM** (Web Crypto API).
* **3 Failed Decryption Attempts** → 5-minute lockout.
* **Auto-Lock** after 5 minutes of inactivity.
* **Tab Switch Lock** – Auto-logout when switching browser tabs/windows.

### Password Management

* **Vaults (Folders)** – Organize passwords into custom categories.
* **24 Secret Labels** – Each password is protected by an 8-digit number tied to a random label (e.g., `SLEK`).
* **Double-Entry Validation** – Prevents typos when saving a new secret.
* **Edit Passwords** – Requires current 8-digit code to authorize changes.
* **Optional Secret Rotation** – Change the secret label and number during edit.
* **Notes Field** – Store OTP instructions, security questions.
* **Phone Field** – Store associated phone numbers.

### Sharing \& Collaboration

* **Vault-Level Sharing** – Share entire vaults with family members by email.
* **Read-Only Access** – Shared users can view passwords but cannot edit or delete.

### Bulk Operations

* **CSV Import** – Upload multiple passwords at once using a spreadsheet.
* **CSV Template Preview** – See exactly which columns are required (mandatory columns shown in RED).

### Backup \& Recovery

* **JSON Backup (Export)** – Download all your vaults and encrypted passwords.
* **JSON Restore (Import)** – Restore backups with a **unique 2-4 digit prefix** (e.g., `OFF`) to avoid label conflicts.
* **Offline Viewer** – Standalone HTML file to decrypt and view backups **without internet**.

### User Experience

* **Dark Mode** – Toggle between light and dark themes (saves preference to localStorage).
* **Hold-to-View Eye** – Press and hold the eye icon to reveal a password; release to hide it instantly.
* **Copy to Clipboard** – Copy passwords without displaying them on screen.
* **Mobile-Friendly** – Responsive design works on phones, tablets, and laptops.

\---

## 📋 Prerequisites

* A **Supabase** account ([sign up for free](https://supabase.com)).
* **VS Code** with the **Live Server** extension (or any static web server).
* A modern browser (Chrome, Edge, Firefox, Safari).

\---

## 🚀 Step-by-Step Setup Guide

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in.
2. Click **"New Project"**.
3. Enter a name (e.g., `family-vault`).
4. Set a secure database password.
5. Choose a region close to you.
6. Wait for the database to initialize (2–3 minutes).

### Step 2: Run the Database Setup Script

1. In your Supabase dashboard, click **"SQL Editor"** in the left menu.
2. Click **"New Query"**.
3. Copy the entire contents of **`setup.sql`** (provided in this repository).
4. Paste it into the SQL Editor.
5. Click **"Run"**.
6. Wait for the confirmation message: `✅ Family Vault setup complete!`

### Step 3: Configure the App (`config.js`)

1. In your Supabase dashboard, go to **Settings** (gear icon) → **API**.
2. Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`).
3. Copy the **anon public** key (starts with `eyJ...`).
4. Open the `config.js` file in your project folder.
5. Replace the placeholders with your actual values:

```javascript
const SUPABASE\_URL = 'https://YOUR\_PROJECT\_ID.supabase.co';
const SUPABASE\_ANON\_KEY = 'YOUR\_ANON\_KEY\_HERE';
```

### Step 4: Run the App Locally

1. Open your project folder in **VS Code**.
2. Right-click on `index.html` and select **"Open with Live Server"**.
3. A browser tab will open automatically (usually `http://127.0.0.1:5500`).

### Step 5: Create Your First Account

1. Click **"Don't have an account? Sign Up"**.
2. Enter your email and a password (this is only for logging into the app—it is **not** used for encryption).
3. Click **"Create Account"**.
4. You are now logged in!

### Step 6: Create Your First Vault

1. Click **"+ New Vault"**.
2. Name your vault (e.g., "Banking").
3. Click **"Create"**.
4. Click on the vault card to expand it.

### Step 7: Add Your First Password

1. Click **"+ Add"** inside the vault.
2. Fill in the fields (Title, Username, Password).
3. You will see a random label (e.g., `SLEK`) with: **"Enter the 8-digit SLEK"**.
4. Type your 8-digit secret PIN (e.g., `12345678`) in **both** fields.
5. The **"Save"** button will turn green when both fields match.
6. Click **"Save"**.

> \*\*⚠️ Why 8 digits?\*\*  
> 4-digit PINs (e.g., `1234`) take \~33 minutes to brute-force.  
> 8-digit PINs (e.g., `12345678`) take \*\*\~2 hours\*\* to brute-force at 600,000 PBKDF2 iterations.

### Step 8: View a Password

1. Click **"Show"** next to a password.
2. The popup will ask: **"Enter the 8-digit SLEK"**.
3. Type the same 8-digit number.
4. Your password appears as `••••••••` (asterisks).
5. **To view:** Press and hold the 👁️ eye icon.
6. **To copy:** Click **"📋 Copy"** (copies silently).
7. **To close:** Click **"✕"**.

### Step 9: Edit a Password

1. Click the **"✏️ Edit"** button.
2. The form opens with existing data.
3. **To authorize changes:** Enter the **current 8-digit code** for the displayed label.
4. Update any fields (Title, Username, Password, etc.).
5. **Optional:** Check **"Change Secret Label and Number"** to rotate the encryption key.
6. Click **"Update Password"**.

> \*\*Note:\*\* The password field is intentionally blank for security. You only need to type a new password if you are changing it.

### Step 10: Share a Vault

1. On the vault card, click **"Share"**.
2. Enter the email address of a family member (they must have signed up first).
3. Click **"Add User"**.
4. When they log in, the shared vault will appear in their dashboard.

\---

## 📥 CSV Bulk Import

### Required CSV Format

Create a CSV file with these exact column headers (lowercase, no spaces):

```csv
title,url,username,password,email,phone,notes,secret\_label,secret\_number
HDFC Bank,hdfcbank.com,john\_doe,MySecurePwd123,john@gmail.com,919876543210,Use OTP from app,SLEK,12345678
Gmail,mail.google.com,john.doe,john@gmail.com,SecurePwd456,,,SKLE,87654321
```

|Column|Required|Description|
|-|-|-|
|`title`|✅ Yes|Name of the password|
|`url`|❌ No|Website URL|
|`username`|✅ Yes|Login ID|
|`password`|✅ Yes|The actual password (plaintext)|
|`email`|❌ No|Associated email|
|`phone`|❌ No|Associated phone number|
|`notes`|❌ No|Instructions (OTP, security questions)|
|`secret\_label`|✅ Yes|The 4-letter code (e.g., `SLEK`)|
|`secret\_number`|✅ Yes|The 8-digit number for that label|

### How to Import

1. In the dashboard, click the **"📥 CSV"** button.
2. Select your CSV file (the app shows a preview).
3. Select the target vault.
4. Click **"Start Import"**.

\---

## 📦 JSON Backup \& Restore

### Backup (Export)

1. Click **"📦 Backup"** in the dashboard.
2. Confirm the export.
3. A JSON file downloads: `family-vault-backup-YYYY-MM-DD.json`.

**What's in the backup?** All vaults, shares, encrypted items, salts, and labels.  
**The 8-digit numbers are NEVER stored.**

### Restore (Import)

1. Click **"📤 Restore"** in the dashboard.
2. Select a backup JSON file.
3. **Enter a unique 2-4 digit prefix** (e.g., `OFF` for Office, `FRN` for Friends).
4. Choose merge mode:

   * **Merge (Recommended):** Renames duplicate vaults (e.g., `Banking` → `Banking (OFF)`).
   * **Overwrite:** Deletes all existing data and replaces it.
5. Click **"Start Restore"**.

> \*\*How prefixes work:\*\*  
> If the backup has a label `BLUE` and you enter prefix `OFF`, it becomes `OFF\_BLUE`.  
> This prevents label conflicts when merging multiple backups (Family, Office, Friends).

\---

## 🔒 Offline Viewer

The `offline-viewer.html` file is a standalone page that decrypts backups **without any internet connection**.

**How to use:**

1. Double-click `offline-viewer.html` to open it in your browser.
2. Click the upload area and select a backup JSON file.
3. The app displays all vaults and passwords.
4. Click **"Show Password"** on any item.
5. Enter the 8-digit number for the displayed label.
6. The password is decrypted locally using the Web Crypto API.

\---

## 🛠️ Troubleshooting

**"Login hangs or doesn't load"**

* Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac).
* Clear browser cache.

**"Save button stays disabled"**

* Both fields must contain exactly **8 digits** (numbers only).
* The two entries must match exactly.

**"Incorrect secret number" on decrypt**

* You have 3 attempts before a 5-minute lockout.
* Wait 5 minutes and try again.
* Ensure you are typing the exact 8-digit number used when saving.

**"Missing mandatory columns" during CSV import**

* Ensure your CSV header matches: `title,url,username,password,email,phone,notes,secret\_label,secret\_number`.
* All columns must be in lowercase, with underscores.

**"Database insert error - Could not find the 'notes' column"**

* Run the latest `setup.sql` script in Supabase to add the missing column.

**"Policy violates row-level security" on restore**

* Ensure you are using the latest `vault.js`. The restore now splits INSERT and SELECT queries to avoid RLS timing issues.

**"Modals stay open after tab switch logout"**

* This is fixed in the latest `auth.js`. All modals are forcefully hidden during logout.

\---

## 🌐 Deployment (Free Hosting)

### Deploy to Netlify (2 minutes)

1. Push your code to a GitHub repository.
2. Go to [netlify.com](https://netlify.com) and sign in with GitHub.
3. Click **"Add new site"** → **"Import an existing project"**.
4. Select your `family-vault` repository.
5. Build settings: **Leave everything blank** (static HTML).
6. Click **"Deploy site"**.
7. Your app is live at `https://your-site-name.netlify.app`.

### Deploy to Vercel (2 minutes)

1. Push your code to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **"Add New"** → **"Project"**.
4. Select your `family-vault` repository.
5. Framework preset: **"Other"**.
6. Click **"Deploy"**.
7. Your app is live!

\---

## 📁 Project Structure

```
family-vault/
├── index.html              # Main app
├── style.css               # Styling (Dark Mode included)
├── config.js               # Supabase keys + global variables
├── encryption.js           # PBKDF2 + AES-GCM crypto
├── auth.js                 # Login, Signup, Logout
├── vault.js                # Vault/Password CRUD + Edit + CSV + Backup/Restore
├── ui.js                   # Rendering + Decrypt + Dark Mode
├── offline-viewer.html     # Standalone offline decryptor
├── setup.sql               # Database setup script
└── README.md               # This file
```

\---

## 🔐 Security Notes (Critical)

1. **Secret Numbers are the keys to your kingdom.**  
The app never stores your 8-digit numbers. If you forget one, the password is **permanently lost**. There is no backdoor.
2. **Use an 8-digit PIN for maximum security.**  
4-digit PINs (e.g., `1234`) are blocked. 8-digit PINs are exponentially harder to brute-force.
3. **The 24 labels (`SLKE`, `SLEK`, etc.) are randomly assigned by the app.**  
You and your family must agree on which label corresponds to which number (e.g., `SLEK` = `12345678`).
4. **Backup your vault regularly.**  
Use the **"📦 Backup"** button and store the JSON file in a safe place (e.g., encrypted USB drive).
5. **Keep your Supabase keys secure.**  
The `anon` key is public by design (safe as long as RLS is enabled). Never share your `service\_role` key.

\---

## 📜 License

This project is for private family/team use. Feel free to modify and deploy for your own family/teams.

\---

## 🧑‍💻 Tech Stack

|Layer|Technology|
|-|-|
|**Backend**|Supabase (PostgreSQL + Auth + Row Level Security)|
|**Frontend**|Vanilla JavaScript + HTML5 + CSS3|
|**Encryption**|PBKDF2 (600,000 iterations) + AES-256-GCM (Web Crypto API)|
|**Security**|DOMPurify (XSS Protection), Rate Limiting, Auto-Lock|
|**Deployment**|Netlify, Vercel, or any static web host|

\---

**Happy secure sharing! 🔐**

