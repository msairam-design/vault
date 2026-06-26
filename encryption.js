// ============================================
// ENCRYPTION (PBKDF2 + AES-GCM)
// ============================================

async function getDerivedKey(secretNumber, salt) {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretNumber),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 600000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    return derivedKey;
}

function generateSalt() {
    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

async function encryptPassword(plainText, secretNumber, salt) {
    const key = await getDerivedKey(secretNumber, salt);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(plainText)
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function decryptPassword(cipherBase64, secretNumber, salt) {
    const key = await getDerivedKey(secretNumber, salt);
    const combined = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
    );
    return new TextDecoder().decode(decrypted);
}