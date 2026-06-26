// ============================================
// UI RENDERER & DECRYPT LOGIC (24 Labels)
// ============================================

// --- Rate Limiting Variables ---

let decryptAttempts = parseInt(sessionStorage.getItem('decryptAttempts') || '0');
let decryptLockoutUntil = parseInt(sessionStorage.getItem('decryptLockoutUntil') || '0');
let revealTimer = null;

// --- UTILITY: Safe text sanitization ---
function safeHtml(text) {
    if (!text) return '';
    return DOMPurify.sanitize(text);
}

// --- NAVIGATION ---
async function showDashboard() {
    showScreen('dashboard-screen');
    await renderVaults();
}

// --- RENDER VAULTS (Uses secret_label instead of question_id) ---
async function renderVaults() {
    const container = document.getElementById('vault-list');
    container.innerHTML = '<div class="empty-state">Loading...</div>';

    try {
        const { data: ownVaults, error: ownError } = await supabase
            .from('vaults')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (ownError) throw ownError;

        const currentUserEmail = currentUser.email;
        const { data: shareRecords, error: shareError } = await supabase
            .from('vault_shares')
            .select('vault_id')
            .eq('shared_with_email', currentUserEmail);
        if (shareError) throw shareError;

        let sharedVaults = [];
        if (shareRecords && shareRecords.length > 0) {
            const sharedIds = shareRecords.map(r => r.vault_id);
            if (sharedIds.length > 0) {
                const { data: sharedData, error: sharedDataError } = await supabase
                    .from('vaults')
                    .select('*')
                    .in('id', sharedIds)
                    .order('created_at', { ascending: false });
                if (sharedDataError) throw sharedDataError;
                sharedVaults = sharedData || [];
            }
        }

        const ownVaultIds = ownVaults?.map(v => v.id) || [];
        let ownerShares = [];
        if (ownVaultIds.length > 0) {
            const { data: sharesMade, error: sharesMadeError } = await supabase
                .from('vault_shares')
                .select('vault_id')
                .in('vault_id', ownVaultIds);
            if (!sharesMadeError) {
                ownerShares = sharesMade || [];
            }
        }

        const allVaults = [...(ownVaults || [])];
        const ownIds = new Set(ownVaults?.map(v => v.id) || []);
        for (let v of sharedVaults) {
            if (!ownIds.has(v.id)) {
                allVaults.push(v);
            }
        }

        if (allVaults.length === 0) {
            container.innerHTML = '<div class="empty-state">📂 No vaults yet. Create one above!</div>';
            return;
        }

        const sharedVaultIds = new Set(ownerShares.map(s => s.vault_id));
        let html = '';

        for (let vault of allVaults) {
            const isOwner = vault.user_id === currentUser.id;
            let badgeText = '';
            if (isOwner) {
                badgeText = sharedVaultIds.has(vault.id) ? '🔗 Shared' : '🔒 Private';
            } else {
                const ownerEmail = vault.owner_email || vault.user_id;
                badgeText = `🔗 Shared by ${safeHtml(ownerEmail)}`;
            }

            const safeVaultName = safeHtml(vault.name);

            html += `<div class="vault-card">
                <div class="vault-header" data-vault-id="${vault.id}">
                    <div>
                        <span class="vault-name">${safeVaultName}</span>
                        <span class="vault-badge">${badgeText}</span>
                    </div>
                    <div class="vault-actions">
                        ${isOwner ? `<button class="share-btn" data-vault-id="${vault.id}" data-vault-name="${safeVaultName}">Share</button>` : ''}
                        ${isOwner ? `<button class="add-item-btn" data-vault-id="${vault.id}">+ Add</button>` : ''}
                        ${isOwner ? `<button class="delete-vault-btn" data-vault-id="${vault.id}" style="background:#ef4444;">✕</button>` : ''}
                    </div>
                </div>
                <div class="vault-items" id="items-${vault.id}">
                    <div class="empty-state">Click to load items</div>
                </div>
            </div>`;
        }
        container.innerHTML = html;

    } catch (error) {
        console.error('Render error:', error);
        container.innerHTML = '<div class="empty-state">❌ Error loading vaults. Please refresh.</div>';
    }
}

