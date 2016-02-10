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
 * Global Set new data to local storage for calendars.
 * Label is the name of the storage, data The properties to update,
 * callback function
 * @type {label, Object, function}
 * @Public
 */
storage.local.putStorage = function(label, data, callback){
  var obj = {};
  obj[label] = data;
  chrome.storage.local.set(obj, function() {
    if (chrome.runtime.lastError) return;

    if(callback) callback();
  });
};

/**
 * Get data to local storage for calendars and return
 * storage to callback
 * @type {label, function} Label is the name of the storage, callback function
 * @Public
 */
storage.local.getStorage = function(label, callback){
  chrome.storage.local.get(label, function(storage) {
    if (chrome.runtime.lastError) return;
    var data = storage[label] || {};

    if(callback) callback(data);
  });
};
