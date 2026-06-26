// ============================================
// VAULT & ITEM CRUD (24 Labels + Double Entry)
// ============================================

// --- NAVIGATION ---
function showCreateVault() {
    document.getElementById('vault-name').value = '';
    showScreen('create-vault-screen');
}
function cancelCreateVault() {
    showDashboard();
}
function cancelAdd() {
    showDashboard();
}
function cancelShare() {
    showDashboard();
}

// --- CREATE VAULT ---
async function createVault() {
    const name = document.getElementById('vault-name').value.trim();
    if (!name) {
        alert('Please enter a vault name.');
        return;
    }
    const { error } = await supabase.from('vaults').insert({
        user_id: currentUser.id,
        owner_email: currentUser.email,
        name: name,
        is_shared: false
    });
    if (error) {
        alert('Error creating vault: ' + error.message);
        return;
    }
    document.getElementById('vault-name').value = '';
    showDashboard();
}

// --- DELETE VAULT ---
async function deleteVault(vaultId) {
    if (!confirm('Delete this vault and ALL passwords inside?')) return;
    const { error } = await supabase
        .from('vaults')
        .delete()
        .eq('id', vaultId)
        .eq('user_id', currentUser.id);
    if (error) {
        alert('Error: ' + error.message);
    } else {
        showDashboard();
    }
}

// ============================================
// ADD PASSWORD (Random Label + Double Entry)
// ============================================

function showAddPassword(vaultId) {
    currentVaultId = vaultId;
    // Clear all fields
    document.getElementById('add-title').value = '';
    document.getElementById('add-url').value = '';
    document.getElementById('add-email').value = '';
    document.getElementById('add-username').value = '';
    document.getElementById('add-password').value = '';
    document.getElementById('add-secret').value = '';
    document.getElementById('add-secret-confirm').value = '';
    document.getElementById('add-secret-label').textContent = 'Loading...';
    
    // Disable save button initially
    document.getElementById('save-password-btn').disabled = true;
    document.getElementById('save-password-btn').style.opacity = '0.5';
    document.getElementById('secret-match-status').textContent = '⏳ Loading a random label...';
    document.getElementById('secret-match-status').style.color = '#94a3b8';
    
    // Fetch a random label
    fetchRandomLabel();
    showScreen('add-screen');
}

// Fetch a random label from the 24 seeds in the database
async function fetchRandomLabel() {
    try {
        const { data, error } = await supabase
            .from('family_secrets')
            .select('label');

        if (error) throw error;
        if (!data || data.length === 0) {
            alert('No family secrets found. Please run the SQL seed script.');
            return;
        }

        // Pick a random label from the list
        const randomIndex = Math.floor(Math.random() * data.length);
        currentSelectedLabel = data[randomIndex].label;
        
        // Display it on the screen
        document.getElementById('add-secret-label').textContent = currentSelectedLabel;
        document.getElementById('secret-match-status').textContent = 'Enter the 8-digit number and confirm it.';
        document.getElementById('secret-match-status').style.color = '#94a3b8';
        
        // Reset validation
        validateSecretMatch();

    } catch (error) {
        console.error('Error fetching label:', error);
        document.getElementById('add-secret-label').textContent = 'Error loading label.';
        document.getElementById('secret-match-status').textContent = '❌ Please refresh and try again.';
        document.getElementById('secret-match-status').style.color = '#ef4444';
    }
}

// Validate that both fields match and are exactly 8 digits
function validateSecretMatch() {
    const secret = document.getElementById('add-secret').value;
    const confirm = document.getElementById('add-secret-confirm').value;
    const saveBtn = document.getElementById('save-password-btn');
    const statusMsg = document.getElementById('secret-match-status');

    // Remove non-digits for counting
    const cleanSecret = secret.replace(/[^0-9]/g, '');
    const cleanConfirm = confirm.replace(/[^0-9]/g, '');

    if (cleanSecret.length === 0 && cleanConfirm.length === 0) {
        statusMsg.textContent = 'Enter the 8-digit number and confirm it.';
        statusMsg.style.color = '#94a3b8';
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        return;
    }

    if (cleanSecret.length !== 8) {
        statusMsg.textContent = `⚠️ Must be exactly 8 digits (currently ${cleanSecret.length}/8)`;
        statusMsg.style.color = '#f59e0b'; // yellow-orange
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        return;
    }

    if (cleanSecret === cleanConfirm) {
        statusMsg.textContent = '✅ Match confirmed!';
        statusMsg.style.color = '#22c55e'; // green
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
    } else {
        statusMsg.textContent = '❌ Entries do not match. Please re-enter.';
        statusMsg.style.color = '#ef4444'; // red
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
    }
}

