// ============================================
// AUTHENTICATION (No Questions)
// ============================================

async function signup() {
    const email = document.getElementById('signup-email').value;
    const pwd = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    if (pwd !== confirm) {
        alert('Passwords do not match!');
        return;
    }
    if (pwd.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password: pwd });
    if (error) {
        if (error.message.includes('already registered')) {
            alert('This email is already registered. Please Login instead.');
        } else {
            alert('Signup Error: ' + error.message);
        }
        return;
    }
    alert('Account created! You can now login.');
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm').value = '';
    showLogin();
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        alert('Login Error: ' + error.message);
        return;
    }
    currentUser = data.user;
    document.getElementById('login-password').value = '';
    showDashboard();
}

async function resetPassword() {
    const email = document.getElementById('reset-email').value;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) { alert('Error: ' + error.message); return; }
    alert('Password reset email sent!');
    showLogin();
}

function logout() {
    supabase.auth.signOut();
    currentUser = null;
    showLogin();
}

// Screen navigation
function showLogin() {
    document.getElementById('login-password').value = '';
    showScreen('login-screen');
}
function showSignup() {
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm').value = '';
    showScreen('signup-screen');
}
function showForgot() {
    showScreen('forgot-screen');
}
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}