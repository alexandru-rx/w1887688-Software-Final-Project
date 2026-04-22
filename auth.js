/****************************************************
 * AUTH / USER ACCESS
 * Handles session state, login, signup, logout,
 * guest checkout and password reset functionality
 ****************************************************/

async function fetchCurrentUser() {
  try {
    const data = await apiFetch('/api/auth/me', { method: 'GET' });

    if (data?.user) {
      USER_STATE.isLoggedIn = true;
      USER_STATE.userEmail = data.user.email;
      USER_STATE.userRole = data.user.role || 'customer';
      USER_STATE.fullName = data.user.fullName || '';
      USER_STATE.phone = data.user.phone || '';
    } else {
      USER_STATE.isLoggedIn = false;
      USER_STATE.userEmail = null;
      USER_STATE.userRole = 'customer';
      USER_STATE.fullName = '';
      USER_STATE.phone = '';
    }
  } catch (err) {
    console.error('fetchCurrentUser failed:', err);

    USER_STATE.isLoggedIn = false;
    USER_STATE.userEmail = null;
    USER_STATE.userRole = 'customer';
    USER_STATE.fullName = '';
    USER_STATE.phone = '';
  }
}

/****************************************************
 * HEADER LOGIN / STATUS UI
 ****************************************************/

function updateHeaderAuthUI() {
  const authStatusEl = document.getElementById('auth-status');
  const loginBtn = document.getElementById('header-login-btn');
  const logoutBtn = document.getElementById('header-logout-btn');
  const dashboardNav = document.getElementById('nav-dashboard');

  if (!authStatusEl) return;

  // 1) REAL LOGGED-IN USER
  if (USER_STATE.isLoggedIn) {
    const roleLabel = USER_STATE.userRole === 'promoter' ? 'Promoter' : 'Customer';
    const emailPart = USER_STATE.userEmail ? ` (${USER_STATE.userEmail})` : '';

    authStatusEl.textContent = `Logged in as ${roleLabel}${emailPart}`;
    authStatusEl.classList.add('status-logged-in');
    authStatusEl.classList.remove('status-guest');

    loginBtn?.classList.add('hidden');
    logoutBtn?.classList.remove('hidden');

    if (dashboardNav) {
      if (USER_STATE.userRole === 'promoter') {
        dashboardNav.classList.remove('hidden');
      } else {
        dashboardNav.classList.add('hidden');
      }
    }

    return;
  }

  // 2) GUEST CHECKOUT STATE
  let guest = null;

  if (typeof getGuestFromStorage === 'function') {
    guest = getGuestFromStorage();
  } else {
    const raw = localStorage.getItem('ticketwizard_guest');
    guest = raw ? JSON.parse(raw) : null;
  }

  if (guest?.email) {
    authStatusEl.textContent = `Guest: (${guest.email})`;
    authStatusEl.classList.add('status-guest');
    authStatusEl.classList.remove('status-logged-in');

    loginBtn?.classList.remove('hidden');
    logoutBtn?.classList.add('hidden');

    if (dashboardNav) dashboardNav.classList.add('hidden');
    return;
  }

  // 3) NORMAL NOT LOGGED IN
  authStatusEl.textContent = 'Not logged in';
  authStatusEl.classList.remove('status-logged-in', 'status-guest');

  loginBtn?.classList.remove('hidden');
  logoutBtn?.classList.add('hidden');

  if (dashboardNav) dashboardNav.classList.add('hidden');
}

async function submitResetPasswordForm(e) {
  e.preventDefault();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const passwordEl = document.getElementById('new-password');
  const confirmEl = document.getElementById('confirm-password');

  const password = passwordEl ? passwordEl.value.trim() : '';
  const confirmPassword = confirmEl ? confirmEl.value.trim() : '';

  if (!token) {
    alert('Invalid or missing reset token.');
    return;
  }

  if (!password || !confirmPassword) {
    alert('Please fill in both password fields.');
    return;
  }

  if (password !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  try {
    const res = await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });

    alert(res.message || 'Password updated successfully.');
    window.location.href = 'LoginSystem.html';
  } catch (err) {
    alert(err.message || 'Failed to reset password.');
  }
}

