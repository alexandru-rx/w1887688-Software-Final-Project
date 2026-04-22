/****************************************************
 * EVENTS / FILTERING UI
 * Handles event loading, event cards, ticket selection,
 * filters, search and customer-side navigation
 ****************************************************/

async function loadEventsFromBackend() {
  try {
    const res = await apiFetch("/api/events", { method: "GET" });

    if (res?.events) {
      EVENT_DATA = res.events;
      filterEvents();
      renderDashboard?.();
    }
  } catch (err) {
    console.error("Failed to load events:", err);
  }
}

/****************************************************
 * EVENTS RENDERING + FILTERING (CUSTOMER VIEW)
 ****************************************************/

function renderEvents(events) {
  const eventsListEl = document.getElementById('events-list');
  if (!eventsListEl) return;

  eventsListEl.innerHTML = '';

  if (!events || events.length === 0) {
    eventsListEl.innerHTML = `
      <p style="color: var(--text-muted); padding: 2rem;">
        No events match your current filters. Try adjusting your location, date, or genre.
      </p>
    `;
    return;
  }

  events.forEach((event) => {
    const card = document.createElement('div');
    card.className = 'event-card';

    const genreDisplay = event.subGenre && !event.subGenre.startsWith('All ')
      ? event.subGenre
      : event.mainGenre;

    const ticketTypes = Array.isArray(event.ticketTypes) ? event.ticketTypes : [];
    const ticketTypeCount = ticketTypes.length || 1;

    const feeSourcePrice = ticketTypes.length
      ? Math.min(...ticketTypes.map((t) => Number(t.price) || 0))
      : Number(event.price) || 0;

    const bookingFee = feeSourcePrice * BOOKING_FEE_PERCENTAGE;

    const ticketTypeLabel =
      ticketTypeCount === 1
        ? '1 ticket type available'
        : `${ticketTypeCount} ticket types available`;

    card.innerHTML = `
      <img src="${event.image}" alt="${event.title}" class="card-image">
      <div class="card-content">
        <div class="card-date">${formatDate(event.date)} - ${genreDisplay}</div>
        <h3 class="card-title">${event.title}</h3>
        <p class="card-artist">By ${event.artist}</p>

        <div class="card-details">
          <div class="card-venue"><i data-lucide="building"></i>${event.venue}</div>
          <div class="card-location"><i data-lucide="map-pin"></i>${event.location}</div>
        </div>

        <div class="card-price-container">
          <div class="card-price-row">
            <span class="price-label">Tickets:</span>
            <span class="price-value">${ticketTypeLabel}</span>
          </div>
          <div class="card-price-row booking-fee-detail">
            <span class="price-label">Booking Fee:</span>
            <span class="price-value">From ${formatPrice(bookingFee)}</span>
          </div>
          <div class="price-separator"></div>
          <div class="card-price-row total-price">
            <span class="price-label">Pricing:</span>
            <span class="price-value">Shown after selection</span>
          </div>
        </div>

        <button class="purchase-btn" onclick="openTicketTypeModal('${event._id || event.id}')">
          <i data-lucide="ticket"></i> Get Tickets
        </button>
      </div>
    `;

    eventsListEl.appendChild(card);
  });

  lucide?.createIcons?.();
}

function getEventById(id) {
  return EVENT_DATA.find((e) => String(e._id || e.id) === String(id));
}

