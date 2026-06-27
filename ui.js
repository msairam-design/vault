// ============================================
// UI RENDERER & DECRYPT LOGIC (Hold-to-View Eye, Dark Mode)
// ============================================

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

// --- RENDER VAULTS ---
async function renderVaults() {
    const container = document.getElementById('vault-list');
    container.innerHTML = '<div class="empty-state">Loading...</div>';

    try {
        // 1. Fetch vaults OWNED by the user
        const { data: ownVaults, error: ownError } = await supabase
            .from('vaults')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (ownError) throw ownError;

        // 2. Fetch SHARED vaults with PERMISSIONS
        const currentUserEmail = currentUser.email;
        const { data: shareRecords, error: shareError } = await supabase
            .from('vault_shares')
            .select('vault_id, permission')
            .eq('shared_with_email', currentUserEmail);
        if (shareError) throw shareError;

        // Create a map: vault_id -> permission string (e.g., 'CRU')
        const permissionMap = {};
        if (shareRecords) {
            shareRecords.forEach(record => {
                permissionMap[record.vault_id] = record.permission || 'R';
            });
        }

        // 3. Fetch details for shared vaults
        let sharedVaults = [];
        const sharedIds = Object.keys(permissionMap);
        if (sharedIds.length > 0) {
            const { data: sharedData, error: sharedDataError } = await supabase
                .from('vaults')
                .select('*')
                .in('id', sharedIds)
                .order('created_at', { ascending: false });
            if (sharedDataError) throw sharedDataError;
            sharedVaults = sharedData || [];
        }

        // 4. Merge all vaults
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

        // 5. Fetch shares made by the user (to display "Shared" badge)
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
        const sharedVaultIds = new Set(ownerShares.map(s => s.vault_id));

        // 6. Render
        let html = '';
        for (let vault of allVaults) {
            const isOwner = vault.user_id === currentUser.id;
            const perm = permissionMap[vault.id] || '';
            
            // Determine badge
            let badgeText = '';
            if (isOwner) {
                badgeText = sharedVaultIds.has(vault.id) ? '🔗 Shared' : '🔒 Private';
            } else {
                const ownerEmail = vault.owner_email || vault.user_id;
                badgeText = `🔗 Shared by ${safeHtml(ownerEmail)}`;
            }

            const safeVaultName = safeHtml(vault.name);
            
            // Determine which buttons to show based on permissions
            const canAdd = isOwner || perm.includes('C');
            const canShare = isOwner || perm.includes('S');
            const canDeleteVault = isOwner; // Only owner can delete the vault itself

            html += `<div class="vault-card">
                <div class="vault-header" data-vault-id="${vault.id}">
                    <div>
                        <span class="vault-name">${safeVaultName}</span>
                        <span class="vault-badge">${badgeText}</span>
                    </div>
                    <div class="vault-actions">
                        ${canShare ? `<button class="share-btn" data-vault-id="${vault.id}" data-vault-name="${safeVaultName}">Share</button>` : ''}
                        ${canAdd ? `<button class="add-item-btn" data-vault-id="${vault.id}">+ Add</button>` : ''}
                        ${canDeleteVault ? `<button class="delete-vault-btn" data-vault-id="${vault.id}" style="background:#ef4444;">✕</button>` : ''}
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

// --- TOGGLE VAULT EXPANSION ---
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

    // Get the current user's permissions for this vault
    const currentUserEmail = currentUser.email;
    const { data: shareRecord } = await supabase
        .from('vault_shares')
        .select('permission')
        .eq('vault_id', vaultId)
        .eq('shared_with_email', currentUserEmail)
        .single();
    
    const perm = shareRecord?.permission || '';
    const isOwner = (await supabase.from('vaults').select('user_id').eq('id', vaultId).single()).data?.user_id === currentUser.id;
    
    const canEdit = isOwner || perm.includes('U');
    const canDelete = isOwner || perm.includes('D');

    let html = '';
    items.forEach(item => {
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
                ${canEdit ? `<button class="edit-btn" data-item-id="${item.id}" style="background:#f59e0b;">✏️</button>` : ''}
                ${canDelete ? `<button class="del-btn" data-item-id="${item.id}">✕</button>` : ''}
            </div>
        </div>`;
    });
    itemsContainer.innerHTML = html;
}

// ===== DECRYPT LOGIC (Hold-to-View Eye) =====
function openDecrypt(itemId, label) {
    if (decryptLockoutUntil && Date.now() < decryptLockoutUntil) {
        const remaining = Math.ceil((decryptLockoutUntil - Date.now()) / 1000);
        alert(`⛔ Too many failed attempts. Locked for ${remaining} seconds.`);
        return;
    }
    currentDecryptItemId = itemId;
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
    if (decryptLockoutUntil && Date.now() < decryptLockoutUntil) {
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
        
        revealedPlainText = plain;
        document.getElementById('reveal-password').textContent = '••••••••';
        document.getElementById('reveal-modal').style.display = 'flex';
        closeDecrypt();

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
    revealedPlainText = '';
    document.getElementById('reveal-password').textContent = '••••••••';
    if (revealTimer) {
        clearTimeout(revealTimer);
        revealTimer = null;
    }
}

function copyPasswordToClipboard() {
    if (revealedPlainText) {
        navigator.clipboard.writeText(revealedPlainText)
            .then(() => alert('✅ Password copied!'))
            .catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = revealedPlainText;
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
        logout();
    }
});

