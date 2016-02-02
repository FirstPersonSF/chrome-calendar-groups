/**
 * The namespace for Store data to Storage functionality.
 * @namespace
 */
var storage = {}

/**
 * The namespace for local storage functionality.
 * @type {Object.<function>}
 * @private
 */
storage.local = {}

/**
 * Set new data to local storage for calendars.
 * @type {Object, function} data The properties to update, callback function
 * @Public
 */
storage.local.putCalendars = function(data, callback){
  chrome.storage.local.set({'calendars': data}, function() {
    if (chrome.runtime.lastError) return;

    if(callback) callback();
  });
};

/**
 * Get data to local storage for calendars and return
 * storage to callback
 * @type {function} callback function
 * @Public
 */
storage.local.getCalendars = function(callback){
  chrome.storage.local.get('calendars', function(storage) {
    if (chrome.runtime.lastError) return;
    var calendars = storage['calendars'] || {};

    if(callback) callback(calendars);
  });
};

/**
 * Set new data to local storage for sets.
 * @type {Object, function} data The properties to update, callback function
 * @Public
 */
storage.local.putSets = function(data, callback){
  chrome.storage.local.set({'sets': data}, function() {
    if (chrome.runtime.lastError) return;

    if(callback) callback();
  });
};

/**
 * Get data to local storage for sets  and return
 * storage to callbacks
 * @type {function} callback function
 * @Public
 */
storage.local.getSets = function(callback){
  chrome.storage.local.get('sets', function(storage) {
    if (chrome.runtime.lastError) return;

    var sets = storage['sets'] || {};

    if(callback) callback(sets);
  });
};

