/****************************************************
 * PAYMENT / ORDER CONFIRMATION
 * Handles payment summary, order confirmation,
 * Stripe checkout and success page logic
 ****************************************************/

function renderPaymentSummary() {
  const body = document.getElementById('payment-summary-body');
  if (!body) return;

  const event = getSelectedEventFromStorage();
  const ticket = getSelectedTicketFromStorage();

  if (!event) {
    body.innerHTML = `<div class="summary-row muted">No event selected.</div>`;
    return;
  }

  if (!ticket || String(ticket.eventId) !== String(event.id || event._id)) {
    body.innerHTML = `<div class="summary-row muted">No ticket selection found. Please go back and choose tickets.</div>`;
    return;
  }

  const qty = Number(ticket.qty || 1);
  const unitPrice = Number(ticket.unitPrice || 0);

  const subTotal = unitPrice * qty;
  const bookingFee = subTotal * BOOKING_FEE_PERCENTAGE;
  const total = subTotal + bookingFee;

  body.innerHTML = `
    <div class="summary-card">

      <div class="summary-row">
        <span><strong>${event.artist}, ${event.title}</strong></span>
        <span></span>
      </div>

      <div class="summary-divider"></div>

      <div class="summary-row muted">
        <span>${event.location} (${event.venue}), ${formatDate(event.date)}</span>
        <span></span>
      </div>

      <div class="summary-divider"></div>

      <div class="summary-row">
        <span>Tickets (${qty} × ${formatPrice(unitPrice)}):</span>
        <span>${formatPrice(subTotal)}</span>
      </div>

      <div class="summary-row">
        <span>Booking Fee:</span>
        <span>${formatPrice(bookingFee)}</span>
      </div>

      <div class="summary-divider"></div>

      <div class="summary-row summary-total">
        <span>Total:</span>
        <span>${formatPrice(total)}</span>
      </div>

    </div>
  `;

  lucide?.createIcons?.();
}

/****************************************************
 * CONFIRM PAYMENT
 ****************************************************/
async function confirmPayment() {
  if (IS_PROCESSING_PAYMENT) return;
  IS_PROCESSING_PAYMENT = true;

  try {
    await fetchCurrentUser();

    const event = getSelectedEventFromStorage();
    if (!event) {
      alert('No event selected.');
      return;
    }

    const ticket = getSelectedTicketFromStorage();
    if (!ticket || String(ticket.eventId) !== String(event.id || event._id)) {
      alert('No ticket selection found. Please choose tickets first.');
      window.location.href = 'TicketingPlatform.html';
      return;
    }

    const guest = getGuestFromStorage();

    if (!USER_STATE.isLoggedIn && !guest) {
      try {
        const me = await apiFetch('/api/auth/me', { method: 'GET' });

        if (me?.user) {
          USER_STATE.isLoggedIn = true;
          USER_STATE.userEmail = me.user.email;
          USER_STATE.userRole = me.user.role || 'customer';
          USER_STATE.fullName = me.user.fullName || '';
          USER_STATE.phone = me.user.phone || '';
        } else {
          alert('Please login or continue as guest to proceed to payment.');
          window.location.href = 'LoginSystem.html?next=payment';
          return;
        }
      } catch (err) {
        alert('Please login or continue as guest to proceed to payment.');
        window.location.href = 'LoginSystem.html?next=payment';
        return;
      }
    }

    const qty = Number(ticket.qty || 1);
    const unitPrice = Number(ticket.unitPrice || 0);
    const subTotal = unitPrice * qty;
    const bookingFee = subTotal * BOOKING_FEE_PERCENTAGE;
    const total = subTotal + bookingFee;

    const selectedTicketTypeObj = Array.isArray(event.ticketTypes)
      ? event.ticketTypes.find((t) => t.name === ticket.ticketType || t.id === ticket.ticketTypeId)
      : null;

    console.log("EVENT OBJECT:", event);
    console.log("EVENT CAPACITY:", event.capacity);

    const payload = {
      guestEmail: guest?.email || '',
      guestName: guest?.name || '',
      guestPhone: guest?.phone || '',
      eventId: event.id || event._id,
      eventTitle: event.title,
      eventDate: event.date,
      venue: event.venue,
      location: event.location,
      capacity: Number(event.capacity ?? event.ticketCapacity ?? 0),
      ticketType: ticket.ticketType,
      ticketTypeCapacity: Number(selectedTicketTypeObj?.capacity || 0),
      qty,
      unitPrice,
      subTotal,
      bookingFee,
      total
    };

    console.log("ORDER PAYLOAD:", payload);

    const result = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (result?.tickets) {
      localStorage.setItem(
        "ticketwizard_last_tickets",
        JSON.stringify(result.tickets)
      );
    }

    if (!result?.ok) {
      throw new Error(result?.message || 'Order failed');
    }

    if (result?.order?._id) {
      setLastOrderId(result.order._id);
    }

    alert('Payment successful!');
    return result;
  } catch (err) {
    console.error('confirmPayment error:', err);
    alert(err.message || 'Payment failed');
  } finally {
    IS_PROCESSING_PAYMENT = false;
  }
}

