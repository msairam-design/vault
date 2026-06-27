// ============================================
// CSV HEADER NORMALIZATION (Supports UI format)
// ============================================
function normalizeHeader(header) {
    const map = {
        'title': 'title',
        'url': 'url',
        'username': 'username',
        'user name': 'username',
        'password': 'password',
        'email': 'email',
        'phone': 'phone',
        'notes': 'notes',
        'note': 'notes',
        'secret_label': 'secret_label',
        'secret label': 'secret_label',
        'secret number': 'secret_number',
        'secret_number': 'secret_number'
    };
    const lower = header.trim().toLowerCase();
    return map[lower] || lower;
}

// ============================================
// VAULT & ITEM CRUD (Full: Edit, CSV Import, JSON Backup/Restore)
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
    editingItemId = null;
    document.getElementById('edit-auth-section').style.display = 'none';
    document.getElementById('save-password-btn').textContent = 'Save';
    
    // Restore visibility of the "new secret" fields
    document.getElementById('add-secret').style.display = 'block';
    document.getElementById('add-secret-confirm').style.display = 'block';
    document.getElementById('secret-match-status').style.display = 'block';
    document.getElementById('add-secret-label').style.display = 'block';
    
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
    editingItemId = null;
    document.getElementById('edit-auth-section').style.display = 'none';
    document.getElementById('save-password-btn').textContent = 'Save';
    
// Ensure the "new secret" fields are visible (for Add flow)
    document.getElementById('add-secret').style.display = 'block';
    document.getElementById('add-secret-confirm').style.display = 'block';
    document.getElementById('secret-match-status').style.display = 'block';
    document.getElementById('add-secret-label').style.display = 'block';

    // Clear all fields
    document.getElementById('add-title').value = '';
    document.getElementById('add-url').value = '';
    document.getElementById('add-email').value = '';
    document.getElementById('add-username').value = '';
    document.getElementById('add-password').value = '';
    document.getElementById('add-phone').value = '';
    document.getElementById('add-notes').value = '';
    document.getElementById('add-secret').value = '';
    document.getElementById('add-secret-confirm').value = '';
    document.getElementById('edit-current-secret').value = '';
    document.getElementById('edit-new-secret').value = '';
    document.getElementById('edit-new-secret-confirm').value = '';
    document.getElementById('edit-change-secret-checkbox').checked = false;
    document.getElementById('edit-new-secret-section').style.display = 'none';
    
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

        const randomIndex = Math.floor(Math.random() * data.length);
        currentSelectedLabel = data[randomIndex].label;
        
        document.getElementById('add-secret-label').textContent = currentSelectedLabel;
        document.getElementById('secret-match-status').textContent = 'Enter the 8-digit number and confirm it.';
        document.getElementById('secret-match-status').style.color = '#94a3b8';
        
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
        statusMsg.style.color = '#f59e0b';
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        return;
    }

    if (cleanSecret === cleanConfirm) {
        statusMsg.textContent = '✅ Match confirmed!';
        statusMsg.style.color = '#22c55e';
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
    } else {
        statusMsg.textContent = '❌ Entries do not match. Please re-enter.';
        statusMsg.style.color = '#ef4444';
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
    }
}