// ============================================
// GLOBAL EVENT DELEGATION
// ============================================
document.addEventListener('click', function(e) {
    // Vault Header Toggle
    const header = e.target.closest('.vault-header');
    if (header && !e.target.closest('.vault-actions')) {
        const vaultId = header.dataset.vaultId;
        if (vaultId) toggleVault(vaultId);
        return;
    }

    // Share Button
    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
        const vaultId = shareBtn.dataset.vaultId;
        const vaultName = shareBtn.dataset.vaultName;
        if (vaultId) showShareVault(vaultId, vaultName);
        return;
    }

    // Add Item Button
    const addBtn = e.target.closest('.add-item-btn');
    if (addBtn) {
        const vaultId = addBtn.dataset.vaultId;
        if (vaultId) showAddPassword(vaultId);
        return;
    }

    // Delete Vault Button
    const delVaultBtn = e.target.closest('.delete-vault-btn');
    if (delVaultBtn) {
        const vaultId = delVaultBtn.dataset.vaultId;
        if (vaultId) deleteVault(vaultId);
        return;
    }

    // Show Password Button
    const showBtn = e.target.closest('.show-btn');
    if (showBtn) {
        const itemId = showBtn.dataset.itemId;
        const label = showBtn.dataset.label || 'Unknown';
        if (itemId) openDecrypt(itemId, label);
        return;
    }

    // Edit Password Button
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
        const itemId = editBtn.dataset.itemId;
        if (itemId) editPassword(itemId);
        return;
    }

    // Delete Password Button
    const delBtn = e.target.closest('.del-btn');
    if (delBtn) {
        const itemId = delBtn.dataset.itemId;
        if (itemId) deleteItem(itemId);
        return;
    }

    // Share Removal
    const removeShare = e.target.closest('.remove-share');
    if (removeShare) {
        const shareId = removeShare.dataset.shareId;
        if (shareId) removeShare(shareId);
        return;
    }
});

// ===== EYE BUTTON: HOLD TO VIEW =====
document.addEventListener('DOMContentLoaded', function() {
    const eyeBtn = document.getElementById('reveal-eye-btn');
    if (eyeBtn) {
        // Mouse events
        eyeBtn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            document.getElementById('reveal-password').textContent = revealedPlainText || '••••••••';
        });
        eyeBtn.addEventListener('mouseup', function() {
            document.getElementById('reveal-password').textContent = '••••••••';
        });
        eyeBtn.addEventListener('mouseleave', function() {
            document.getElementById('reveal-password').textContent = '••••••••';
        });
        // Touch events for mobile
        eyeBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            document.getElementById('reveal-password').textContent = revealedPlainText || '••••••••';
        });
        eyeBtn.addEventListener('touchend', function() {
            document.getElementById('reveal-password').textContent = '••••••••';
        });
        eyeBtn.addEventListener('touchcancel', function() {
            document.getElementById('reveal-password').textContent = '••••••••';
        });
    }

    // Copy button
    document.getElementById('reveal-copy-btn')?.addEventListener('click', copyPasswordToClipboard);
    
    // Close reveal modal
    document.getElementById('close-reveal-btn')?.addEventListener('click', closeRevealModal);
    document.getElementById('close-reveal-btn-2')?.addEventListener('click', closeRevealModal);

    // Edit authorization validation
    document.getElementById('edit-current-secret')?.addEventListener('input', validateEditAuthorization);
    document.getElementById('edit-change-secret-checkbox')?.addEventListener('change', toggleEditSecretChange);
    document.getElementById('edit-new-secret')?.addEventListener('input', validateNewSecretMatch);
    document.getElementById('edit-new-secret-confirm')?.addEventListener('input', validateNewSecretMatch);

    // CSV Import
    document.getElementById('csv-file-input')?.addEventListener('change', handleCsvFileUpload);
    document.getElementById('csv-start-import-btn')?.addEventListener('click', startCsvImport);
    document.getElementById('csv-close-btn')?.addEventListener('click', closeCsvImport);
    document.getElementById('csv-cancel-btn')?.addEventListener('click', closeCsvImport);

    // Restore Backup
    document.getElementById('restore-file-input')?.addEventListener('change', handleRestoreFileUpload);
    document.getElementById('restore-prefix-input')?.addEventListener('input', validateRestorePrefix);
    document.getElementById('restore-start-btn')?.addEventListener('click', startRestoreBackup);
    document.getElementById('restore-close-btn')?.addEventListener('click', closeRestoreBackup);
    document.getElementById('restore-cancel-btn')?.addEventListener('click', closeRestoreBackup);

    // Dark Mode Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        }
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
});

// ===== STATIC UI BUTTON EVENT BINDINGS =====
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
    document.getElementById('export-backup-btn')?.addEventListener('click', exportBackup);
    document.getElementById('restore-backup-btn')?.addEventListener('click', showRestoreBackup);
    document.getElementById('import-csv-btn')?.addEventListener('click', showCsvImport);
    
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