// --- TOGGLE VAULT EXPANSION (Uses secret_label) ---
async function toggleVault(vaultId) {
    const itemsContainer = document.getElementById(`items-${vaultId}`);
    if (!itemsContainer) return;
    
    if (itemsContainer.classList.contains('expanded')) {
        itemsContainer.classList.remove('expanded');
        return;
    }

    itemsContainer.classList.add('expanded');
    itemsContainer.innerHTML = '<div class="empty-state">Loading...</div>';

    const { data: items, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false });

    if (error || !items || items.length === 0) {
        itemsContainer.innerHTML = '<div class="empty-state">🔒 No passwords in this vault.</div>';
        return;
    }

    let html = '';
    items.forEach(item => {
        // Use secret_label instead of question_id
        const label = item.secret_label || 'Unknown';
        const safeTitle = safeHtml(item.title);
        const safeUsername = safeHtml(item.username || '');
        const safeUrl = safeHtml(item.url || '');
        const safeLabel = safeHtml(label);
        
        html += `<div class="pw-item">
            <div class="pw-info">
                <div class="pw-title">${safeTitle}</div>
                <div class="pw-detail">${safeUsername} ${safeUrl ? '| ' + safeUrl : ''}</div>
                <div style="font-size:10px; color:#94a3b8;">🔑 ${safeLabel}</div>
            </div>
            <div class="pw-actions">
                <button class="show-btn" data-item-id="${item.id}" data-label="${safeLabel}">Show</button>
                <button class="del-btn" data-item-id="${item.id}">✕</button>
            </div>
        </div>`;
    });
    itemsContainer.innerHTML = html;
}

// ===== DECRYPT LOGIC (Shows: "Enter the 8-digit [LABEL]") =====
function openDecrypt(itemId, label) {
    if (Date.now() < decryptLockoutUntil) {
        const remaining = Math.ceil((decryptLockoutUntil - Date.now()) / 1000);
        alert(`⛔ Too many failed attempts. Locked for ${remaining} seconds.`);
        return;
    }
    currentDecryptItemId = itemId;
    // Display the label without the word "code" or "question"
    document.getElementById('decrypt-question-text').innerHTML = `Enter the 8-digit <strong>${safeHtml(label)}</strong>`;
    document.getElementById('decrypt-input').value = '';
    document.getElementById('decrypt-overlay').style.display = 'flex';
    document.getElementById('decrypt-input').focus();
}

function closeDecrypt() {
    document.getElementById('decrypt-overlay').style.display = 'none';
    currentDecryptItemId = null;
    document.getElementById('decrypt-input').value = '';
}

async function confirmDecrypt() {
    if (Date.now() < decryptLockoutUntil) {
        const remaining = Math.ceil((decryptLockoutUntil - Date.now()) / 1000);
        alert(`⛔ Too many failed attempts. Locked for ${remaining} seconds.`);
        closeDecrypt();
        return;
    }

    const secret = document.getElementById('decrypt-input').value;
    if (!secret) { alert('Please type the 8-digit number.'); return; }
    const cleanSecret = secret.replace(/[^0-9]/g, '');
    if (cleanSecret.length !== 8) {
        alert('Must be exactly 8 digits.');
        return;
    }

    const { data: item, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('id', currentDecryptItemId)
        .single();

    if (error || !item) {
        alert('Error fetching item.');
        closeDecrypt();
        return;
    }

    try {
        const plain = await decryptPassword(item.encrypted_password, cleanSecret, item.salt);
        
        decryptAttempts = 0;
        sessionStorage.setItem('decryptAttempts', '0');
        
        document.getElementById('reveal-password').textContent = plain;
        document.getElementById('reveal-modal').style.display = 'flex';
        closeDecrypt();
        
        if (revealTimer) clearTimeout(revealTimer);
        let secondsLeft = 30;
        document.getElementById('reveal-timer-text').textContent = `Auto-clear in ${secondsLeft} seconds...`;
        revealTimer = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(revealTimer);
                closeRevealModal();
            } else {
                document.getElementById('reveal-timer-text').textContent = `Auto-clear in ${secondsLeft} seconds...`;
            }
        }, 1000);

    } catch (e) {
        decryptAttempts++;
        sessionStorage.setItem('decryptAttempts', decryptAttempts.toString());
        if (decryptAttempts >= 3) {
            decryptLockoutUntil = Date.now() + 300000;
            sessionStorage.setItem('decryptLockoutUntil', decryptLockoutUntil.toString());
            alert('⛔ Too many failed attempts. Locked for 5 minutes.');
        } else {
            alert(`❌ Incorrect 8-digit number! (Attempt ${decryptAttempts}/3)`);
        }
        closeDecrypt();
    }
}

function closeRevealModal() {
    document.getElementById('reveal-modal').style.display = 'none';
    document.getElementById('reveal-password').textContent = '';
    if (revealTimer) {
        clearInterval(revealTimer);
        revealTimer = null;
    }
    document.getElementById('reveal-timer-text').textContent = 'Auto-clear in 30 seconds...';
}

function copyPasswordToClipboard() {
    const pwd = document.getElementById('reveal-password').textContent;
    if (pwd && pwd !== 'PASSWORD') {
        navigator.clipboard.writeText(pwd).then(() => {
            alert('✅ Password copied!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = pwd;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('✅ Password copied!');
        });
    }
}

// ===== AUTO-LOCK & VISIBILITY =====
let inactivityTimer = null;
function resetTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (currentUser) {
            alert('🔒 Auto-locked due to 5 minutes of inactivity.');
            logout();
        }
    }, 5 * 60 * 1000);
}
document.addEventListener('click', resetTimer);
document.addEventListener('keydown', resetTimer);

