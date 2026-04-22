/****************************************************
 * PROMOTER DASHBOARD
 * Handles event management, dashboard rendering,
 * analytics and promoter-side controls
 ****************************************************/

function openEventModal(modeOrId) {
  if (!USER_STATE.isLoggedIn || USER_STATE.userRole !== 'promoter') {
    alert('Only promoters can manage events.');
    return;
  }

  const modal = document.getElementById('event-management-modal');
  const titleEl = document.getElementById('event-modal-title');
  const form = document.getElementById('event-form');
  if (!modal || !titleEl || !form) return;

  const idEl = document.getElementById('event-id');
  const artistEl = document.getElementById('event-artist');
  const eventTitleEl = document.getElementById('event-title');
  const venueEl = document.getElementById('event-venue');
  const locationEl = document.getElementById('event-location');
  const genreEl = document.getElementById('event-genre');
  const dateEl = document.getElementById('event-date');
  const timeEl = document.getElementById('event-time');
  const capacityEl = document.getElementById('event-capacity');
  const descEl = document.getElementById('event-description');

  const ticketType1NameEl = document.getElementById('ticket-type-1-name');
  const ticketType1PriceEl = document.getElementById('ticket-type-1-price');
  const ticketType1CapacityEl = document.getElementById('ticket-type-1-capacity');

  const ticketType2NameEl = document.getElementById('ticket-type-2-name');
  const ticketType2PriceEl = document.getElementById('ticket-type-2-price');
  const ticketType2CapacityEl = document.getElementById('ticket-type-2-capacity');

  const ticketType3NameEl = document.getElementById('ticket-type-3-name');
  const ticketType3PriceEl = document.getElementById('ticket-type-3-price');
  const ticketType3CapacityEl = document.getElementById('ticket-type-3-capacity');

  if (
    !idEl || !artistEl || !eventTitleEl || !venueEl || !locationEl ||
    !genreEl || !dateEl || !timeEl || !capacityEl || !descEl ||
    !ticketType1NameEl || !ticketType1PriceEl || !ticketType1CapacityEl ||
    !ticketType2NameEl || !ticketType2PriceEl || !ticketType2CapacityEl ||
    !ticketType3NameEl || !ticketType3PriceEl || !ticketType3CapacityEl
  ) return;

  function updateTotalCapacity() {
    const total =
      (Number(ticketType1CapacityEl.value) || 0) +
      (Number(ticketType2CapacityEl.value) || 0) +
      (Number(ticketType3CapacityEl.value) || 0);

    capacityEl.value = total > 0 ? String(total) : '';
  }

  function setTicketFieldsLocked(locked) {
    ticketType1NameEl.readOnly = locked;
    ticketType1PriceEl.readOnly = locked;
    ticketType1CapacityEl.readOnly = locked;

    ticketType2NameEl.readOnly = locked;
    ticketType2PriceEl.readOnly = locked;
    ticketType2CapacityEl.readOnly = locked;

    ticketType3NameEl.readOnly = locked;
    ticketType3PriceEl.readOnly = locked;
    ticketType3CapacityEl.readOnly = locked;

    capacityEl.readOnly = true;
  }

  [
    ticketType1CapacityEl,
    ticketType2CapacityEl,
    ticketType3CapacityEl
  ].forEach((el) => {
    el.oninput = updateTotalCapacity;
  });

  function resetForm() {
    idEl.value = '';
    artistEl.value = '';
    eventTitleEl.value = '';
    venueEl.value = '';
    locationEl.value = '';
    genreEl.value = '';
    dateEl.value = '';
    timeEl.value = '';
    capacityEl.value = '';
    descEl.value = '';

    ticketType1NameEl.value = '';
    ticketType1PriceEl.value = '';
    ticketType1CapacityEl.value = '';

    ticketType2NameEl.value = '';
    ticketType2PriceEl.value = '';
    ticketType2CapacityEl.value = '';

    ticketType3NameEl.value = '';
    ticketType3PriceEl.value = '';
    ticketType3CapacityEl.value = '';

    capacityEl.readOnly = true;
  }

  if (modeOrId === 'new') {
    titleEl.textContent = 'Create New Event';
    resetForm();
    setTicketFieldsLocked(false);
    modal.classList.remove('hidden');
    lucide?.createIcons?.();
    return;
  }

  const ev = getEventById(modeOrId);
  if (!ev) return;

  titleEl.textContent = 'Edit Event';

  idEl.value = String(ev._id || ev.id || '');
  artistEl.value = ev.artist ?? '';
  eventTitleEl.value = ev.title ?? '';
  venueEl.value = ev.venue ?? '';
  locationEl.value = ev.location ?? '';
  genreEl.value = ev.genre ?? ev.mainGenre ?? ev.subGenre ?? '';

  const d = new Date(ev.date);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dateEl.value = `${yyyy}-${mm}-${dd}`;
  } else {
    dateEl.value = '';
  }

  timeEl.value = ev.time ?? '';
  descEl.value = ev.description ?? '';

  const ticketTypes = Array.isArray(ev.ticketTypes) ? ev.ticketTypes : [];

  ticketType1NameEl.value = ticketTypes[0]?.name ?? '';
  ticketType1PriceEl.value = ticketTypes[0]?.price ?? '';
  ticketType1CapacityEl.value = ticketTypes[0]?.capacity ?? '';

  ticketType2NameEl.value = ticketTypes[1]?.name ?? '';
  ticketType2PriceEl.value = ticketTypes[1]?.price ?? '';
  ticketType2CapacityEl.value = ticketTypes[1]?.capacity ?? '';

  ticketType3NameEl.value = ticketTypes[2]?.name ?? '';
  ticketType3PriceEl.value = ticketTypes[2]?.price ?? '';
  ticketType3CapacityEl.value = ticketTypes[2]?.capacity ?? '';

  updateTotalCapacity();
  setTicketFieldsLocked(true);

  modal.classList.remove('hidden');
  lucide?.createIcons?.();
}