function togglePasswordVisibility() {
    const input = document.getElementById('add-password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// --- SAVE PASSWORD (Handles both Add and Edit) ---
async function savePassword() {
    const title = document.getElementById('add-title').value.trim();
    const url = document.getElementById('add-url').value.trim();
    const email = document.getElementById('add-email').value.trim();
    const username = document.getElementById('add-username').value.trim();
    const phone = document.getElementById('add-phone').value.trim();
    const notes = document.getElementById('add-notes').value.trim();
    const plainPassword = document.getElementById('add-password').value;
    const secret = document.getElementById('add-secret').value;
    const confirm = document.getElementById('add-secret-confirm').value;

    // --- VALIDATION (Different for Add vs Edit) ---
    if (!title || !username) {
        alert('Title and Username are required.');
        return;
    }

    // If adding a NEW password, password and secret are mandatory
    if (!editingItemId) {
        if (!plainPassword) {
            alert('Password is required.');
            return;
        }
        if (!secret) {
            alert('Secret Number is required.');
            return;
        }
        const cleanSecret = secret.replace(/[^0-9]/g, '');
        if (cleanSecret.length !== 8) {
            alert('Secret must be exactly 8 digits.');
            return;
        }
        if (cleanSecret !== confirm.replace(/[^0-9]/g, '')) {
            alert('Secret entries do not match.');
            return;
        }
        if (!currentSelectedLabel) {
            alert('Error: No label selected. Please refresh and try again.');
            return;
        }
        if (!currentVaultId) {
            alert('Error: No vault selected.');
            return;
        }
    }

    // --- EDIT MODE ---
    if (editingItemId) {
        if (document.getElementById('edit-auth-section').dataset.verified !== 'true') {
            alert('Please enter the correct current 8-digit code to authorize changes.');
            return;
        }
        
        // Check if changing secret
        if (document.getElementById('edit-change-secret-checkbox').checked) {
            const newSecret = document.getElementById('edit-new-secret').value.replace(/[^0-9]/g, '');
            const newConfirm = document.getElementById('edit-new-secret-confirm').value.replace(/[^0-9]/g, '');
            if (newSecret.length !== 8 || newSecret !== newConfirm) {
                alert('New 8-digit codes do not match or are invalid.');
                return;
            }
            const newLabel = document.getElementById('edit-new-secret-section').dataset.newLabel;
            if (!newLabel) {
                alert('Error loading new label. Please refresh and try again.');
                return;
            }
            const newSalt = generateSalt();
            const newEncrypted = await encryptPassword(plainPassword || '', newSecret, newSalt);
            const { error } = await supabase
                .from('vault_items')
                .update({
                    title, url, phone, email_associated: email, username, notes,
                    encrypted_password: newEncrypted,
                    salt: newSalt,
                    secret_label: newLabel,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingItemId)
                .eq('user_id', currentUser.id);
            if (error) { alert('Error: ' + error.message); return; }
        } else {
            // Just update text fields, keep same secret
            const updateData = {
                title, url, phone, email_associated: email, username, notes,
                updated_at: new Date().toISOString()
            };
            
            // Only update password if user typed a new one
            if (plainPassword) {
                // Re-encrypt with existing secret
                const salt = document.getElementById('edit-auth-section').dataset.salt;
                const encrypted = await encryptPassword(plainPassword, 
                    document.getElementById('edit-current-secret').value.replace(/[^0-9]/g, ''), 
                    salt);
                updateData.encrypted_password = encrypted;
            }
            
            const { error } = await supabase
                .from('vault_items')
                .update(updateData)
                .eq('id', editingItemId)
                .eq('user_id', currentUser.id);
            if (error) { alert('Error: ' + error.message); return; }
        }
        
        // Reset edit state
        editingItemId = null;
        document.getElementById('edit-auth-section').style.display = 'none';
        document.getElementById('save-password-btn').textContent = 'Save';
        // Restore visibility of secret fields for Add flow
        document.getElementById('add-secret').style.display = 'block';
        document.getElementById('add-secret-confirm').style.display = 'block';
        document.getElementById('secret-match-status').style.display = 'block';
        document.getElementById('add-secret-label').style.display = 'block';
        alert('✅ Password updated successfully!');
        showDashboard();
        return;
    }

    // --- ADD MODE (Insert) ---
    const cleanSecret = secret.replace(/[^0-9]/g, '');
    const salt = generateSalt();
    const encrypted = await encryptPassword(plainPassword, cleanSecret, salt);

    const { error } = await supabase.from('vault_items').insert({
        user_id: currentUser.id,
        vault_id: currentVaultId,
        title: title,
        url: url,
        phone: phone,
        email_associated: email,
        username: username,
        notes: notes,
        encrypted_password: encrypted,
        iv: '',
        salt: salt,
        secret_label: currentSelectedLabel,
        encrypt_tag: 'Family'
    });

    if (error) {
        alert('Error saving password: ' + error.message);
        return;
    }

    document.getElementById('add-secret').value = '';
    document.getElementById('add-secret-confirm').value = '';
    document.getElementById('add-password').value = '';
    alert('✅ Password saved successfully!');
    showDashboard();
}

// ============================================
// EDIT PASSWORD (Requires Old 8-Digit Code)
// ============================================

async function editPassword(itemId) {
    editingItemId = itemId;
    const { data: item, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('id', itemId)
        .single();
    if (error || !item) { alert('Error fetching item.'); return; }

    // Populate the add screen fields
    document.getElementById('add-title').value = item.title || '';
    document.getElementById('add-url').value = item.url || '';
    document.getElementById('add-email').value = item.email_associated || '';
    document.getElementById('add-username').value = item.username || '';
    document.getElementById('add-phone').value = item.phone || '';
    document.getElementById('add-notes').value = item.notes || '';
    document.getElementById('add-password').value = ''; // Don't show plaintext password!
    document.getElementById('add-secret').value = '';
    document.getElementById('add-secret-confirm').value = '';
    document.getElementById('edit-current-secret').value = '';
    document.getElementById('edit-new-secret').value = '';
    document.getElementById('edit-new-secret-confirm').value = '';
    document.getElementById('edit-change-secret-checkbox').checked = false;
    document.getElementById('edit-new-secret-section').style.display = 'none';
    
// ===== ADD THESE TWO LINES =====
    // Hide the "new secret" fields (they are for Add Password flow only)
    document.getElementById('add-secret').style.display = 'none';
    document.getElementById('add-secret-confirm').style.display = 'none';
    document.getElementById('secret-match-status').style.display = 'none';
    document.getElementById('add-secret-label').style.display = 'none';

    // Show the edit authorization section
    const editSection = document.getElementById('edit-auth-section');
    editSection.style.display = 'block';
    document.getElementById('edit-current-label').textContent = item.secret_label;
    // FIX: Set the label on the main add screen too
    document.getElementById('add-secret-label').textContent = item.secret_label;
    
    // Store the current label and salt for validation
    editSection.dataset.salt = item.salt;
    editSection.dataset.encryptedPwd = item.encrypted_password;
    editSection.dataset.verified = 'false';
    
    // Reset the status
    document.getElementById('edit-auth-status').textContent = 'Enter the current 8-digit code to enable saving.';
    document.getElementById('edit-auth-status').style.color = '#94a3b8';
    
    // Change button text and disable it
    const saveBtn = document.getElementById('save-password-btn');
    saveBtn.textContent = 'Update Password';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.5';
    
    // Fetch a random new label for potential change
    fetchRandomLabelForEdit();
    
    // Show the add screen
    currentVaultId = item.vault_id;
    showScreen('add-screen');
}

async function fetchRandomLabelForEdit() {
    try {
        const { data, error } = await supabase.from('family_secrets').select('label');
        if (error) throw error;
        if (!data || data.length === 0) return;
        const random = data[Math.floor(Math.random() * data.length)];
        document.getElementById('edit-new-label').textContent = random.label;
        document.getElementById('edit-new-secret-section').dataset.newLabel = random.label;
    } catch (e) {
        console.error('Error fetching label for edit:', e);
    }
}

function validateEditAuthorization() {
    const editSection = document.getElementById('edit-auth-section');
    const currentSecret = document.getElementById('edit-current-secret').value.replace(/[^0-9]/g, '');
    const saveBtn = document.getElementById('save-password-btn');
    const statusMsg = document.getElementById('edit-auth-status');

    if (currentSecret.length !== 8) {
        statusMsg.textContent = '⏳ Enter exactly 8 digits to authorize.';
        statusMsg.style.color = '#94a3b8';
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        editSection.dataset.verified = 'false';
        return;
    }

    // Verify by attempting decryption
    const salt = editSection.dataset.salt;
    const encrypted = editSection.dataset.encryptedPwd;
    decryptPassword(encrypted, currentSecret, salt)
        .then(() => {
            statusMsg.textContent = '✅ Correct code! You can now update.';
            statusMsg.style.color = '#22c55e';
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            editSection.dataset.verified = 'true';
        })
        .catch(() => {
            statusMsg.textContent = '❌ Incorrect 8-digit code!';
            statusMsg.style.color = '#ef4444';
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            editSection.dataset.verified = 'false';
        });
}

function toggleEditSecretChange() {
    const checked = document.getElementById('edit-change-secret-checkbox').checked;
    document.getElementById('edit-new-secret-section').style.display = checked ? 'block' : 'none';
    if (checked) {
        fetchRandomLabelForEdit();
    }
}

function validateNewSecretMatch() {
    const secret = document.getElementById('edit-new-secret').value;
    const confirm = document.getElementById('edit-new-secret-confirm').value;
    const statusMsg = document.getElementById('edit-new-secret-status');

    const cleanSecret = secret.replace(/[^0-9]/g, '');
    const cleanConfirm = confirm.replace(/[^0-9]/g, '');

    if (cleanSecret.length === 0 && cleanConfirm.length === 0) {
        statusMsg.textContent = 'Confirm the new 8-digit code.';
        statusMsg.style.color = '#94a3b8';
        return;
    }

    if (cleanSecret.length !== 8) {
        statusMsg.textContent = `⚠️ Must be exactly 8 digits (currently ${cleanSecret.length}/8)`;
        statusMsg.style.color = '#f59e0b';
        return;
    }

    if (cleanSecret === cleanConfirm) {
        statusMsg.textContent = '✅ New code confirmed!';
        statusMsg.style.color = '#22c55e';
    } else {
        statusMsg.textContent = '❌ New codes do not match.';
        statusMsg.style.color = '#ef4444';
    }
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

// ============================================
// CSV BULK IMPORT
// ============================================

function showCsvImport() {
    // Show the CSV import modal
    const modal = document.getElementById('csv-import-modal');
    if (!modal) {
        alert('CSV import modal not found. Please check your HTML.');
        return;
    }
    modal.style.display = 'flex';
    
    // Load vaults into dropdown
    loadVaultDropdownForImport();
}

function closeCsvImport() {
    document.getElementById('csv-import-modal').style.display = 'none';
    document.getElementById('csv-file-input').value = '';
    document.getElementById('csv-status-message').textContent = '';
    document.getElementById('csv-import-progress').style.display = 'none';
    document.getElementById('csv-import-results').style.display = 'none';
}

async function loadVaultDropdownForImport() {
    const select = document.getElementById('csv-vault-select');
    select.innerHTML = '<option value="">Loading vaults...</option>';
    
    const { data, error } = await supabase
        .from('vaults')
        .select('id, name')
        .eq('user_id', currentUser.id)
        .order('name');
    
    if (error) {
        select.innerHTML = '<option value="">Error loading vaults</option>';
        return;
    }
    
    select.innerHTML = '<option value="">Select a vault...</option>';
    data.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.text = v.name;
        select.appendChild(opt);
    });
}

function handleCsvFileUpload() {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a CSV file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseCsvAndPreview(text);
    };
    reader.readAsText(file);
}

function parseCsvAndPreview(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
        alert('CSV must have a header row and at least one data row.');
        return;
    }
    
    // Normalize headers using the helper
    const rawHeaders = lines[0].split(',').map(h => h.trim());
    const headers = rawHeaders.map(normalizeHeader);
    
    const mandatory = ['title', 'username', 'password', 'secret_label', 'secret_number'];
    const missing = mandatory.filter(h => !headers.includes(h));
    if (missing.length > 0) {
        alert(`Missing mandatory columns: ${missing.join(', ')}. Please check your CSV header.\n\nYour headers: ${rawHeaders.join(', ')}`);
        return;
    }
    
    // Show preview
    const previewContainer = document.getElementById('csv-preview-container');
    previewContainer.innerHTML = '';
    
    let html = `<table class="csv-preview-table">
        <thead><tr>`;
    // Use raw headers for display (to match what the user typed)
    rawHeaders.forEach((h, idx) => {
        const isMandatory = mandatory.includes(headers[idx]);
        html += `<th class="${isMandatory ? 'mandatory' : 'optional'}">${h}</th>`;
    });
    html += `</tr></thead><tbody>`;
    
    // Show up to 5 rows
    const maxRows = Math.min(5, lines.length - 1);
    for (let i = 1; i <= maxRows; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        html += `<tr>`;
        rawHeaders.forEach((h, idx) => {
            const val = cols[idx] || '';
            html += `<td>${val}</td>`;
        });
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    html += `<p style="font-size:12px; color:#94a3b8; margin-top:8px;">Showing ${maxRows} of ${lines.length - 1} rows.</p>`;
    previewContainer.innerHTML = html;
    
    document.getElementById('csv-import-preview-section').style.display = 'block';
    document.getElementById('csv-import-progress').style.display = 'none';
    document.getElementById('csv-import-results').style.display = 'none';
    document.getElementById('csv-status-message').textContent = '✅ CSV parsed successfully! Select a vault and click "Start Import".';
    document.getElementById('csv-status-message').style.color = '#22c55e';
    
    // Store the parsed data (WITH normalized headers for import logic)
    document.getElementById('csv-import-modal').dataset.csvData = JSON.stringify({ 
        headers: headers,          // Normalized headers (for the import loop)
        rawHeaders: rawHeaders,    // Raw headers (for display)
        lines: lines.slice(1) 
    });
}

async function startCsvImport() {
    const vaultId = document.getElementById('csv-vault-select').value;
    if (!vaultId) {
        alert('Please select a vault to import into.');
        return;
    }
    
    const csvDataJson = document.getElementById('csv-import-modal').dataset.csvData;
    if (!csvDataJson) {
        alert('No CSV data loaded. Please upload a CSV file first.');
        return;
    }
    
    const { headers, lines } = JSON.parse(csvDataJson);
    
    const mandatory = ['title', 'username', 'password', 'secret_label', 'secret_number'];
    
    // Map header indexes
    const headerMap = {};
    headers.forEach((h, idx) => { headerMap[h] = idx; });
    
    // Check if all mandatory headers exist
    const missing = mandatory.filter(h => !(h in headerMap));
    if (missing.length > 0) {
        alert(`Missing mandatory columns: ${missing.join(', ')}. Please check your CSV header.`);
        return;
    }
    
    // Show progress
    document.getElementById('csv-import-progress').style.display = 'block';
    document.getElementById('csv-import-results').style.display = 'none';
    const progressBar = document.getElementById('csv-import-progress-bar');
    const progressText = document.getElementById('csv-import-progress-text');
    const statusMsg = document.getElementById('csv-status-message');
    
    let success = 0;
    let failures = 0;
    const failedRows = [];
    const errorDetails = []; // Store detailed error messages
    
    for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const rowNum = i + 2; // +2 for 0-index + header row
        
        const title = cols[headerMap['title']] || '';
        const username = cols[headerMap['username']] || '';
        const password = cols[headerMap['password']] || '';
        const secretLabel = cols[headerMap['secret_label']] || '';
        const secretNumber = cols[headerMap['secret_number']] || '';
        const url = cols[headerMap['url']] || '';
        const email = cols[headerMap['email']] || '';
        const phone = cols[headerMap['phone']] || '';
        const notes = cols[headerMap['notes']] || '';
        
        // --- Detailed Validation ---
        let errorReason = '';
        if (!title) errorReason = 'Missing Title';
        else if (!username) errorReason = 'Missing Username';
        else if (!password) errorReason = 'Missing Password';
        else if (!secretLabel) errorReason = 'Missing Secret Label';
        else if (!secretNumber) errorReason = 'Missing Secret Number';
        else {
            const cleanSecret = secretNumber.replace(/[^0-9]/g, '');
            if (cleanSecret.length !== 8) {
                errorReason = `Secret Number "${secretNumber}" is not exactly 8 digits (got ${cleanSecret.length})`;
            }
        }
        
        if (errorReason) {
            failures++;
            failedRows.push(rowNum);
            errorDetails.push(`Row ${rowNum}: ${errorReason}`);
            continue;
        }
        
        const cleanSecret = secretNumber.replace(/[^0-9]/g, '');
        
        // Check if the label exists in family_secrets
        const { data: existingLabel, error: labelCheckError } = await supabase
            .from('family_secrets')
            .select('label')
            .eq('label', secretLabel)
            .limit(1);
        
        if (labelCheckError) {
            failures++;
            failedRows.push(rowNum);
            errorDetails.push(`Row ${rowNum}: Label check error - ${labelCheckError.message}`);
            continue;
        }
        
        if (!existingLabel || existingLabel.length === 0) {
            // Insert the new label
            const { error: labelError } = await supabase
                .from('family_secrets')
                .insert({ label: secretLabel });
            if (labelError) {
                failures++;
                failedRows.push(rowNum);
                errorDetails.push(`Row ${rowNum}: Failed to insert label "${secretLabel}" - ${labelError.message}`);
                continue;
            }
        }
        
        // Encrypt the password
        let encrypted, salt;
        try {
            salt = generateSalt();
            encrypted = await encryptPassword(password, cleanSecret, salt);
        } catch (cryptoError) {
            failures++;
            failedRows.push(rowNum);
            errorDetails.push(`Row ${rowNum}: Encryption error - ${cryptoError.message}`);
            continue;
        }
        
        // Insert the item
        const { error: insertError } = await supabase.from('vault_items').insert({
            user_id: currentUser.id,
            vault_id: vaultId,
            title: title,
            url: url,
            phone: phone,
            email_associated: email,
            username: username,
            notes: notes,
            encrypted_password: encrypted,
            iv: '',
            salt: salt,
            secret_label: secretLabel,
            encrypt_tag: 'Family'
        });
        
        if (insertError) {
            failures++;
            failedRows.push(rowNum);
            errorDetails.push(`Row ${rowNum}: Database insert error - ${insertError.message}`);
        } else {
            success++;
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / lines.length) * 100);
        progressBar.value = progress;
        progressText.textContent = `${progress}% (${i + 1}/${lines.length})`;
    }
    
    // Show results
    document.getElementById('csv-import-progress').style.display = 'none';
    const resultsDiv = document.getElementById('csv-import-results');
    resultsDiv.style.display = 'block';
    
    let resultHtml = `
        ✅ Success: ${success} passwords imported.<br>
        ❌ Failed: ${failures} passwords (rows: ${failedRows.join(', ') || 'none'})
    `;
    
    if (errorDetails.length > 0) {
        resultHtml += `<br><br><strong>📋 Error Details:</strong><ul style="text-align:left; font-size:13px; margin-top:8px;">`;
        errorDetails.forEach(err => {
            resultHtml += `<li>${err}</li>`;
        });
        resultHtml += `</ul>`;
    }
    
    document.getElementById('csv-import-results-text').innerHTML = resultHtml;
    
    if (failures === 0) {
        statusMsg.textContent = '✅ All passwords imported successfully!';
        statusMsg.style.color = '#22c55e';
    } else {
        statusMsg.textContent = '⚠️ Import completed with some failures. Check the error details below.';
        statusMsg.style.color = '#f59e0b';
    }
}

