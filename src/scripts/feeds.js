var feeds = {};


/**
 * Shows a UI to request an OAuth token. This should only be called in response
 * to user interaction to avoid confusing the user. Since the resulting window
 * is shown with no standard window decorations, it can end up below all other
 * windows, with no way to detect that it was shown, and no way to reposition
 * it either.
 */
feeds.requestInteractiveAuthToken = function() {
  chrome.identity.getAuthToken({'interactive': true}, function (accessToken) {
    if (chrome.runtime.lastError || !authToken) return;

    feeds.fetchCalendars();
  });
};

/**
 * Sends a request to fetch the list of calendars for the currently-logged in
 * user. When calendars are received, it automatically initiates a request
 * for events from those calendars.
 */
feeds.fetchCalendars = function(type) {
  chrome.storage.local.get('calendars', function(storage) {

    var storedCalendars = storage['calendars'] || {};
    chrome.identity.getAuthToken({'interactive': true}, function (authToken) {
      if (chrome.runtime.lastError) {
        feeds.refreshUI();
        return;
      }

      $.ajax(constants.CALENDAR_LIST_API_URL, {
        headers: {
          'Authorization': 'Bearer ' + authToken
        },
        success: function(data) {
          var calendars = {};

          _.each(data.items, function(calendar){
            var storedCalendar = storedCalendars[calendar.id] || {};
            var calendarSelected = (calendar.selected)? true : false;

            var visible = (typeof storedCalendar.selected !== 'undefined') ?
                storedCalendar.selected : calendar.selected;

            var mergedCalendar = {
              id: calendar.id,
              summary: calendar.summary,
              description: calendar.description || '',
              foregroundColor: calendar.foregroundColor,
              backgroundColor: calendar.backgroundColor,
              colorId: calendar.colorId || '',
              selected: visible
            };

            if(storedCalendar.selected !== calendarSelected){
              // feeds.putCalendars(mergedCalendar, function(obj){});
            }

            calendars[calendar.id] = mergedCalendar;
          });

          chrome.storage.local.set({'calendars': calendars}, function() {
            if (chrome.runtime.lastError) {
              background.log('Error saving settings: ', chrome.runtime.lastError.message);
              return;
            }
            feeds.refreshUI();
          });
        },
        error: function(response) {

          if (response.status === 401) {
            // feeds.refreshUI();
            chrome.identity.removeCachedAuthToken({ 'token': authToken }, function() {});
          }
        }
      });

    });
  });
};

feeds.putCalendars = function(feed, callback){
  var feedUrl = constants.CALENDAR_LIST_API_URL + '/' + encodeURIComponent(feed.id) + '?' + 'colorRgbFormat=false';

  var obj = JSON.stringify({
    "selected": (feed.selected)? true : false,
    "colorId": (feed.colorId)? feed.colorId : 11
  });

  chrome.identity.getAuthToken({'interactive': false}, function (authToken) {
    if (chrome.runtime.lastError || !authToken) return;


    $.ajax({
      type: 'PUT',
      url: feedUrl,
      headers: {
        'Authorization': 'Bearer ' + authToken
      },
      data: obj,
      dataType: 'json',
      contentType: "application/json",
      success: function(response) {
        console.log('Successful Response:', response);
        callback(null);

      },
      error: function(response) {
        console.log("Failed Response:", response);

        if (response.status === 401) {
          // feeds.refreshUI();
          chrome.identity.removeCachedAuthToken({ 'token': authToken }, function() {});
        }
        // Must callback here, otherwise the caller keeps waiting for all calendars to load.
        callback(response);
      }
    });
  });
};


feeds.updateSets = function(){
  chrome.storage.local.get('calendars', function(calendarsObj) {
    chrome.storage.local.get('sets', function(setsObj) {

      var storedCalendars = calendarsObj['calendars'] || {};
      var storedSets = setsObj['sets'] || {};
      var newStoredCalendars = {};
      var compareCalendars = {}

      var setsObj = _.filter(storedSets, function(obj){
        return obj.selected === true;
      });

      _.each(storedCalendars, function(calendar){
        var calenderSelected = _.find(setsObj[0].selection, function(item){
          return calendar.id === item;
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

      chrome.storage.local.set({'calendars': newStoredCalendars}, function() {
        if (chrome.runtime.lastError) return;

        console.log("Starting API requests -------------------------");
        async.each(compareCalendars, function(calendar, callback) {
          _.defer(function(){
            feeds.putCalendars(calendar, function(response){callback(response)});
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
            chrome.tabs.query({active:true,windowType:"normal", currentWindow: true},function(d){
              var tabId = d[0].id;
              chrome.tabs.reload(tabId);
              chrome.extension.sendMessage({method: 'fieldset.radio.enable'});
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
 * Updates the 'minutes/hours/days until' visible badge from the events
 * obtained during the last fetch. Does not fetch new data.
 */
feeds.refreshUI = function() {

  // Notify the browser action in case it's open.
  chrome.extension.sendMessage({method: 'ui.refresh'});
};
