# 🔐 Family Vault Password Manager

A secure, self-hosted password manager for families. Built with Supabase + Vanilla JavaScript.

## ✨ Features

- **24 Secret Labels** – Each password is protected by an 8-digit number tied to a random label (e.g., `SLEK`).
- **Double-Entry Validation** – Prevent typos by requiring you to enter the 8-digit number twice.
- **Vaults** – Organize passwords into folders (e.g., "Banking", "Netflix", "Work").
- **Sharing** – Share entire vaults with family members by email.
- **Zero-Knowledge** – Your encryption keys (the 8-digit numbers) never leave your device.
- **Auto-Lock** – Locks after 5 minutes of inactivity.
- **Rate Limited** – 3 failed decryption attempts = 5-minute lockout.

---

## 📋 Prerequisites

- A **Supabase** account (free tier works perfectly).
- **VS Code** with the **Live Server** extension (or any static web server).
- A modern browser (Chrome, Edge, Firefox).

---

## 🚀 Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in.
2. Click **"New Project"**.
3. Enter a name (e.g., `family-vault`).
4. Set a secure database password (save this somewhere safe).
5. Choose a region close to you.
6. Wait for the database to initialize (2–3 minutes).

---

## 🗄️ Step 2: Run the SQL Setup

1. In your Supabase dashboard, click **"SQL Editor"** in the left menu.
2. Click **"New Query"**.
3. Copy the entire contents of `setup.sql` (provided in this folder).
4. Paste it into the SQL Editor.
5. Click **"Run"**.
6. Wait for the confirmation message: `✅ Family Vault setup complete!`

---

## 🔑 Step 3: Configure the App (`config.js`)

1. In your Supabase dashboard, go to **Settings** (gear icon) → **API**.
2. Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`).
3. Copy the **anon public** key (starts with `eyJ...`).
4. Open the `config.js` file in your project folder.
5. Replace the placeholders with your actual values:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

💻 Step 4: Run the App Locally
Open your project folder in VS Code.

Right-click on index.html and select "Open with Live Server".

A browser tab will open automatically (usually http://127.0.0.1:5500).

👨‍👩‍👧‍👦 Step 5: Create Your First Account
Click "Don't have an account? Sign Up".

Enter your email and a password (this is only for logging into the app, not for encryption).

Click "Create Account".

You are now logged in!

📁 Step 6: Create Your First Vault and Password
Click "+ New Vault".

Name your vault (e.g., "Banking").

Click "Create".

Click on the vault to expand it.

Click "+ Add".

Fill in the Title, URL, Username, and the actual Password.

You will see a random label (e.g., SLEK) with the text: "Enter the 8-digit SLEK".

Type your 8-digit secret number (e.g., 19900215) in both fields.

The Save button will turn green when both fields match.

Click Save.

🔓 Step 7: View a Password
Click "Show" next to the password you just saved.

The popup will ask: "Enter the 8-digit SLEK".

Type the same 8-digit number you used when saving it.

Your password will appear in a secure modal (and auto-clear after 30 seconds).

👥 Step 8: Share a Vault with Family
On the vault card, click "Share".

Enter the email address of a family member (they must have signed up first).

Click "Add User".

When they log in, the shared vault will appear in their dashboard automatically.

🔒 Security Notes
Secret Numbers must be exactly 8 digits (e.g., 19900215, 20051231).

4-digit years (e.g., 1990) are blocked for security.

The app never stores your 8-digit numbers. They are used only locally to derive the encryption key.

If you forget an 8-digit number, the password is permanently lost. There is no backdoor.

The 24 labels (SLKE, SLEK, etc.) are randomly assigned by the app. You and your family must agree on which label corresponds to which date (e.g., SLEK = Mother's Birthday).

🛠️ Troubleshooting
"Login hangs or errors"

Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac).

Clear browser cache.

"Save button stays disabled"

Both fields must contain exactly 8 digits.

The two entries must match exactly.

"Incorrect secret number" on decrypt

You have 3 attempts before a 5-minute lockout.

Wait 5 minutes and try again.

Ensure you are typing the exact 8-digit number used when saving.

📁 Project Structure
text
family-vault/
├── index.html        # Main HTML file
├── style.css         # Styling
├── config.js         # Supabase keys + global variables
├── encryption.js     # PBKDF2 + AES-GCM crypto
├── auth.js           # Login, Signup, Logout
├── vault.js          # Vault/Password CRUD + Sharing
├── ui.js             # Rendering, Decrypt modal, Auto-lock
└── setup.sql         # Database setup script (for Supabase)
🧑‍💻 Tech Stack
Layer	Technology
Backend	Supabase (PostgreSQL + Auth + RLS)
Frontend	Vanilla JavaScript + HTML5 + CSS3
Encryption	PBKDF2 (600,000 iterations) + AES-256-GCM (Web Crypto API)
Security	CSP Headers, XSS Protection (DOMPurify), Rate Limiting
📜 License
This project is for private family use. Feel free to modify and deploy for your own family.