// ============================================
// JSON BACKUP (Export)
// ============================================

async function exportBackup() {
    if (!currentUser) {
        alert('Please log in first.');
        return;
    }
    // === ADD THIS CONFIRMATION ===
    if (!confirm('📦 Export all your vaults and passwords?\n\nThis will download a JSON file containing ALL your encrypted data.\n\n⚠️ Keep this file safe! Anyone with this file and your 8-digit secrets can decrypt your passwords.')) {
        return;
    }

    try {
        // Fetch all vaults
        const { data: vaults, error: vaultError } = await supabase
            .from('vaults')
            .select('*')
            .eq('user_id', currentUser.id);
        if (vaultError) throw vaultError;
        
        // Fetch all shares
        const vaultIds = vaults.map(v => v.id);
        let shares = [];
        if (vaultIds.length > 0) {
            const { data: sharesData, error: sharesError } = await supabase
                .from('vault_shares')
                .select('*')
                .in('vault_id', vaultIds);
            if (!sharesError) shares = sharesData || [];
        }
        
        // Fetch all items
        let items = [];
        if (vaultIds.length > 0) {
            const { data: itemsData, error: itemsError } = await supabase
                .from('vault_items')
                .select('*')
                .in('vault_id', vaultIds);
            if (!itemsError) items = itemsData || [];
        }
        
        // Fetch all family secrets (labels)
        const { data: labels, error: labelsError } = await supabase
            .from('family_secrets')
            .select('label');
        if (labelsError) throw labelsError;
        
        const backupData = {
            version: '1.0',
            exported_at: new Date().toISOString(),
            user_email: currentUser.email,
            labels: labels.map(l => l.label),
            vaults: vaults,
            shares: shares,
            items: items
        };
        
        const json = JSON.stringify(backupData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Backup downloaded successfully!');
        
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting backup: ' + error.message);
    }
}

// ============================================
// JSON RESTORE (Import with Prefix)
// ============================================

function showRestoreBackup() {
    document.getElementById('restore-modal').style.display = 'flex';
    document.getElementById('restore-file-input').value = '';
    document.getElementById('restore-prefix-input').value = '';
    document.getElementById('restore-preview-container').innerHTML = '';
    document.getElementById('restore-status-message').textContent = 'Select a JSON backup file to restore.';
    document.getElementById('restore-status-message').style.color = '#94a3b8';
    document.getElementById('restore-start-btn').disabled = true;
    document.getElementById('restore-start-btn').style.opacity = '0.5';
}

function closeRestoreBackup() {
    document.getElementById('restore-modal').style.display = 'none';
    document.getElementById('restore-file-input').value = '';
    document.getElementById('restore-prefix-input').value = '';
    document.getElementById('restore-preview-container').innerHTML = '';
    document.getElementById('restore-status-message').textContent = '';
    document.getElementById('restore-start-btn').disabled = true;
    document.getElementById('restore-start-btn').style.opacity = '0.5';
    document.getElementById('restore-merge-mode').value = 'merge';
}

function handleRestoreFileUpload() {
    const fileInput = document.getElementById('restore-file-input');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a JSON backup file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            // Validate the backup structure
            if (!backupData.vaults || !backupData.items) {
                throw new Error('Invalid backup file: missing vaults or items.');
            }
            
            // Show preview
            const previewContainer = document.getElementById('restore-preview-container');
            previewContainer.innerHTML = `
                <p><strong>📊 Backup Summary:</strong></p>
                <ul style="list-style:none; padding:0; margin:8px 0;">
                    <li>📁 Vaults: ${backupData.vaults.length}</li>
                    <li>🔑 Items: ${backupData.items.length}</li>
                    <li>🏷️ Labels: ${backupData.labels ? backupData.labels.length : 'N/A'}</li>
                    <li>📅 Exported: ${backupData.exported_at || 'Unknown'}</li>
                    <li>👤 User: ${backupData.user_email || 'Unknown'}</li>
                </ul>
                <p style="font-size:12px; color:#94a3b8; margin-top:8px;">
                    ⚠️ ${backupData.items.length} passwords will be imported.
                </p>
            `;
            
            // Store the backup data
            document.getElementById('restore-modal').dataset.backupData = JSON.stringify(backupData);
            document.getElementById('restore-status-message').textContent = '✅ Backup loaded. Enter a unique prefix and click "Start Restore".';
            document.getElementById('restore-status-message').style.color = '#22c55e';
            
            // Enable the prefix input and start button
            document.getElementById('restore-prefix-input').disabled = false;
            validateRestorePrefix();
            
        } catch (error) {
            alert('Error reading backup file: ' + error.message);
            document.getElementById('restore-status-message').textContent = '❌ Invalid backup file. Please check the file format.';
            document.getElementById('restore-status-message').style.color = '#ef4444';
        }
    };
    reader.readAsText(file);
}

