/**
 * Namespace for constants.
 */
var constants = {};


/**
 * The current version of Google Calendar API.
 * @type {string}
 * @const
 */
constants.CALENDAR_API_VER = "v3"

/**
 * The URL of the browser UI for Google Calendar.
 * @type {string}
 * @const
 */
constants.CALENDAR_UI_URL = 'https://calendar.google.com/calendar/';

/**
 * The URL of the browser UI for Google Calendar.
 * @type {string}
 * @const
 */
constants.CALENDAR_API_URL = 'https://www.googleapis.com/calendar/';


/**
 * The for Google Calendar list API Call.
 * @type {string}
 * @const
 */
constants.CALENDAR_LIST_API_URL = constants.CALENDAR_API_URL + constants.CALENDAR_API_VER + '/users/me/calendarList';

/**
 * The for Google Calendars API Call.
 * @type {string}
 * @const
 */
constants.CALENDARS_API_URL = constants.CALENDAR_API_URL + constants.CALENDAR_API_VER + '/calendars'


/**
 * Namespace for constants storage
 */
constants.storage = {}


/**
 * The for local storage Calendars
 * @type {string}
 * @const
 */
constants.storage.calendars = 'calendars'


/**
 * The for local storage Sets
 * @type {string}
 * @const
 */
constants.storage.set = 'sets'



/**
 * The for local storage Settings
 * @type {string}
 * @const
 */
constants.storage.setting = 'settings'