// Toggle password visibility
function togglePasswordVisibility() {
    const input = document.getElementById('add-password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// --- SAVE PASSWORD ---
async function savePassword() {
    const title = document.getElementById('add-title').value.trim();
    const url = document.getElementById('add-url').value.trim();
    const email = document.getElementById('add-email').value.trim();
    const username = document.getElementById('add-username').value.trim();
    const plainPassword = document.getElementById('add-password').value;
    const secret = document.getElementById('add-secret').value;
    const confirm = document.getElementById('add-secret-confirm').value;

    if (!title || !plainPassword || !secret) {
        alert('Title, Password, and Secret Number are required.');
        return;
    }
    if (!currentSelectedLabel) {
        alert('Error: No label selected. Please refresh and try again.');
        return;
    }

    // Extra validation (should already be enforced by the disabled button)
    const cleanSecret = secret.replace(/[^0-9]/g, '');
    if (cleanSecret.length !== 8) {
        alert('Secret must be exactly 8 digits.');
        return;
    }
    if (cleanSecret !== confirm.replace(/[^0-9]/g, '')) {
        alert('Secret entries do not match.');
        return;
    }
    if (!currentVaultId) {
        alert('Error: No vault selected.');
        return;
    }

    const salt = generateSalt();
    const encrypted = await encryptPassword(plainPassword, cleanSecret, salt);

    const { error } = await supabase.from('vault_items').insert({
        user_id: currentUser.id,
        vault_id: currentVaultId,
        title: title,
        url: url,
        phone: '',
        email_associated: email,
        username: username,
        encrypted_password: encrypted,
        iv: '',
        salt: salt,
        secret_label: currentSelectedLabel, // Store the label!
        encrypt_tag: 'Family'
    });

    if (error) {
        alert('Error saving password: ' + error.message);
        return;
    }

    // Clear sensitive fields
    document.getElementById('add-secret').value = '';
    document.getElementById('add-secret-confirm').value = '';
    document.getElementById('add-password').value = '';
    alert('✅ Password saved successfully!');
    showDashboard();
}

// --- DELETE ITEM (Defense in Depth) ---
async function deleteItem(itemId) {
    if (!confirm('Delete this password?')) return;
    const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', currentUser.id);
    if (error) {
        alert('Error: ' + error.message);
    } else {
        showDashboard();
    }
}

// ============================================
// SHARING
// ============================================

function showShareVault(vaultId, vaultName) {
    currentEditVaultId = vaultId;
    document.getElementById('share-vault-name').innerText = `Sharing: ${vaultName}`;
    document.getElementById('share-email-input').value = '';
    loadSharedUsers(vaultId);
    showScreen('share-vault-screen');
}

async function loadSharedUsers(vaultId) {
    const container = document.getElementById('shared-users-list');
    container.innerHTML = 'Loading...';
    
    const { data, error } = await supabase
        .from('vault_shares')
        .select('id, shared_with_email')
        .eq('vault_id', vaultId);

    if (error) {
        console.error('Load shares error:', error);
        container.innerHTML = 'Error loading shares.';
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8; font-size:14px;">No users shared yet.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(share => {
        const email = share.shared_with_email || 'Unknown';
        const span = document.createElement('span');
        span.className = 'shared-user-tag';
        span.textContent = email + ' ';
        
        const removeSpan = document.createElement('span');
        removeSpan.className = 'remove-share';
        removeSpan.textContent = '✕';
        removeSpan.dataset.shareId = share.id;
        removeSpan.style.cursor = 'pointer';
        removeSpan.style.marginLeft = '6px';
        removeSpan.style.fontWeight = 'bold';
        removeSpan.style.color = '#ef4444';
        
        span.appendChild(removeSpan);
        container.appendChild(span);
    });
}

async function addShare() {
    const email = document.getElementById('share-email-input').value.trim();
    if (!email) {
        alert('Enter an email.');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    const { error } = await supabase.from('vault_shares').insert({
        vault_id: currentEditVaultId,
        shared_with_email: email,
        permission: 'read'
    });

    if (error) {
        alert('Error sharing: ' + error.message);
        return;
    }

    document.getElementById('share-email-input').value = '';
    loadSharedUsers(currentEditVaultId);
}

async function removeShare(shareId) {
    if (!confirm('Remove this user\'s access?')) return;
    const { error } = await supabase
        .from('vault_shares')
        .delete()
        .eq('id', shareId);
    if (error) {
        alert('Error: ' + error.message);
    } else {
        loadSharedUsers(currentEditVaultId);
    }
}

// Event delegation for share removals (already handled in ui.js, but we keep this for safety)