function closeEventModal() {
  const modal = document.getElementById('event-management-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

async function handleEventSave(e) {
  e.preventDefault();

  await fetchCurrentUser();

  if (!USER_STATE?.isLoggedIn || USER_STATE.userRole !== 'promoter') {
    alert('You must be logged in as a promoter to do that.');
    return;
  }

  const idEl = document.getElementById('event-id');
  const artistEl = document.getElementById('event-artist');
  const titleEl = document.getElementById('event-title');
  const venueEl = document.getElementById('event-venue');
  const locationEl = document.getElementById('event-location');
  const genreEl = document.getElementById('event-genre');
  const dateEl = document.getElementById('event-date');
  const timeEl = document.getElementById('event-time');
  const capacityEl = document.getElementById('event-capacity');
  const descEl = document.getElementById('event-description');

  const ticketType1NameEl = document.getElementById('ticket-type-1-name');
  const ticketType1PriceEl = document.getElementById('ticket-type-1-price');
  const ticketType1CapacityEl = document.getElementById('ticket-type-1-capacity');

  const ticketType2NameEl = document.getElementById('ticket-type-2-name');
  const ticketType2PriceEl = document.getElementById('ticket-type-2-price');
  const ticketType2CapacityEl = document.getElementById('ticket-type-2-capacity');

  const ticketType3NameEl = document.getElementById('ticket-type-3-name');
  const ticketType3PriceEl = document.getElementById('ticket-type-3-price');
  const ticketType3CapacityEl = document.getElementById('ticket-type-3-capacity');

  if (
    !idEl || !artistEl || !titleEl || !venueEl || !locationEl ||
    !genreEl || !dateEl || !timeEl || !capacityEl || !descEl ||
    !ticketType1NameEl || !ticketType1PriceEl || !ticketType1CapacityEl ||
    !ticketType2NameEl || !ticketType2PriceEl || !ticketType2CapacityEl ||
    !ticketType3NameEl || !ticketType3PriceEl || !ticketType3CapacityEl
  ) return;

  const isEdit = !!idEl.value;

  const dateValue = dateEl.value;
  const timeValue = timeEl.value;
  const dateObj = dateValue ? new Date(`${dateValue}T00:00:00`) : null;
  const genreValue = genreEl.value.trim();

  const rawTicketTypes = [
    {
      name: ticketType1NameEl.value.trim(),
      price: Number(ticketType1PriceEl.value),
      capacity: Number(ticketType1CapacityEl.value)
    },
    {
      name: ticketType2NameEl.value.trim(),
      price: Number(ticketType2PriceEl.value),
      capacity: Number(ticketType2CapacityEl.value)
    },
    {
      name: ticketType3NameEl.value.trim(),
      price: Number(ticketType3PriceEl.value),
      capacity: Number(ticketType3CapacityEl.value)
    }
  ];

  const ticketTypes = rawTicketTypes
    .filter((t) =>
      t.name &&
      Number.isFinite(t.price) && t.price > 0 &&
      Number.isFinite(t.capacity) && t.capacity > 0
    )
    .map((t, index) => ({
      id: t.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `ticket-${index + 1}`,
      name: t.name,
      price: t.price,
      capacity: t.capacity
    }));

  if (!ticketTypes.length) {
    alert('Please add at least one ticket type with price and capacity.');
    return;
  }

  const totalCapacity = ticketTypes.reduce((sum, t) => sum + t.capacity, 0);
  capacityEl.value = String(totalCapacity);

  const newData = {
    artist: artistEl.value.trim(),
    title: titleEl.value.trim(),
    venue: venueEl.value.trim(),
    location: locationEl.value.trim(),
    genre: genreValue,
    mainGenre: genreValue,
    subGenre: genreValue,
    date: dateObj || new Date(),
    time: timeValue || '',
    price: Number(ticketTypes[0]?.price) || 0,
    capacity: totalCapacity,
    description: descEl.value.trim() || '',
    ticketTypes,
    image: `https://picsum.photos/350/180?random=${Math.floor(Math.random() * 9999)}`,
    promoterEmail: USER_STATE.userEmail || null
  };

  if (
    !newData.artist ||
    !newData.title ||
    !newData.venue ||
    !newData.location ||
    !newData.genre
  ) {
    alert('Please complete all required event fields.');
    return;
  }

  try {
    let result;

    if (isEdit) {
      const currentEvent = getEventById(idEl.value);
      if (currentEvent?.image) {
        newData.image = currentEvent.image;
      }

      result = await apiFetch(`/api/events/${idEl.value}`, {
        method: 'PUT',
        body: JSON.stringify(newData)
      });
    } else {
      result = await apiFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify(newData)
      });
    }

    if (!result?.ok) {
      throw new Error(result?.message || 'Failed to save event');
    }

    await loadEventsFromBackend();

    closeEventModal();
    renderDashboard();
    filterEvents?.();

    alert(isEdit ? 'Event updated successfully!' : 'Event created successfully!');
  } catch (err) {
    console.error('handleEventSave error:', err);
    alert(err.message || 'Failed to save event');
  }
}