function openTicketTypeModal(eventId) {
  const overlay = document.getElementById('ticket-type-overlay');
  const modal = document.getElementById('ticket-type-modal');
  const optionsHost = document.getElementById('ticket-type-options');
  const info = document.getElementById('ticket-type-event-info');
  const qtyEl = document.getElementById('ticket-qty');

  if (!overlay || !modal || !optionsHost || !info || !qtyEl) return;

  const event = getEventById(eventId);
  if (!event) return;

  saveSelectedEventToStorage(event);

  let qty = 1;
  qtyEl.textContent = String(qty);

  info.innerHTML = `
    <strong>${event.artist} •  ${event.title}</strong><br/>
    ${formatDate(event.date)} • ${event.venue} • ${event.location}
  `;

  const ticketTypes = Array.isArray(event.ticketTypes) && event.ticketTypes.length
    ? event.ticketTypes
    : [{ id: 'standard', name: 'Standard', price: event.price }];

  let selectedType = ticketTypes[0];

 function renderOptions() {
  optionsHost.innerHTML = ticketTypes.map((t) => {
    const basePrice = Number(t.price) || 0;
    const bookingFee = basePrice * BOOKING_FEE_PERCENTAGE;
    const totalPrice = basePrice + bookingFee;

    return `
      <div class="ticket-type-option ${t.id === selectedType.id ? 'selected' : ''}" data-id="${t.id}">
        
        <div class="ticket-type-left">
          <div class="ticket-type-name">${t.name}</div>

          <div class="ticket-price-breakdown">
            <div>Ticket: ${formatPrice(basePrice)}</div>
            <div>Booking fee: ${formatPrice(bookingFee)}</div>
            <div class="ticket-total">Total: ${formatPrice(totalPrice)}</div>
          </div>
        </div>

        <div class="ticket-type-price">${formatPrice(totalPrice)}</div>
      </div>
    `;
  }).join('');
}

  renderOptions();

  optionsHost.onclick = (e) => {
    const opt = e.target.closest('.ticket-type-option');
    if (!opt) return;

    const id = opt.dataset.id;
    const found = ticketTypes.find((t) => t.id === id);
    if (!found) return;

    selectedType = found;
    renderOptions();
  };

  document.getElementById('qty-minus').onclick = () => {
    qty = Math.max(1, qty - 1);
    qtyEl.textContent = String(qty);
  };

  document.getElementById('qty-plus').onclick = () => {
    qty = Math.min(10, qty + 1);
    qtyEl.textContent = String(qty);
  };

  document.getElementById('confirm-ticket-btn').onclick = async () => {
    saveSelectedTicketToStorage({
      eventId: event.id || event._id,
      ticketTypeId: selectedType.id,
      ticketType: selectedType.name,
      qty,
      unitPrice: Number(selectedType.price) || 0
    });

    const guest = getGuestFromStorage?.();
    await fetchCurrentUser();

    const alreadyAuthenticated = USER_STATE?.isLoggedIn && !!USER_STATE.userEmail;
    const alreadyGuest = !!(guest && guest.email);

    if (alreadyAuthenticated || alreadyGuest) {
      window.location.href = 'Payment.html';
    } else {
      window.location.href = 'LoginSystem.html?next=payment';
    }
  };

  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  lucide?.createIcons?.();
}

function closeTicketTypeModal() {
  const overlay = document.getElementById('ticket-type-overlay');
  const modal = document.getElementById('ticket-type-modal');
  if (!overlay || !modal) return;

  overlay.classList.add('hidden');
  modal.classList.add('hidden');
}

function updateFilterDisplay() {
  const locationVal = document.getElementById('location-value');
  const datesVal = document.getElementById('dates-value');
  const genreVal = document.getElementById('genre-value');

  if (locationVal) locationVal.textContent = CURRENT_FILTERS.location;

  if (datesVal) {
    const filterCopy = new Date(CURRENT_FILTERS.date);
    filterCopy.setHours(0, 0, 0, 0);

    const todayCopy = new Date(TODAY);
    todayCopy.setHours(0, 0, 0, 0);

    datesVal.textContent = (filterCopy.getTime() === todayCopy.getTime())
      ? 'All Dates'
      : formatDate(CURRENT_FILTERS.date);
  }

  if (genreVal) {
    const label = (CURRENT_FILTERS.subGenre !== CURRENT_FILTERS.genre)
      ? CURRENT_FILTERS.subGenre
      : CURRENT_FILTERS.genre;

    genreVal.textContent = label;
  }
}

