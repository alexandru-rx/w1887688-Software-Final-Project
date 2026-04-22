/****************************************************
 * PAGE INITIALISATION / ROUTING
 * Handles page-specific setup, profile rendering,
 * order history, app startup and page routing
 ****************************************************/

function renderProfileCard() {
  const card = document.getElementById('profile-card');
  if (!card) return;

  const email = USER_STATE?.userEmail || '';
  const fullName =
    USER_STATE?.fullName && USER_STATE.fullName.trim()
      ? USER_STATE.fullName
      : 'Not provided';

  const phone =
    USER_STATE?.phone && USER_STATE.phone.trim()
      ? USER_STATE.phone
      : 'Not provided';

  card.innerHTML = `
    <div class="profile-info-list">

      <div class="profile-info-row">
        <span class="profile-info-label"><strong>Full Name</strong></span>
        <span class="profile-info-value">${fullName}</span>
      </div>

      <div class="profile-info-row">
        <span class="profile-info-label"><strong>Phone</strong></span>
        <span class="profile-info-value">${phone}</span>
      </div>

      <div class="profile-info-row profile-email-row">
        <label for="profile-email" class="profile-info-label">
          <strong>Email</strong>
        </label>

        <div class="profile-email-edit">
          <input
            type="email"
            id="profile-email"
            class="profile-email-input"
            value="${email}"
            autocomplete="email"
            readonly
          />

          <button
            type="button"
            id="edit-email-btn"
            class="profile-edit-btn"
          >
            Edit
          </button>

          <button
            type="button"
            id="save-profile-btn"
            class="profile-update-btn hidden"
          >
            Update Email
          </button>
        </div>
      </div>

    </div>
  `;
}