function generateEventId() {
  const maxId = EVENT_DATA.reduce((m, ev) => Math.max(m, Number(ev.id) || 0), 0);
  return maxId + 1;
}

function deleteEventById(eventId) {
  const ok = confirm('Are you sure you would like to delete this Event?');
  if (!ok) return;

  const idx = EVENT_DATA.findIndex((ev) => String(ev.id) === String(eventId));
  if (idx === -1) return;

  EVENT_DATA.splice(idx, 1);
  renderDashboard();
  filterEvents?.();
}

/****************************************************
 * TICKET VALIDATION
 ****************************************************/

function renderTicketValidationPanel() {
  return `
    <div class="summary-card" style="margin-bottom: 1rem;">
      <div class="summary-row">
        <span><strong>Ticket Validation</strong></span>
        <span></span>
      </div>

      <div class="summary-row muted">
        <span>Enter a ticket ID to validate entry.</span>
        <span></span>
      </div>

      <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
        <input
          type="text"
          id="promoter-ticket-id"
          placeholder="Enter ticket ID"
          style="flex: 1; min-width: 260px; background-color: #0f0f10; border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.9rem 1rem; border-radius: 10px; font-size: 1rem;"
        />

        <button
          type="button"
          class="primary-btn"
          onclick="validatePromoterTicket()">
          Validate Ticket
        </button>
      </div>

      <div id="promoter-ticket-validation-result" style="margin-top: 12px;"></div>
    </div>
  `;
}

