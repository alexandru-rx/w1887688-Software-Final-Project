/****************************************************
 * CONFIG / GLOBAL STATE
 * Stores shared data, constants and app state
 * used across the Ticket Wizard frontend
 ****************************************************/

// UK Location Data
window.UK_LOCATIONS = window.UK_LOCATIONS || [
  'All Of England',
  'London',
  'Manchester',
  'Birmingham',
  'Liverpool',
  'Leeds',
  'Bristol',
  'Nottingham',
  'Brighton',
  'Leicester',
  'Bournemouth'
];

var UK_LOCATIONS = window.UK_LOCATIONS;

// Genre Data (Main and Sub-Genres)
window.GENRE_DATA = window.GENRE_DATA || {
  'All Genres': ['All Genres'],
  'Pop': ['All Pop', 'Pop Rock', 'Synth Pop', 'Teen Pop'],
  'Rock/Indie': ['All Rock/Indie', 'Alternative', 'Punk', 'Classic Rock',],
  'Hip Hop/R&B': ['All Hip Hop/R&B', 'Trap', 'Grime', 'Pop Rap'],
  'Electronic/Dance': ['All Electronic/Dance', 'House', 'Techno', 'Drum & Bass', 'Trance', 'Garage'],
  'Classical': ['All Classical', 'Opera', 'Chamber Music'],
  'Jazz/Blues': ['All Jazz/Blues'],
  'Other Genres': ['All Other Genres', 'Afrobeat', 'Dancehall' , 'Folk'],
};

var GENRE_DATA = window.GENRE_DATA;

window.EVENT_DATA = window.EVENT_DATA || [];
var EVENT_DATA = window.EVENT_DATA;

/****************************************************
 * GLOBAL APP STATE
 * Filters, calendar state, and logged-in user session
 ****************************************************/

var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
var BOOKING_FEE_PERCENTAGE = 0.10;

window.CURRENT_FILTERS = window.CURRENT_FILTERS || {
  location: "All Of England",
  date: new Date(TODAY),
  genre: "All Genres",
  subGenre: "All Genres",
  searchQuery: ""
};
var CURRENT_FILTERS = window.CURRENT_FILTERS;

window.CURRENT_CALENDAR_DATE = window.CURRENT_CALENDAR_DATE || new Date(TODAY);
var CURRENT_CALENDAR_DATE = window.CURRENT_CALENDAR_DATE;

window.USER_STATE = window.USER_STATE || {
  isLoggedIn: false,
  userEmail: null,
  userRole: "guest",
  userName: null
};
var USER_STATE = window.USER_STATE;

var USER_STORAGE_KEY = "ticketwizard_user";
var ORDERS_STORAGE_KEY = "ticketwizard_orders";
var LAST_ORDER_ID_KEY = "ticketwizard_last_order_id";
var SELECTED_EVENT_KEY = "ticketwizard_selected_event";
var SELECTED_TICKET_KEY = "ticketwizard_selected_ticket";
var GUEST_STORAGE_KEY = "ticketwizard_guest";

window.API_BASE = window.API_BASE || "http://127.0.0.1:5000";
var API_BASE = window.API_BASE;

var IS_PROCESSING_PAYMENT = false;