async function renderOrdersOnProfile() {
  const host = document.getElementById('orders-list');
  if (!host) return;

  host.innerHTML = `<p class="text-muted-center">Loading your orders...</p>`;

  await fetchCurrentUser();

  if (!USER_STATE.isLoggedIn) {
    host.innerHTML = `
      <p class="text-muted-center">
        Please <a href="LoginSystem.html">log in</a> to view your orders.
      </p>
    `;
    return;
  }

  try {
    const orders = await fetchMyOrders();

    if (!Array.isArray(orders) || orders.length === 0) {
      host.innerHTML = `<p class="text-muted-center">No orders yet.</p>`;
      return;
    }

    host.innerHTML = orders.map((order) => {
      const created = order.createdAt ? new Date(order.createdAt) : null;
      const title = order.eventTitle || 'Event';
      const venue = order.venue || '';
      const location = order.location || '';
      const qty = Number(order.qty || 0);
      const ticketType = order.ticketType || '';
      const total = Number(order.total || 0);

      return `
        <div class="summary-card" style="margin-bottom: 1rem;">
          <div class="summary-row">
            <span><strong>${title} - </strong></span>
            <span>${created ? created.toLocaleString() : ''}</span>
          </div>

          <div class="summary-row muted">
            <span>${location} (${venue}) </span>
            <span></span>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-row">
            <span>${ticketType} × ${qty} - </span>
            <span><strong>£${total.toFixed(2)}</strong></span>
          </div>

          <div style="margin-top: 12px;">
            <button
              class="secondary-btn"
              onclick="viewOrderTickets('${order._id}')">
              View Tickets
            </button>
          </div>

          <div id="tickets-for-${order._id}" style="margin-top: 15px;"></div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    host.innerHTML = `<p class="text-muted-center">Failed to load orders: ${err.message}</p>`;
  }
}

async function viewOrderTickets(orderId) {
  const container = document.getElementById(`tickets-for-${orderId}`);
  if (!container) return;

  container.innerHTML = "Loading tickets...";

  try {
    await fetchCurrentUser();

    const data = await apiFetch(`/api/orders/${orderId}/tickets`, {
      method: "GET"
    });

    const tickets = data.tickets || [];

    if (!tickets.length) {
      container.innerHTML = "No tickets found.";
      return;
    }

    const isPromoter = USER_STATE.isLoggedIn && USER_STATE.userRole === "promoter";

    container.innerHTML = tickets.map((t, index) => `
      <div class="ticket-card" style="margin-top: 12px;">
        <p><strong>Ticket ${index + 1}</strong></p>

        <p>
          <span class="${t.used ? 'ticket-badge-used' : 'ticket-badge-unused'}">
            ${t.used ? 'Used' : 'Unused'}
          </span>
        </p>

        <img src="${t.qrCode}" style="width: 150px;" />

        <p>Ticket ID: ${t._id}</p>

        <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button
            type="button"
            class="secondary-btn"
            onclick="downloadTicketPdf('${t._id}')">
            Download PDF
          </button>

          ${isPromoter && !t.used ? `
            <button
              type="button"
              class="primary-btn"
              onclick="scanTicketById('${t._id}', '${orderId}')">
              Validate Ticket
            </button>
          ` : ""}
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = "Failed to load tickets.";
    console.error(err);
  }
}

/****************************************************
 * CHECKOUT FLOW – GO TO LOGIN PAGE
 ****************************************************/

function proceedToLoginSystem(eventId) {
  localStorage.setItem('ticketwizard_selected_event', String(eventId));
  window.location.href = 'LoginSystem.html';
}

/****************************************************
 * INIT MAIN APP (TicketingPlatform.html)
 ****************************************************/

async function initApp() {
  document.body.appendChild(overlayEl);
  overlayEl.classList.add('hidden');

  await fetchCurrentUser();
  updateHeaderAuthUI();
  setupHeaderProfileMenu();
  setupDashboardFilters();

  document.getElementById('header-login-btn')?.addEventListener('click', () => {
    window.location.href = 'LoginSystem.html';
  });
  document.getElementById('header-logout-btn')?.addEventListener('click', logoutUser);

  setupDatePickerRefs();

  if (monthSelect && yearSelect) {
    MONTHS.forEach((m, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });

    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y <= currentYear + 5; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }

    monthSelect.addEventListener('change', () => {
      CURRENT_CALENDAR_DATE.setMonth(parseInt(monthSelect.value, 10));
      renderCalendar();
    });

    yearSelect.addEventListener('change', () => {
      CURRENT_CALENDAR_DATE.setFullYear(parseInt(yearSelect.value, 10));
      renderCalendar();
    });
  }

  datePickerModal?.querySelector('.picker-close')?.addEventListener('click', closeDatePickerModal);
  const dateDoneBtn = datePickerModal?.querySelector('.done-button');
  dateDoneBtn?.addEventListener('click', confirmSelectedDate);

  const footer = datePickerModal?.querySelector('.picker-footer');
  if (footer && !footer.querySelector('.reset-button')) {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'reset-button';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', resetDateFilter);
    footer.insertBefore(resetBtn, dateDoneBtn);
  }

  setupGenreModalRefs();
  genreModal?.querySelector('.picker-close')?.addEventListener('click', closeGenreModal);

  document.addEventListener('click', (e) => {
    const locSeg = document.getElementById('location-filter-segment');
    const locDrop = document.getElementById('location-dropdown-menu');
    const isLocArea = locSeg && (locSeg.contains(e.target) || locDrop?.contains(e.target));

    const dateSeg = document.getElementById('dates-filter-segment');
    const isDateTrigger = dateSeg && dateSeg.contains(e.target);
    const isDateModal = datePickerModal && datePickerModal.contains(e.target);

    const genreSeg = document.getElementById('genre-filter-segment');
    const isGenreTrigger = genreSeg && genreSeg.contains(e.target);
    const isGenreModal = genreModal && genreModal.contains(e.target);

    if (!isLocArea && locDrop && !locDrop.classList.contains('hidden')) {
      locDrop.classList.add('hidden');
      locSeg?.setAttribute('aria-expanded', 'false');
    }

    if (isDateTrigger || isGenreTrigger) return;

    if (!isDateModal && !isGenreModal) {
      if (datePickerModal && !datePickerModal.classList.contains('hidden')) closeDatePickerModal();
      if (genreModal && !genreModal.classList.contains('hidden')) closeGenreModal();
      overlayEl.classList.add('hidden');
    }
  });

  document.getElementById('search-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  document.getElementById('nav-events')?.addEventListener('click', () => switchView('events'));
  document.getElementById('nav-support')?.addEventListener('click', () => switchView('support'));
  document.getElementById('nav-dashboard')?.addEventListener('click', () => switchView('dashboard'));

  const supportInput = document.getElementById('support-chat-input');
  if (supportInput) {
    supportInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSupportChat();
      }
    });
  }

  renderLocationDropdown();
  await loadEventsFromBackend();
  renderCalendar();
  showSupportTopic('booking');

  lucide?.createIcons?.();
}

