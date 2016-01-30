/**
 * The namespace for Store data to local Storage functionality.
 * @namespace
 */
var storage = {}


/**
 * Initializes the local Storage by registering listeners.
 */
storage.initialize = function() {
  storage.getGroup ();
};


storage.setCalendars = function(){};
storage.getCalendars= function(){};

storage.setGroup = function(data, callback){
  chrome.storage.local.set({'sets': setsStorage}, function() {
    if (chrome.runtime.lastError) return;

    callback();
  });
};


storage.getGroup = function(callback){
  chrome.storage.local.get('sets', function(storage) {
    if (chrome.runtime.lastError) return;

    var groups = storage['sets'] || {};

    // callback(groups);
  });
};


storage.initialize();