/****************************************************
 * LOGOUT (backend)
 * - Destroys server session
 * - Clears client UI state
 ****************************************************/
async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Logout request failed (still clearing UI):', err.message);
  }

  USER_STATE.isLoggedIn = false;
  USER_STATE.userRole = 'customer';
  USER_STATE.userEmail = null;
  USER_STATE.fullName = '';
  USER_STATE.phone = '';

  localStorage.removeItem(SELECTED_EVENT_KEY);
  localStorage.removeItem(SELECTED_TICKET_KEY);

  updateHeaderAuthUI();
  switchView?.('events');
}

function setupHeaderProfileMenu() {
  const btn = document.getElementById('header-profile-btn');
  const menu = document.getElementById('profile-menu');
  if (!btn || !menu) return;

  if (btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  function isLoggedIn() {
    return USER_STATE.isLoggedIn && !!USER_STATE.userEmail;
  }

  function isGuestActive() {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearGuestCheckout() {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(SELECTED_EVENT_KEY);
    localStorage.removeItem(SELECTED_TICKET_KEY);
  }

  function renderMenu() {
    if (isLoggedIn()) {
      menu.innerHTML = `
        <button class="menu-item" data-action="account">Account details</button>
        <button class="menu-item" data-action="orders">Order history</button>
        <div class="menu-divider"></div>
        <button class="menu-item danger" data-action="logout">Logout</button>
      `;
    } else {
      const guest = isGuestActive();

      if (guest?.email) {
        menu.innerHTML = `
          <button class="menu-item" data-action="login">Switch account</button>
          <button class="menu-item danger" data-action="guest-logout">Clear guest</button>
        `;
      } else {
        menu.innerHTML = `
          <button class="menu-item" data-action="login">Login / Register</button>
        `;
      }
    }
  }

  renderMenu();

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();

    await fetchCurrentUser();
    renderMenu();
    menu.classList.toggle('hidden');
  });

  menu.addEventListener('click', (e) => {
    const action = e.target.closest('button')?.dataset.action;
    if (!action) return;

    if (action === 'login') {
      const guest = isGuestActive();

      if (guest?.email) {
        const ok = confirm(
          `You're currently checking out as a guest (${guest.email}).\n\nSwitch account and remove guest details?`
        );
        if (!ok) return;

        clearGuestCheckout();
        updateHeaderAuthUI();
      }

      menu.classList.add('hidden');
      window.location.href = 'LoginSystem.html';
      return;
    }

    if (action === 'guest-logout') {
      clearGuestCheckout();
      updateHeaderAuthUI();
      alert('Guest checkout cleared.');
      menu.classList.add('hidden');
      window.location.href = 'TicketingPlatform.html';
      return;
    }

    menu.classList.add('hidden');

    if (action === 'account') {
      window.location.href = 'UserProfile.html#account';
      return;
    }

    if (action === 'orders') {
      window.location.href = 'UserProfile.html#orders';
      return;
    }

    if (action === 'logout') {
      logoutUser();
      window.location.href = 'TicketingPlatform.html';
      return;
    }
  });

  document.addEventListener('click', () => {
    menu.classList.add('hidden');
  });
}

/****************************************************
 * GUEST CHECKOUT
 ****************************************************/

function handleGuestCheckout(e) {
  e.preventDefault();

  const email = document.getElementById('guest-email')?.value.trim();
  const name = document.getElementById('guest-name')?.value.trim();
  const phone = document.getElementById('guest-phone')?.value.trim() || '';

  if (!email || !name) {
    alert('Please enter your email and full name.');
    return;
  }

  const guest = { email, name, phone };
  saveGuestToStorage(guest);

  const selectedEvent = getSelectedEventFromStorage?.();
  const nextUrl = selectedEvent ? 'Payment.html' : 'TicketingPlatform.html';

  alert('Guest details captured. Redirecting...');
  window.location.href = nextUrl;
}