async function validateRestorePrefix() {
    const prefix = document.getElementById('restore-prefix-input').value.trim().toUpperCase();
    const startBtn = document.getElementById('restore-start-btn');
    const statusMsg = document.getElementById('restore-prefix-status');
    
    if (!prefix) {
        statusMsg.textContent = 'Enter a 2-4 digit unique prefix (e.g., OFF).';
        statusMsg.style.color = '#94a3b8';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }
    
    if (prefix.length < 2 || prefix.length > 4) {
        statusMsg.textContent = '⚠️ Prefix must be 2-4 characters.';
        statusMsg.style.color = '#f59e0b';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }
    
    if (!/^[A-Z0-9]+$/.test(prefix)) {
        statusMsg.textContent = '⚠️ Prefix must contain only letters and numbers.';
        statusMsg.style.color = '#f59e0b';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }
    
    // Check if prefix conflicts with existing labels
    const { data, error } = await supabase
        .from('family_secrets')
        .select('label')
        .ilike('label', `${prefix}_%`)
        .limit(1);
    
    if (error) {
        statusMsg.textContent = '⚠️ Error checking prefix availability.';
        statusMsg.style.color = '#ef4444';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }
    
    if (data && data.length > 0) {
        statusMsg.textContent = `❌ Prefix '${prefix}' is already used (found: ${data[0].label}). Please choose a different prefix.`;
        statusMsg.style.color = '#ef4444';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }
    
    statusMsg.textContent = `✅ Prefix '${prefix}' is available. All labels will be transformed to ${prefix}_LABEL.`;
    statusMsg.style.color = '#22c55e';
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
}