async function validatePromoterTicket() {
  await fetchCurrentUser?.();

  if (!USER_STATE?.isLoggedIn || USER_STATE.userRole !== 'promoter') {
    alert('Only promoters can validate tickets.');
    return;
  }

  const input = document.getElementById('promoter-ticket-id');
  const resultBox = document.getElementById('promoter-ticket-validation-result');

  if (!input || !resultBox) return;

  const ticketId = input.value.trim();

  if (!ticketId) {
    resultBox.innerHTML = `
      <div class="summary-row muted validation-error">
        <span>Please enter a ticket ID.</span>
        <span></span>
      </div>
    `;
    return;
  }

  resultBox.innerHTML = `
    <div class="summary-row muted">
      <span>Validating ticket...</span>
      <span></span>
    </div>
  `;

  try {
    const data = await apiFetch('/api/orders/tickets/scan', {
      method: 'POST',
      body: JSON.stringify({ ticketId })
    });

    resultBox.innerHTML = `
      <div class="summary-row validation-success">
        <span><strong>${data.message || 'Ticket validated successfully.'}</strong></span>
        <span></span>
      </div>
    `;

    input.value = '';
  } catch (err) {
    let message = err.message || 'Validation failed.';

    if (message.includes('Cast to ObjectId failed')) {
      message = 'Invalid ticket ID.';
    }

    resultBox.innerHTML = `
      <div class="summary-row muted validation-error">
        <span>${message}</span>
        <span></span>
      </div>
    `;
  }
}

/****************************************************
 * PROMOTER DASHBOARD RENDER
 ****************************************************/

async function renderDashboard(filter = 'all') {
  const list = document.getElementById('promoter-events-list');
  const validationHost = document.getElementById('promoter-validation-panel');
  if (validationHost) {
  validationHost.innerHTML = renderTicketValidationPanel();
}
  if (!list) return;

  updateHeaderAuthUI?.();
  await fetchCurrentUser?.();

  if (!USER_STATE?.isLoggedIn || USER_STATE.userRole !== 'promoter') {
    list.innerHTML = `
      <p class="text-muted-center">
        You must be logged in as a <strong>Promoter</strong> to access this dashboard.
      </p>
    `;
    return;
  }

  let orders = [];

  try {
    const data = await apiFetch('/api/orders/promoter/stats', { method: 'GET' });
    orders = Array.isArray(data.orders) ? data.orders : [];
  } catch (err) {
    console.error('Failed to load promoter stats:', err);
    orders = [];
  }

  window.__PROMOTER_ORDERS__ = orders;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filteredEvents = (Array.isArray(EVENT_DATA) ? EVENT_DATA : []).filter((ev) => {
    const eventDate = new Date(ev.date);
    eventDate.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') return eventDate >= now;
    if (filter === 'past') return eventDate < now;
    return true;
  });

if (!filteredEvents.length) {
  list.innerHTML = `
    <p class="text-muted-center">
      No events to show for this filter.
    </p>
  `;
  return;
}

  list.innerHTML = `
  ${filteredEvents.map((ev) => {
    const d = new Date(ev.date);
    const dateStr = (typeof formatDate === 'function') ? formatDate(d) : d.toDateString();

    const cap = Number(ev.capacity ?? ev.totalCapacity ?? ev.maxCapacity ?? 0);
    const eventId = ev._id || ev.id;

    const media = ev.image
      ? `<div class="dash-event-media" style="background-image:url('${ev.image}')"></div>`
      : ``;

    return `
      <div class="dash-event-card">
        ${media}

        <div class="dash-event-body">
          <h4 class="dash-event-title">${ev.title || 'Untitled Event'}</h4>

          <div class="dash-event-meta">
            ${dateStr} • ${ev.venue || ''} • ${ev.location || ''}
          </div>

          <div class="dash-event-meta">
            Price: based on ticket type • Capacity: ${cap}
          </div>

          <div class="dash-event-actions">
            <button type="button" class="dash-btn" onclick="openEventModal('${eventId}')">
              Edit
            </button>

            <button type="button" class="dash-btn" onclick="openEventAnalytics('${eventId}', window.__PROMOTER_ORDERS__ || [])">
              Analytics
            </button>

            <button type="button" class="dash-btn danger" onclick="deleteEventById('${eventId}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
    }).join('')}