function filterEvents() {
  const query = CURRENT_FILTERS.searchQuery.toLowerCase();

  const filtered = EVENT_DATA.filter((event) => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);

    const filterDate = new Date(CURRENT_FILTERS.date);
    filterDate.setHours(0, 0, 0, 0);

    const isFutureEvent = eventDate >= TODAY;

    const locationMatch =
      CURRENT_FILTERS.location === 'All Of England' ||
      event.location === CURRENT_FILTERS.location;

    let dateMatch = true;

    const filterIsAllDates = (() => {
      const f = new Date(CURRENT_FILTERS.date);
      f.setHours(0, 0, 0, 0);

      const t = new Date(TODAY);
      t.setHours(0, 0, 0, 0);

      return f.getTime() === t.getTime();
    })();

    if (filterIsAllDates) {
      dateMatch = isFutureEvent;
    } else {
      dateMatch = eventDate.getTime() === filterDate.getTime();
    }

    let genreMatch = false;
    if (CURRENT_FILTERS.genre === 'All Genres') {
      genreMatch = true;
    } else if (
      CURRENT_FILTERS.subGenre === CURRENT_FILTERS.genre ||
      CURRENT_FILTERS.subGenre.startsWith('All ')
    ) {
      genreMatch = event.mainGenre === CURRENT_FILTERS.genre;
    } else {
      genreMatch = event.subGenre === CURRENT_FILTERS.subGenre;
    }

    const searchMatch =
      !query ||
      event.artist.toLowerCase().includes(query) ||
      event.title.toLowerCase().includes(query) ||
      event.venue.toLowerCase().includes(query);

    return locationMatch && dateMatch && genreMatch && searchMatch;
  });

  renderEvents(filtered);
  updateFilterDisplay();
}

/****************************************************
 * LOCATION DROPDOWN
 ****************************************************/

function renderLocationDropdown() {
  const dropdown = document.getElementById('location-dropdown-menu');
  if (!dropdown) return;

  dropdown.innerHTML = '';

  UK_LOCATIONS.forEach((loc) => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.textContent = loc;

    if (loc === CURRENT_FILTERS.location) item.classList.add('selected');

    item.addEventListener('click', () => {
      CURRENT_FILTERS.location = loc;
      filterEvents();

      dropdown.classList.add('hidden');
      document.getElementById('location-filter-segment')?.setAttribute('aria-expanded', 'false');
      overlayEl.classList.add('hidden');
    });

    dropdown.appendChild(item);
  });
}

function toggleLocationDropdown() {
  const dropdown = document.getElementById('location-dropdown-menu');
  const segment = document.getElementById('location-filter-segment');
  if (!dropdown || !segment) return;

  const isHidden = dropdown.classList.contains('hidden');

  document.querySelectorAll('.location-dropdown').forEach((el) => el.classList.add('hidden'));

  if (isHidden) {
    dropdown.classList.remove('hidden');
    segment.setAttribute('aria-expanded', 'true');
    overlayEl.classList.remove('hidden');

    const rect = segment.getBoundingClientRect();
    dropdown.style.width = `${rect.width}px`;
  } else {
    dropdown.classList.add('hidden');
    segment.setAttribute('aria-expanded', 'false');
    overlayEl.classList.add('hidden');
  }
}

/****************************************************
 * DATE PICKER MODAL
 ****************************************************/

const overlayEl = document.createElement('div');
overlayEl.id = 'overlay';
overlayEl.className = 'overlay hidden';

let datePickerModal = null;
let datesGridEl = null;
let monthSelect = null;
let yearSelect = null;

function setupDatePickerRefs() {
  datePickerModal = document.getElementById('date-picker-modal');
  datesGridEl = document.getElementById('dates-grid');
  monthSelect = document.getElementById('month-select');
  yearSelect = document.getElementById('year-select');
}