/****************************************************
 * ORDER SUMMARY (LoginSystem.html)
 ****************************************************/

function renderOrderSummaryOnLoginPage() {
  const container = document.getElementById('order-summary');
  const body = document.getElementById('order-summary-body');
  if (!container || !body) return;

  const event = getSelectedEventFromStorage();
  const ticket = getSelectedTicketFromStorage();

  if (!event || !ticket || String(ticket.eventId) !== String(event.id || event._id)) {
    container.classList.add('hidden');

    sessionStorage.removeItem('ticketwizard_selected_event');
    sessionStorage.removeItem('ticketwizard_selected_ticket');

    return;
  }

  const qty = Number(ticket.qty || 1);
  const unitPrice = Number(ticket.unitPrice || 0);
  const subTotal = unitPrice * qty;
  const bookingFee = subTotal * BOOKING_FEE_PERCENTAGE;
  const total = subTotal + bookingFee;

  container.classList.remove('hidden');

  body.innerHTML = `
    <div class="summary-card">
      <div class="summary-row">
        <span><strong>${event.artist || ''} ${event.title}</strong></span>
        <span></span>
      </div>

      <div class="summary-row muted">
        <span>${formatDate(event.date)} • ${event.venue} • ${event.location}</span>
        <span></span>
      </div>

      <div class="summary-divider"></div>

      <div class="summary-row">
        <span>${ticket.ticketType || 'Ticket'} (${qty} × ${formatPrice(unitPrice)})</span>
        <span>${formatPrice(subTotal)}</span>
      </div>

      <div class="summary-row muted">
        <span>Booking fee</span>
        <span>+ ${formatPrice(bookingFee)}</span>
      </div>

      <div class="summary-divider"></div>

      <div class="summary-row summary-total">
        <span>Total</span>
        <span>${formatPrice(total)}</span>
      </div>
    </div>
  `;

  lucide?.createIcons?.();
}

function getLoginNextTarget() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('next');
  } catch {
    return null;
  }
}

async function initLoginSystem() {
  await fetchCurrentUser();

  const next = getLoginNextTarget();
  const selectedEvent = getSelectedEventFromStorage();

  if (USER_STATE.isLoggedIn && USER_STATE.userEmail) {
    if (next === 'payment' && selectedEvent) {
      window.location.href = 'Payment.html';
    } else {
      window.location.href = 'index.html';
    }
    return;
  }

  renderOrderSummaryOnLoginPage();
  lucide?.createIcons?.();
  setupPasswordValidation();

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;

      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.form-section').forEach((sec) => sec.classList.add('hidden'));
      document.getElementById(target)?.classList.remove('hidden');
    });
  });

  document.getElementById('guest-form')?.addEventListener('submit', handleGuestCheckout);
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('signup-form')?.addEventListener('submit', handleSignUp);

  document.getElementById('back-to-events-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem('ticketwizard_selected_event');
    sessionStorage.removeItem('ticketwizard_selected_ticket');
    localStorage.removeItem('ticketwizard_guest');

    window.location.href = 'index.html';
  });
}