`;

  lucide?.createIcons?.();
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('event-management-modal');
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeEventModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEventModal();
  });
});

var CURRENT_DASHBOARD_FILTER = 'all';

function openAnalyticsModal() {
  const modal = document.getElementById('analytics-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  lucide?.createIcons?.();
}

function closeAnalyticsModal() {
  const modal = document.getElementById('analytics-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

function openDashboardAnalytics() {
  const modalTitle = document.getElementById('analytics-modal-title');
  const modalBody = document.getElementById('analytics-modal-body');

  if (!modalTitle || !modalBody) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const allEvents = Array.isArray(EVENT_DATA) ? EVENT_DATA : [];

  const upcomingEvents = allEvents.filter((event) => {
    const d = new Date(event.date);
    d.setHours(0, 0, 0, 0);
    return d >= now;
  });

  const pastEvents = allEvents.filter((event) => {
    const d = new Date(event.date);
    d.setHours(0, 0, 0, 0);
    return d < now;
  });

  const orders = window.__PROMOTER_ORDERS__ || [];

  const totalRevenue = orders.reduce((sum, order) => {
    return sum + Number(order.total || 0);
  }, 0);

  const totalTicketsSold = orders.reduce((sum, order) => {
    return sum + Number(order.qty || order.quantity || 0);
  }, 0);

  modalTitle.textContent = 'Promoter Dashboard Analytics';

  modalBody.innerHTML = `
    <fieldset class="form-section">
      <legend class="section-title">Event Summary</legend>

      <div class="summary-row">
        <span><strong>Total Events: </strong></span>
        <span>${allEvents.length}</span>
      </div>

      <div class="summary-row muted">
        <span>Upcoming Events: </span>
        <span>${upcomingEvents.length}</span>
      </div>

      <div class="summary-row muted">
        <span>Past Events: </span>
        <span>${pastEvents.length}</span>
      </div>
    </fieldset>

    <fieldset class="form-section">
      <legend class="section-title">Sales Summary</legend>

      <div class="summary-row">
        <span><strong>Tickets Sold: </strong></span>
        <span>${totalTicketsSold}</span>
      </div>

      <div class="summary-row">
        <span><strong>Total Revenue: </strong></span>
        <span>${formatPrice(totalRevenue)}</span>
      </div>
    </fieldset>
  `;

  openAnalyticsModal();
}

function openEventAnalytics(eventId, orders = []) {
  const event = getEventById(eventId);
  if (!event) return;

  const modalTitle = document.getElementById('analytics-modal-title');
  const modalBody = document.getElementById('analytics-modal-body');
  if (!modalTitle || !modalBody) return;

  const sold = orders
    .filter((o) => String(o.eventId) === String(eventId))
    .reduce((sum, o) => sum + Number(o.qty || o.quantity || 0), 0);

  const revenue = orders
    .filter((o) => String(o.eventId) === String(eventId))
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const capacity = Number(event.capacity || 0);
  const remaining = Math.max(0, capacity - sold);
  const ticketTypeCount = Array.isArray(event.ticketTypes) ? event.ticketTypes.length : 0;

  modalTitle.textContent = `${event.title} Analytics`;

  modalBody.innerHTML = `
    <fieldset class="form-section">
      <legend class="section-title">Event Overview</legend>

      <div class="summary-row">
        <span><strong>Event:</strong></span>
        <span>${event.title}</span>
      </div>

      <div class="summary-row muted">
        <span>Date:</span>
        <span>${formatDate(event.date)}</span>
      </div>

      <div class="summary-row muted">
        <span>Venue:</span>
        <span>${event.venue} • ${event.location}</span>
      </div>
    </fieldset>

    <fieldset class="form-section">
      <legend class="section-title">Sales Analytics</legend>

      <div class="summary-row">
        <span><strong>Tickets Sold:</strong></span>
        <span>${sold}</span>
      </div>

      <div class="summary-row">
        <span><strong>Revenue:</strong></span>
        <span>${formatPrice(revenue)}</span>
      </div>

      <div class="summary-row muted">
        <span>Capacity:</span>
        <span>${capacity}</span>
      </div>

      <div class="summary-row muted">
        <span>Remaining Tickets:</span>
        <span>${remaining}</span>
      </div>

      <div class="summary-row muted">
        <span>Ticket Types:</span>
        <span>${ticketTypeCount}</span>
      </div>
    </fieldset>
  `;

  openAnalyticsModal();
}

function setupDashboardFilters() {
  document.querySelectorAll('.dash-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-filter').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      CURRENT_DASHBOARD_FILTER = btn.dataset.filter || 'all';
      renderDashboard(CURRENT_DASHBOARD_FILTER);
    });
  });
}

/****************************************************
 * ONE-TIME SETUP HOOKS
 ****************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-event-btn');
  if (addBtn && addBtn.dataset.bound !== '1') {
    addBtn.dataset.bound = '1';
    addBtn.addEventListener('click', () => openEventModal('new'));
  }
});

window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.handleEventSave = handleEventSave;
window.deleteEventById = deleteEventById;
window.openEventAnalytics = openEventAnalytics;
window.openDashboardAnalytics = openDashboardAnalytics;
window.closeAnalyticsModal = closeAnalyticsModal;
window.validatePromoterTicket = validatePromoterTicket;