async function startRestoreBackup() {
    const prefix = document.getElementById('restore-prefix-input').value.trim().toUpperCase();
    const backupDataJson = document.getElementById('restore-modal').dataset.backupData;
    const mergeMode = document.getElementById('restore-merge-mode').value;
    
    if (!backupDataJson) {
        alert('No backup data loaded. Please select a file first.');
        return;
    }
    
    const backupData = JSON.parse(backupDataJson);
    
    // Confirm
    if (!confirm(`⚠️ This will import ${backupData.items.length} passwords.\n\nPrefix: ${prefix}\nMode: ${mergeMode === 'merge' ? 'Merge (rename duplicates)' : 'Overwrite (clear existing data)'}\n\nProceed?`)) {
        return;
    }
    
    try {
        // If overwrite mode, delete all existing data for this user
        if (mergeMode === 'overwrite') {
            if (!confirm('⚠️ Overwrite mode will DELETE ALL YOUR EXISTING VAULTS AND PASSWORDS. Are you sure?')) {
                return;
            }
            // Delete all items
            await supabase
                .from('vault_items')
                .delete()
                .eq('user_id', currentUser.id);
            // Delete all shares
            const { data: userVaults } = await supabase
                .from('vaults')
                .select('id')
                .eq('user_id', currentUser.id);
            if (userVaults && userVaults.length > 0) {
                const vaultIds = userVaults.map(v => v.id);
                await supabase
                    .from('vault_shares')
                    .delete()
                    .in('vault_id', vaultIds);
            }
            // Delete all vaults
            await supabase
                .from('vaults')
                .delete()
                .eq('user_id', currentUser.id);
        }
        
        // Get existing vaults for duplicate checking
        const { data: existingVaults } = await supabase
            .from('vaults')
            .select('id, name')
            .eq('user_id', currentUser.id);
        const existingNames = new Set(existingVaults?.map(v => v.name) || []);
        
        // Map old vault IDs to new vault IDs
        const vaultIdMap = {};
        
        // Process each vault
        for (const vault of backupData.vaults) {
            let vaultName = vault.name;
            let suffix = '';
            
            // Check for duplicate name
            if (existingNames.has(vaultName)) {
                if (mergeMode === 'merge') {
                    // Rename with prefix
                    suffix = ` (${prefix})`;
                    vaultName = vaultName + suffix;
                    let counter = 1;
                    while (existingNames.has(vaultName)) {
                        vaultName = vault.name + ` (${prefix} ${counter})`;
                        counter++;
                    }
                } else {
                    // Overwrite mode: skip if overwriting? Actually we already deleted.
                    continue;
                }
            }
            
            // Insert without selecting
                const { error: vaultError } = await supabase
                .from('vaults')
                .insert({
                    user_id: currentUser.id,
                    owner_email: currentUser.email,
                    name: vaultName,
                    is_shared: false
                })
               
            if (vaultError) throw vaultError;
            // Fetch the ID separately
               const { data: newVaultData, error: fetchError } = await supabase
    .from('vaults')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('name', vaultName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

if (fetchError) throw fetchError;
vaultIdMap[vault.id] = newVaultData.id;
            existingNames.add(vaultName);
            
            // Process shares for this vault
            const vaultShares = backupData.shares?.filter(s => s.vault_id === vault.id) || [];
            for (const share of vaultShares) {
                await supabase
                    .from('vault_shares')
                    .insert({
                        vault_id: newVault.id,
                        shared_with_email: share.shared_with_email,
                        permission: share.permission || 'read'
                    })
                    .select();
            }
            
            // Process items for this vault
            const vaultItems = backupData.items.filter(i => i.vault_id === vault.id);
            for (const item of vaultItems) {
                const salt = item.salt || generateSalt();
                // Transform the label with prefix
                const prefixedLabel = item.secret_label ? `${prefix}_${item.secret_label}` : `${prefix}_UNKNOWN`;
                
                // Insert the item (with transformed label)
                await supabase
                    .from('vault_items')
                    .insert({
                        user_id: currentUser.id,
                        vault_id: newVault.id,
                        title: item.title || 'Untitled',
                        url: item.url || '',
                        phone: item.phone || '',
                        email_associated: item.email_associated || '',
                        username: item.username || '',
                        notes: item.notes || '',
                        encrypted_password: item.encrypted_password,
                        iv: item.iv || '',
                        salt: salt,
                        secret_label: prefixedLabel,
                        encrypt_tag: item.encrypt_tag || 'Family'
                    });
                
                // Add the new prefixed label to family_secrets if not exists
                const { data: labelExists } = await supabase
                    .from('family_secrets')
                    .select('label')
                    .eq('label', prefixedLabel)
                    .limit(1);
                if (!labelExists || labelExists.length === 0) {
                    await supabase
                        .from('family_secrets')
                        .insert({ label: prefixedLabel });
                }
            }
        }
        
        alert(`✅ Restore completed successfully!\n\n${backupData.items.length} passwords imported.\nDuplicates were ${mergeMode === 'merge' ? 'renamed' : 'replaced'}.`);
        closeRestoreBackup();
        showDashboard();
        
    } catch (error) {
        console.error('Restore error:', error);
        alert('Error during restore: ' + error.message);
    }
}