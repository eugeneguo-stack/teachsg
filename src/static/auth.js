let supabase;

// Initialize Supabase client
async function initSupabase() {
    try {
        // Fetch configuration from API
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();

        if (typeof window !== 'undefined' && window.supabase && config.supabaseUrl && config.supabaseAnonKey) {
            supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
            console.log('Supabase initialized successfully');
            return true;
        } else {
            console.error('Failed to initialize Supabase - missing configuration');
            showMessage('Configuration error. Please check your setup.', 'error');
            return false;
        }
    } catch (error) {
        console.error('Failed to load Supabase configuration:', error);
        showMessage('Failed to connect to authentication service.', 'error');
        return false;
    }
}

// Tab switching
function initTabSwitching() {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    loginTab.addEventListener('click', () => {
        loginTab.className = 'flex-1 py-2 px-4 rounded-md bg-white shadow text-blue-600 font-medium';
        signupTab.className = 'flex-1 py-2 px-4 rounded-md text-gray-600';
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    signupTab.addEventListener('click', () => {
        signupTab.className = 'flex-1 py-2 px-4 rounded-md bg-white shadow text-green-600 font-medium';
        loginTab.className = 'flex-1 py-2 px-4 rounded-md text-gray-600';
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });
}

// Show message
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';

    messageDiv.innerHTML = `
        <div class="${bgColor} text-white px-4 py-2 rounded-lg shadow-lg">
            ${text}
        </div>
    `;
    messageDiv.classList.remove('hidden');

    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// Handle login
async function handleLogin(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            showMessage(error.message, 'error');
            return;
        }

        showMessage('Login successful! Redirecting...', 'success');

        // Store user session
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to home page
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);

    } catch (error) {
        showMessage('Login failed. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

// Handle signup
async function handleSignup(email, password, name) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) {
            showMessage(error.message, 'error');
            return;
        }

        if (data.user && !data.user.email_confirmed_at) {
            showMessage('Please check your email and click the confirmation link!', 'success');
        } else {
            showMessage('Account created! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        }

    } catch (error) {
        showMessage('Signup failed. Please try again.', 'error');
        console.error('Signup error:', error);
    }
}

// Form handlers
function initFormHandlers() {
    // Login form
    document.getElementById('login-form-element').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        await handleLogin(email, password);

        btn.disabled = false;
        btn.textContent = 'Sign In';
    });

    // Signup form
    document.getElementById('signup-form-element').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const termsChecked = document.getElementById('terms-checkbox').checked;

        if (!termsChecked) {
            showMessage('Please agree to the terms and conditions.', 'error');
            return;
        }

        const btn = document.getElementById('signup-btn');
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        await handleSignup(email, password, name);

        btn.disabled = false;
        btn.textContent = 'Create Account';
    });
}

// Check if user is already logged in
function checkAuth() {
    const user = localStorage.getItem('user');
    if (user) {
        // User is logged in, redirect to home
        window.location.href = '/';
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();

    // Initialize Supabase first
    const supabaseReady = await initSupabase();

    initTabSwitching();
    initFormHandlers();

    if (supabaseReady) {
        console.log('Auth page initialized successfully');
    } else {
        console.error('Auth page initialization failed - Supabase not ready');
    }
});