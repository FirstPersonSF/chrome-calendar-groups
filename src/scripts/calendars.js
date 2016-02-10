/**
 * The namespace for Calendars functionality.
 * @namespace
 */
var calendars = {};


/**
 * Shows a UI to request an OAuth token. This should only be called in response
 * to user interaction to avoid confusing the user. Since the resulting window
 * is shown with no standard window decorations, it can end up below all other
 * windows, with no way to detect that it was shown, and no way to reposition
 * it either.
 */
calendars.requestInteractiveAuthToken = function() {
  api.auth.getToken({'interactive': true}, function(accessToken){
    if (chrome.runtime.lastError || !authToken) return;

    calendars.fetchCalendars();
  });
};

/**
 * Sends a request to fetch the list of calendars for the currently-logged in
 * user. When calendars are received, it automatically initiates a request
 * for events from those calendars. Update localstoage to api
 * @type string.<update>
 * @Public
 */
calendars.fetchCalendars = function(type) {
  storage.local.getStorage(constants.storage.calendars, function(calendarsStorage){

    api.calendars.getList(function(successResponse){
      // New List
      var calendars = {};

      _.each(successResponse.items, function(calendar){
        var storedCalendar = calendarsStorage[calendar.id] || {};
        var calendarSelected = (calendar.selected)? true : false;

        // Update storage update
        if(type == 'update'){
          calendarSelected = (typeof storedCalendar.selected !== 'undefined') ?
            storedCalendar.selected : calendar.selected;
        }

        var mergedCalendar = {
          id: calendar.id,
          summary: calendar.summary,
          description: calendar.description || '',
          foregroundColor: calendar.foregroundColor,
          backgroundColor: calendar.backgroundColor,
          colorId: calendar.colorId || '',
          selected: calendarSelected
        };


        // Option.html
        if(storedCalendar.selected !== calendarSelected && type == 'update'){
          calendars.putCalendars(mergedCalendar);
        }

        calendars[calendar.id] = mergedCalendar;
      });

      storage.local.putStorage(constants.storage.calendars, calendars, calendars.refreshUI);

    });
  });
};

/**
 * Retrieve list of calendars and list of sets and compare which
 * calendar is selected and update calendar api. When the update
 * api is done reload window and close page action.
 * @typedef {{
 *   id: (string|unique id),
 *   summary: (string),
 *   description: (string),
 *   foregroundColor: (string),
 *   backgroundColor: (string),
 *   colorId: (intger),
 *   selected: (boolean|false)
 * }}
 * @private
 */
calendars.updateSets = function(){

  storage.local.getStorage(constants.storage.calendars, function(calendarsStorage){
    storage.local.getStorage(constants.storage.set, function(setsStorage){
      var newStoredCalendars = {};
      var compareCalendars = {};
      var setsObj = _.filter(setsStorage, function(obj){return obj.selected === true;});

      // new data and compare data
      _.each(calendarsStorage, function(calendar){
        console.log(setsObj[0]);
        var calenderSelected = _.find(setsObj[0].selection, function(item){
          return calendar.id === item.id;
        });

        var mergedCalendar = {
          id: calendar.id,
          summary: calendar.summary,
          description: calendar.description || '',
          foregroundColor: calendar.foregroundColor,
          backgroundColor: calendar.backgroundColor,
          colorId: calendar.colorId || '',
          selected: false
        };

        if(calenderSelected){
          mergedCalendar.selected = true;
        }

        var calendarSelected = (calendar.selected)? true : false;
        if(mergedCalendar.selected != calendarSelected){
          compareCalendars[mergedCalendar.id] = mergedCalendar;
        }
        newStoredCalendars[mergedCalendar.id] = mergedCalendar;
      });

      console.log("Calendars affected:");
      _.each(compareCalendars, function(compareCalendar) {
        console.log("> " + compareCalendar.summary + ": " + compareCalendar.selected);
      });

      // Change data
      storage.local.putStorage(constants.storage.calendars, newStoredCalendars, function(){
        console.log("Starting API requests -------------------------");
        async.each(compareCalendars, function(calendar, callback) {
          _.defer(function(){
            calendars.putCalendars(calendar, function(response){callback(response)});
          });

        }, function(error){

          // if any of the file processing produced an error, err would equal that error
          if( error ) {
            // One of the iterations produced an error.
            // All processing will now stop.
             console.log('A request failed: ', error);
             console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
          } else {

            //Get currrent tab id then reload tab
            chrome.tabs.query({active:true, windowType:"normal", currentWindow: true},function(d){
              var tabId = d[0].id;
              chrome.tabs.reload(tabId);
              chrome.extension.sendMessage({method: 'selection.sets.enable'});
              chrome.extension.sendMessage({method: 'ui.close'});
            });

            console.log('All requests were successful');
            console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
          }
        });
      });

    });
  });
};


/**
 * Sends a request to fetch the list of calendars for the currently-logged in
 * user. When calendars are received, it automatically initiates a request
 * for events from those calendars. Update localstoage to api
 * @typedef {{
 *   id: (string|unique id),
 *   summary: (string),
 *   description: (string),
 *   foregroundColor: (string),
 *   backgroundColor: (string),
 *   colorId: (intger),
 *   selected: (boolean|false)
 * }}
 * @private
 */
calendars.putCalendars = function(calendarObj, callback){

  var apiObj = JSON.stringify({
    "selected": (calendarObj.selected)? true : false,
    "colorId": (calendarObj.colorId)? calendarObj.colorId : 11
  });

  api.calendars.putList(calendarObj.id, apiObj, function(successResponse){
    console.log('Successful Response:', successResponse);

    callback(null);
  }, function(errorResponse){
    console.log("Failed Response:", errorResponse);

    // Must callback here, otherwise the caller keeps waiting for all calendars to load.
    callback(errorResponse);
  });
};


/**
 * Updates the 'minutes/hours/days until' visible badge from the events
 * obtained during the last fetch. Does not fetch new data.
 */
calendars.refreshUI = function() {

  // Notify the browser action in case it's open.
  chrome.extension.sendMessage({method: 'ui.refresh'});
};

/**
 * Check user if its there first time and init setting.
 */
calendars.firstTimeUser = function(){
  storage.local.getStorage(constants.storage.setting, function(settingsStorage){
    if(!_.isEmpty(settingsStorage)) return;

    settingsStorage['init'] = {firstTime: false};
    storage.local.putStorage(constants.storage.setting, settingsStorage, function(){
      calendars.createDefaultGroup();
    });

  });
};

/**
 * Create first group for first time user
 * @typedef {{
 *   id: (string|unique id),
 *   title: (string),
 *   selection: {Array.<string>},
 *   selected: (boolean|false)
 * }}
 * @private
 */
calendars.createDefaultGroup = function(){
  api.calendars.getCalendars('primary', function(response){
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });

    var set = {
      id: uuid,
      title: 'My Calendar',
      selection: [{id: response.id, summary: response.summary}],
      selected: false,
      order:1
    };

    storage.local.getStorage(constants.storage.set, function(setsStorage){
      setsStorage[set.id] = set;
      storage.local.putStorage(constants.storage.set, setsStorage, chrome.extension.sendMessage({method: 'ui.refresh'}));
    });

  });
};