async function initPaymentPage() {
  await fetchCurrentUser();

  const guest = getGuestFromStorage();
  const event = getSelectedEventFromStorage();
  const ticket = getSelectedTicketFromStorage();

  if (!event || !ticket) {
    window.location.href = 'TicketingPlatform.html';
    return;
  }

  if (!USER_STATE.isLoggedIn && !guest) {
    try {
      const me = await apiFetch('/api/auth/me', { method: 'GET' });

      if (me?.user) {
        USER_STATE.isLoggedIn = true;
        USER_STATE.userEmail = me.user.email;
        USER_STATE.userRole = me.user.role || 'customer';
      } else {
        alert('Login or guest details required.');
        window.location.href = 'LoginSystem.html?next=payment';
        return;
      }
    } catch (err) {
      alert('Login or guest details required.');
      window.location.href = 'LoginSystem.html?next=payment';
      return;
    }
  }

  renderPaymentSummary();

  const confirmBtn = document.getElementById('confirm-payment-btn');
  if (confirmBtn && confirmBtn.dataset.bound !== '1') {
    confirmBtn.dataset.bound = '1';

    confirmBtn.addEventListener('click', async () => {
      if (IS_PROCESSING_PAYMENT) return;

      IS_PROCESSING_PAYMENT = true;
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Redirecting to Stripe...';

      try {
        const res = await apiFetch('/api/payments/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({ event, ticket })
        });

        if (!res.url) {
          throw new Error('Stripe checkout URL was not returned.');
        }

        window.location.href = res.url;
      } catch (err) {
        console.error('Stripe checkout error:', err);
        alert(err.message || 'Payment failed.');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Proceed to Stripe Checkout';
        IS_PROCESSING_PAYMENT = false;
      }
    });
  }

  const backBtn = document.getElementById('back-to-checkout-btn');
  if (backBtn && backBtn.dataset.bound !== '1') {
    backBtn.dataset.bound = '1';

    backBtn.addEventListener('click', () => {
      window.location.href = 'TicketingPlatform.html';
    });
  }

  lucide?.createIcons?.();
}

async function initSuccessPaymentPage() {
  const alreadyFinalised = localStorage.getItem("ticketwizard_payment_finalised");

  if (!alreadyFinalised) {
    try {
      await confirmPayment();
      localStorage.setItem("ticketwizard_payment_finalised", "1");
    } catch (err) {
      console.error("Final payment confirmation failed:", err);
    }
  }

  const box = document.getElementById('success-order-box');
  const orderId = getLastOrderId();

  if (!box) return;

  let html = `
    <div class="summary-card">
      <div class="summary-row">
        <span><strong>Order Confirmed</strong></span>
        <span></span>
      </div>

      <div class="summary-divider"></div>

      <div class="summary-row">
        <span>Order Reference:</span>
        <span><strong>${orderId || 'Unavailable'}</strong></span>
      </div>

      <div class="summary-row muted">
        <span>Status:</span>
        <span>Paid</span>
      </div>
    </div>
  `;

  const lastTickets = JSON.parse(localStorage.getItem("ticketwizard_last_tickets") || "[]");

  if (lastTickets.length) {
    html += `<h3 style="margin-top:20px;">Your Tickets</h3>`;

    lastTickets.forEach((t, index) => {
      html += `
        <div class="ticket-card" style="margin-top:10px;">
          <p><strong>Ticket ${index + 1}</strong></p>
          <img src="${t.qrCode}" style="width:150px;" />
          <p>Ticket ID: ${t._id}</p>
          <button
            type="button"
            class="secondary-btn"
            style="margin-top:10px;"
            onclick="downloadTicketPdf('${t._id}')">
            Download PDF
          </button>
        </div>
      `;
    });
  }

  box.innerHTML = html;

  sessionStorage.removeItem('ticketwizard_selected_event');
  sessionStorage.removeItem('ticketwizard_selected_ticket');
  localStorage.removeItem('ticketwizard_guest');
  localStorage.removeItem("ticketwizard_payment_finalised");

  await fetchCurrentUser();
  updateHeaderAuthUI?.();

  lucide?.createIcons?.();

  document.getElementById('view-events-btn')?.addEventListener('click', () => {
    window.location.href = 'TicketingPlatform.html';
  });
}

async function scanTicketById(ticketId, orderId) {
  try {
    const data = await apiFetch('/api/orders/tickets/scan', {
      method: 'POST',
      body: JSON.stringify({ ticketId })
    });

    alert(data.message || 'Ticket scanned successfully.');

    if (orderId) {
      await viewOrderTickets(orderId);
    }
  } catch (err) {
    alert(err.message || 'Scan failed.');
  }
}

window.scanTicketById = scanTicketById;
