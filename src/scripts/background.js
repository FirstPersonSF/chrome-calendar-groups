chrome.runtime.onInstalled.addListener(function() {
  // Replace all rules ...
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    // With a new rule ...
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // That fires when a page's URL contains a 'g' ...
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlContains: 'calendar.google.com/calendar' },
          })
        ],

        // And shows the extension's page action.
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      }
    ]);
  });
})


/**
 * The namespace for background page related functionality.
 * @namespace
 */
var background = {};
background.logs_ = [];

/**
 * Initializes the background page by registering listeners.
 */
background.initialize = function() {
  background.listenForRequests();
  background.listenForTabUpdates();
  scheduler.start();
};

background.listenForRequests = function() {
  chrome.extension.onMessage.addListener(function(request, sender, opt_callback) {
    switch(request.method) {
      case 'authtoken.update':
        feeds.requestInteractiveAuthToken();
        break;
    }

    // Indicates to Chrome that a pending async request will eventually issue
    // the callback passed to this function.
    return true;
  });
};

background.listenForTabUpdates = function() {
  // console.log('background.listenForTabUpdates');
};





var scheduler = {};
scheduler.BADGE_UPDATE_INTERVAL_MS_ = 60 * 1000;
scheduler.start = function() {
  // Do a one-time initial fetch on load. Settings are only refreshed when restarting Chrome.
  feeds.fetchCalendars();

  window.setInterval(function() {
    // feeds.refreshUI();
    feeds.fetchCalendars();
  }, scheduler.BADGE_UPDATE_INTERVAL_MS_);
};


background.initialize();
