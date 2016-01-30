/**
 * The namespace for Store data to local Storage functionality.
 * @namespace
 */
var storage = {}
storage.local = {}


/**
 * Initializes the local Storage by registering listeners.
 */
storage.initialize = function() {
  // storage.local.getSets();
};


storage.setCalendars = function(){};
storage.getCalendars= function(){};

storage.local.putSets = function(data, callback){
  chrome.storage.local.set({'sets': data}, function() {
    if (chrome.runtime.lastError) return;

    if(callback) callback();
  });
};


storage.local.getSets = function(callback){
  chrome.storage.local.get('sets', function(storage) {
    if (chrome.runtime.lastError) return;

    var sets = storage['sets'] || {};

    if(callback) callback(sets);
  });
};


storage.initialize();
