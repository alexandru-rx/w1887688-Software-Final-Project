/****************************************************
 * UTILITY / STORAGE HELPERS
 * Contains shared helper functions for API calls,
 * local storage, formatting and ticket downloads
 ****************************************************/

/**
 * Helper for calling backend API endpoints.
 * - Keeps fetch clean
 * - Gives readable error messages
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data;
}

/**
 * Fetch orders for the currently logged-in user.
 * (Backend: GET /api/orders/my)
 */
async function fetchMyOrders() {
  const data = await apiFetch('/api/orders/my', { method: 'GET' });
  return data.orders || [];
}

function saveUserToStorage() {
  try {
    const data = {
      isLoggedIn: USER_STATE.isLoggedIn,
      userRole: USER_STATE.userRole,
      userEmail: USER_STATE.userEmail
    };

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save user to storage', err);
  }
}

function clearUserFromStorage() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear user storage', err);
  }
}

function saveGuestToStorage(guest) {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
}

function getGuestFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function clearGuestFromStorage() {
  localStorage.removeItem(GUEST_STORAGE_KEY);
}

function saveSelectedEventToStorage(event) {
  try {
    sessionStorage.setItem(SELECTED_EVENT_KEY, JSON.stringify(event));
  } catch (err) {
    console.error('Failed to save selected event', err);
  }
}

function getSelectedEventFromStorage() {
  try {
    const raw = sessionStorage.getItem(SELECTED_EVENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSelectedTicketToStorage(ticket) {
  try {
    sessionStorage.setItem(SELECTED_TICKET_KEY, JSON.stringify(ticket));
  } catch (err) {
    console.error('Failed to save selected ticket', err);
  }
}

function getSelectedTicketFromStorage() {
  try {
    const raw = sessionStorage.getItem(SELECTED_TICKET_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function downloadTicketPdf(ticketId) {
  try {
    const response = await fetch(`${API_BASE}/api/orders/tickets/${ticketId}/pdf`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      let message = "Failed to download PDF.";
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${ticketId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message || "Failed to download ticket PDF.");
  }
}

/****************************************************
 * SMALL UTIL FUNCTIONS
 * Formatting helpers for prices + dates
 ****************************************************/

function formatPrice(price) {
  const n = Number(price);
  const safe = Number.isFinite(n) ? n : 0;
  return `£${safe.toFixed(2)}`;
}

function formatDate(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/****************************************************
 * ORDER STORAGE
 ****************************************************/

function setLastOrderId(orderId) {
  try {
    localStorage.setItem(LAST_ORDER_ID_KEY, String(orderId));
  } catch {}
}

function getLastOrderId() {
  try {
    return localStorage.getItem(LAST_ORDER_ID_KEY);
  } catch {
    return null;
  }
}