document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentUser) {
        logout(); // Lock immediately on tab/app switch
    }
});

// ============================================
// GLOBAL EVENT DELEGATION
// ============================================
document.addEventListener('click', function(e) {
    // 1. Vault Header Toggle
    const header = e.target.closest('.vault-header');
    if (header && !e.target.closest('.vault-actions')) {
        const vaultId = header.dataset.vaultId;
        if (vaultId) toggleVault(vaultId);
        return;
    }

    // 2. Share Button
    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
        const vaultId = shareBtn.dataset.vaultId;
        const vaultName = shareBtn.dataset.vaultName;
        if (vaultId) showShareVault(vaultId, vaultName);
        return;
    }

    // 3. Add Item Button
    const addBtn = e.target.closest('.add-item-btn');
    if (addBtn) {
        const vaultId = addBtn.dataset.vaultId;
        if (vaultId) showAddPassword(vaultId);
        return;
    }

    // 4. Delete Vault Button
    const delVaultBtn = e.target.closest('.delete-vault-btn');
    if (delVaultBtn) {
        const vaultId = delVaultBtn.dataset.vaultId;
        if (vaultId) deleteVault(vaultId);
        return;
    }

    // 5. Show Password Button
    const showBtn = e.target.closest('.show-btn');
    if (showBtn) {
        const itemId = showBtn.dataset.itemId;
        const label = showBtn.dataset.label || 'Unknown';
        if (itemId) openDecrypt(itemId, label);
        return;
    }

    // 6. Delete Password Button
    const delBtn = e.target.closest('.del-btn');
    if (delBtn) {
        const itemId = delBtn.dataset.itemId;
        if (itemId) deleteItem(itemId);
        return;
    }

    // 7. Share Removal (delegated)
    const removeShare = e.target.closest('.remove-share');
    if (removeShare) {
        const shareId = removeShare.dataset.shareId;
        if (shareId) removeShare(shareId);
        return;
    }
});

// ============================================
// STATIC UI BUTTON EVENT BINDINGS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Login Screen
    document.getElementById('login-btn')?.addEventListener('click', login);
    document.getElementById('show-signup-link')?.addEventListener('click', showSignup);
    document.getElementById('show-forgot-link')?.addEventListener('click', showForgot);
    
    // Signup Screen
    document.getElementById('signup-btn')?.addEventListener('click', signup);
    document.getElementById('show-login-link')?.addEventListener('click', showLogin);
    
    // Forgot Screen
    document.getElementById('reset-btn')?.addEventListener('click', resetPassword);
    document.getElementById('back-to-login-link')?.addEventListener('click', showLogin);
    
    // Dashboard
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('create-vault-btn')?.addEventListener('click', showCreateVault);
    
    // Create Vault
    document.getElementById('confirm-create-vault-btn')?.addEventListener('click', createVault);
    document.getElementById('cancel-create-vault-btn')?.addEventListener('click', cancelCreateVault);
    
    // Add Password
    document.getElementById('save-password-btn')?.addEventListener('click', savePassword);
    document.getElementById('cancel-add-btn')?.addEventListener('click', cancelAdd);
    document.getElementById('toggle-password-visibility')?.addEventListener('click', togglePasswordVisibility);
    
    // Real-time validation for double entry
    document.getElementById('add-secret')?.addEventListener('input', validateSecretMatch);
    document.getElementById('add-secret-confirm')?.addEventListener('input', validateSecretMatch);
    
    // Share Vault
    document.getElementById('add-share-btn')?.addEventListener('click', addShare);
    document.getElementById('done-share-btn')?.addEventListener('click', cancelShare);
    
    // Decrypt Overlay
    document.getElementById('confirm-decrypt-btn')?.addEventListener('click', confirmDecrypt);
    document.getElementById('cancel-decrypt-btn')?.addEventListener('click', closeDecrypt);
    
    // Reveal Modal
    document.getElementById('copy-password-btn')?.addEventListener('click', copyPasswordToClipboard);
    document.getElementById('close-reveal-btn')?.addEventListener('click', closeRevealModal);

    // Enter key support
    document.getElementById('login-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') login();
    });
    document.getElementById('signup-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') signup();
    });
    document.getElementById('decrypt-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmDecrypt();
    });
});

// ===== INIT =====
(async function init() {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'reload') {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            await supabase.auth.signOut();
            currentUser = null;
            showLogin();
            document.getElementById('loading-screen').style.display = 'none';
            return;
        }
    }

    const loadingScreen = document.getElementById('loading-screen');
    const { data } = await supabase.auth.getSession();
    
    if (data.session) {
        currentUser = data.session.user;
        showDashboard();
    } else {
        showLogin();
    }
    
    loadingScreen.style.display = 'none';
})();