async function initUserProfilePage() {
  await fetchCurrentUser();

  if (!USER_STATE.isLoggedIn || !USER_STATE.userEmail) {
    alert('Please log in first.');
    window.location.href = 'LoginSystem.html';
    return;
  }

  renderProfileCard();

  document.getElementById('profile-card')?.addEventListener('click', async (e) => {
    const emailInput = document.getElementById('profile-email');
    const editBtn = document.getElementById('edit-email-btn');
    const saveBtn = document.getElementById('save-profile-btn');

    if (!emailInput || !editBtn || !saveBtn) return;

    if (e.target.id === 'edit-email-btn') {
      emailInput.removeAttribute('readonly');
      emailInput.focus();
      emailInput.classList.add('is-editing');

      editBtn.classList.add('hidden');
      saveBtn.classList.remove('hidden');
      return;
    }

    if (e.target.id === 'save-profile-btn') {
      try {
        const email = emailInput.value.trim();

        if (!email) {
          alert('Please enter an email address.');
          return;
        }

        const res = await apiFetch('/api/auth/update-profile', {
          method: 'PUT',
          body: JSON.stringify({ email })
        });

        if (!res.ok) {
          throw new Error(res.message || 'Update failed');
        }

        USER_STATE.userEmail = res.user.email;

        alert('Email updated successfully.');
        renderProfileCard();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  document.getElementById('profile-card')?.addEventListener('keydown', async (e) => {
    if (e.target.id !== 'profile-email' || e.key !== 'Enter') return;

    e.preventDefault();

    const emailInput = document.getElementById('profile-email');
    const saveBtn = document.getElementById('save-profile-btn');

    if (!emailInput || emailInput.hasAttribute('readonly') || saveBtn?.classList.contains('hidden')) {
      return;
    }

    try {
      const email = emailInput.value.trim();

      if (!email) {
        alert('Please enter an email address.');
        return;
      }

      const res = await apiFetch('/api/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        throw new Error(res.message || 'Update failed');
      }

      USER_STATE.userEmail = res.user.email;

      alert('Email updated successfully.');
      renderProfileCard();
    } catch (err) {
      alert(err.message);
    }
  });

  await renderOrdersOnProfile();

  const tabButtons = document.querySelectorAll('.profile-tabs .tab-btn');
  const sections = document.querySelectorAll('.profile-section');

  function showSection(id) {
    sections.forEach((sec) => sec.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');

    tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.target === id));
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      showSection(btn.dataset.target);
      const hash = btn.dataset.target === 'profile-orders' ? '#orders' : '#account';
      history.replaceState(null, '', 'UserProfile.html' + hash);
    });
  });

  if (window.location.hash === '#orders') showSection('profile-orders');
  else showSection('profile-account');

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logoutUser();
    window.location.href = 'index.html';
  });

  document.getElementById('back-to-events-btn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  lucide?.createIcons?.();
}

/****************************************************
 * PAGE ROUTING
 ****************************************************/

document.addEventListener('DOMContentLoaded', () => {
  const href = window.location.href;

  if (href.includes('UserProfile.html')) {
    initUserProfilePage();
  } else if (href.includes('SuccessPayment.html')) {
    initSuccessPaymentPage();
  } else if (href.includes('Payment.html')) {
    initPaymentPage();
  } else if (href.includes('LoginSystem.html')) {
    initLoginSystem();
  } else if (href.includes('forgot-password.html')) {
    initForgotPasswordPage();
  } else if (href.includes('reset-password.html')) {
    initResetPasswordPage();
  } else {
    initApp();
  }
});

window.proceedToLoginSystem = proceedToLoginSystem;
window.viewOrderTickets = viewOrderTickets;