/****************************************************
 * LOGIN WITH BACKEND
 ****************************************************/

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    USER_STATE.isLoggedIn = true;
    USER_STATE.userEmail = data.user.email;
    USER_STATE.userRole = data.user.role;

    const selectedEvent = getSelectedEventFromStorage();
    const nextUrl = selectedEvent ? 'Payment.html' : 'TicketingPlatform.html';

    alert(`Logged in as ${USER_STATE.userRole}. Redirecting...`);
    window.location.href = nextUrl;
  } catch (err) {
    alert(err.message);
  }
}

/****************************************************
 * PASSWORD STRENGTH CHECK
 * Validates password rules and updates UI feedback
 ****************************************************/

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function setupPasswordValidation() {
  const input = document.getElementById('signup-password');
  if (!input) return;

  const ruleLength = document.getElementById('rule-length');
  const ruleUpper = document.getElementById('rule-upper');
  const ruleLower = document.getElementById('rule-lower');
  const ruleNumber = document.getElementById('rule-number');
  const ruleSpecial = document.getElementById('rule-special');

  if (!ruleLength || !ruleUpper || !ruleLower || !ruleNumber || !ruleSpecial) return;

  function updateRuleState(element, passed) {
    element.classList.remove('valid', 'invalid');
    element.classList.add(passed ? 'valid' : 'invalid');
  }

  function validatePasswordRules() {
    const value = input.value || '';

    updateRuleState(ruleLength, value.length >= 8);
    updateRuleState(ruleUpper, /[A-Z]/.test(value));
    updateRuleState(ruleLower, /[a-z]/.test(value));
    updateRuleState(ruleNumber, /[0-9]/.test(value));
    updateRuleState(ruleSpecial, /[^A-Za-z0-9]/.test(value));
  }

  input.addEventListener('focus', validatePasswordRules);
  input.addEventListener('input', validatePasswordRules);
}

/****************************************************
 * REGISTER NEW USER WITH BACKEND
 ****************************************************/

async function handleSignUp(e) {
  e.preventDefault();

  const fullName = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();

  if (!fullName || !email || !password) {
    alert('Please enter your name, email and password.');
    return;
  }

  if (!isStrongPassword(password)) {
    alert('Password is too weak.');
    return;
  }

  try {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName,
        email,
        password,
        role: 'customer'
      })
    });

    USER_STATE.isLoggedIn = true;
    USER_STATE.userEmail = data.user.email;
    USER_STATE.userRole = data.user.role;

    const selectedEvent = getSelectedEventFromStorage();
    const nextUrl = selectedEvent ? 'Payment.html' : 'TicketingPlatform.html';

    alert('Account created! Redirecting...');
    window.location.href = nextUrl;
  } catch (err) {
    alert(err.message);
  }
}

function initForgotPasswordPage() {
  const form = document.getElementById('forgot-password-form');
  if (!form) return;

  lucide?.createIcons?.();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailEl = document.getElementById('forgot-email');
    const email = emailEl ? emailEl.value.trim() : '';

    if (!email) {
      alert('Please enter your email address.');
      return;
    }

    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      alert(res.message || 'If this email exists, a reset link has been sent.');
      window.location.href = 'LoginSystem.html';
    } catch (err) {
      alert(err.message || 'Failed to send reset email.');
    }
  });
}

function initResetPasswordPage() {
  const form = document.getElementById('reset-password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const passwordEl = document.getElementById('new-password');
    const confirmEl = document.getElementById('confirm-password');

    const password = passwordEl ? passwordEl.value.trim() : '';
    const confirmPassword = confirmEl ? confirmEl.value.trim() : '';

    if (!password || !confirmPassword) {
      alert('Please fill in both password fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      alert('Invalid or missing reset token.');
      return;
    }

    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });

      alert(res.message || 'Password updated successfully.');
      window.location.href = 'LoginSystem.html';
    } catch (err) {
      alert(err.message || 'Failed to reset password.');
    }
  });
}

window.logoutUser = logoutUser;
window.submitResetPasswordForm = submitResetPasswordForm;
window.handleGuestCheckout = handleGuestCheckout;
window.handleLogin = handleLogin;
window.handleSignUp = handleSignUp;