/****************************************************
 * DATE PICKER: MONTH NAVIGATION
 ****************************************************/
function changeMonth(direction) {
  const newDate = new Date(CURRENT_CALENDAR_DATE);
  newDate.setMonth(newDate.getMonth() + direction);
  CURRENT_CALENDAR_DATE = newDate;
  renderCalendar();
}

function renderCalendar() {
  if (!datesGridEl || !monthSelect || !yearSelect) return;

  datesGridEl.innerHTML = '';

  const year = CURRENT_CALENDAR_DATE.getFullYear();
  const month = CURRENT_CALENDAR_DATE.getMonth();

  monthSelect.value = month;
  yearSelect.value = year;

  const firstOfMonth = new Date(year, month, 1);
  let startDay = firstOfMonth.getDay();
  startDay = (startDay === 0) ? 6 : startDay - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < startDay; i++) {
    datesGridEl.appendChild(document.createElement('div'));
  }

  const todayCopy = new Date(TODAY);
  todayCopy.setHours(0, 0, 0, 0);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    dateObj.setHours(0, 0, 0, 0);

    const dayEl = document.createElement('div');
    dayEl.className = 'date-day';
    dayEl.textContent = d;

    if (dateObj < todayCopy) {
      dayEl.classList.add('inactive');
    } else {
      dayEl.classList.add('available');

      dayEl.addEventListener('click', () => {
        document.querySelectorAll('.date-day').forEach((el) => el.classList.remove('selected'));
        dayEl.classList.add('selected');

        CURRENT_CALENDAR_DATE = new Date(dateObj);
        CURRENT_FILTERS.date = new Date(dateObj);

        filterEvents();
        closeDatePickerModal();
      });
    }

    const filterCopy = new Date(CURRENT_FILTERS.date);
    filterCopy.setHours(0, 0, 0, 0);
    if (filterCopy.getTime() === dateObj.getTime()) {
      dayEl.classList.add('selected');
    }

    datesGridEl.appendChild(dayEl);
  }
}

function openDatePickerModal() {
  if (!datePickerModal) setupDatePickerRefs();
  if (!datePickerModal) return;

  datePickerModal.classList.remove('hidden');
  overlayEl.classList.remove('hidden');

  CURRENT_CALENDAR_DATE = new Date(CURRENT_FILTERS.date);
  renderCalendar();
}

function closeDatePickerModal() {
  if (!datePickerModal) return;
  datePickerModal.classList.add('hidden');
  overlayEl.classList.add('hidden');
}

function confirmSelectedDate() {
  CURRENT_FILTERS.date = new Date(CURRENT_CALENDAR_DATE);
  filterEvents();
  closeDatePickerModal();
}

function resetDateFilter() {
  CURRENT_FILTERS.date = new Date(TODAY);
  CURRENT_CALENDAR_DATE = new Date(TODAY);
  filterEvents();
  closeDatePickerModal();
}

/****************************************************
 * GENRE MODAL
 ****************************************************/

let genreModal = null;
let mainGenreListEl = null;
let subGenreListEl = null;

function setupGenreModalRefs() {
  genreModal = document.getElementById('genre-modal');
  mainGenreListEl = document.getElementById('main-genre-list');
  subGenreListEl = document.getElementById('sub-genre-list');
}

function selectMainGenre(mainGenre) {
  if (!mainGenreListEl || !subGenreListEl) return;

  document.querySelectorAll('.main-genre-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.genre === mainGenre);
  });

  subGenreListEl.innerHTML = '';
  const subGenres = GENRE_DATA[mainGenre] || [];

  subGenres.forEach((sub) => {
    const item = document.createElement('div');
    item.className = 'genre-item';
    item.textContent = sub;
    item.dataset.main = mainGenre;
    item.dataset.sub = sub;

    if (sub === CURRENT_FILTERS.subGenre) item.classList.add('selected');

    item.addEventListener('click', () => {
      CURRENT_FILTERS.genre = mainGenre;
      CURRENT_FILTERS.subGenre = sub;
      filterEvents();
      closeGenreModal();
    });

    subGenreListEl.appendChild(item);
  });
}

