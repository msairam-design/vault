// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://nvhaetvreopkktlxxdwg.supabase.co';   // <--- PASTE YOUR URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52aGFldHZyZW9wa2t0bHh4ZHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0Mzg3MDcsImV4cCI6MjA5NDAxNDcwN30.yjsQeAhjZfXYV_Od6lkdZCCBSgt00Z9Pb-9Ki-a79kA';              // <--- PASTE YOUR ANON KEY

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global State (Declared ONCE here) ---
let currentUser = null;
let currentVaultId = null;          // Used in vault.js
let currentSelectedLabel = null;    // Used in vault.js
let currentEditVaultId = null;      // Used in vault.js (sharing)
let currentDecryptItemId = null;    // Used in ui.js
let editingItemId = null;           // Used in vault.js (edit mode)
let decryptAttempts = parseInt(sessionStorage.getItem('decryptAttempts') || '0');
let decryptLockoutUntil = parseInt(sessionStorage.getItem('decryptLockoutUntil') || '0');
let revealTimer = null;             // Used in ui.js
let revealedPlainText = '';         // Used in ui.js (hold-to-view)