function renderGenreModal() {
  if (!genreModal) setupGenreModalRefs();
  if (!mainGenreListEl) return;

  mainGenreListEl.innerHTML = '';
  const mainGenres = Object.keys(GENRE_DATA);

  mainGenres.forEach((main) => {
    const div = document.createElement('div');
    div.className = 'main-genre-item';
    div.dataset.genre = main;

    const isActive =
      CURRENT_FILTERS.genre === main ||
      GENRE_DATA[main].includes(CURRENT_FILTERS.subGenre);

    if (isActive) div.classList.add('active');

    div.innerHTML = `
      <span>${main}</span>
      ${GENRE_DATA[main].length > 1 ? '<i data-lucide="chevron-right"></i>' : ''}
    `;

    div.addEventListener('click', () => selectMainGenre(main));
    mainGenreListEl.appendChild(div);
  });

  selectMainGenre(CURRENT_FILTERS.genre);
  lucide?.createIcons?.();
}

function openGenreModal() {
  if (!genreModal) setupGenreModalRefs();
  if (!genreModal) return;

  renderGenreModal();
  genreModal.classList.remove('hidden');
  overlayEl.classList.remove('hidden');
}

function closeGenreModal() {
  if (!genreModal) return;
  genreModal.classList.add('hidden');
  overlayEl.classList.add('hidden');
}

/****************************************************
 * SEARCH + NAVIGATION
 ****************************************************/

function handleSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  CURRENT_FILTERS.searchQuery = input.value || '';
  filterEvents();
}

function switchView(viewName) {
  const searchContainer = document.querySelector('.search-container');

  const eventsView = document.getElementById('events-view');
  const supportView = document.getElementById('support-view');
  const dashView = document.getElementById('dashboard-view');

  const navEvents = document.getElementById('nav-events');
  const navSupport = document.getElementById('nav-support');
  const navDash = document.getElementById('nav-dashboard');

  if (!eventsView || !dashView) return;

  eventsView.classList.add('hidden');
  supportView?.classList.add('hidden');
  dashView.classList.add('hidden');

  navEvents?.classList.remove('active');
  navSupport?.classList.remove('active');
  navDash?.classList.remove('active');

  if (viewName === 'events') {
    searchContainer?.classList.remove('hidden');
    eventsView.classList.remove('hidden');
    navEvents?.classList.add('active');
    return;
  }

  if (viewName === 'support') {
    searchContainer?.classList.add('hidden');
    supportView?.classList.remove('hidden');
    navSupport?.classList.add('active');
    return;
  }

  if (viewName === 'dashboard') {
    if (!USER_STATE.isLoggedIn || USER_STATE.userRole !== 'promoter') {
      searchContainer?.classList.remove('hidden');
      eventsView.classList.remove('hidden');
      navEvents?.classList.add('active');
      return;
    }

    searchContainer?.classList.add('hidden');
    dashView.classList.remove('hidden');
    navDash?.classList.add('active');

    renderDashboard(CURRENT_DASHBOARD_FILTER || 'all');
    return;
  }

  searchContainer?.classList.remove('hidden');
  eventsView.classList.remove('hidden');
  navEvents?.classList.add('active');
}

window.openTicketTypeModal = openTicketTypeModal;
window.closeTicketTypeModal = closeTicketTypeModal;
window.toggleLocationDropdown = toggleLocationDropdown;
window.openDatePickerModal = openDatePickerModal;
window.openGenreModal = openGenreModal;
window.closeGenreModal = closeGenreModal;
window.handleSearch = handleSearch;
window.switchView = switchView;
