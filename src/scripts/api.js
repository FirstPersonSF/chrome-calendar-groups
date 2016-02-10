/**
 * Namespace for API functionality.
 */
 var api = {};

/**
 * Namespace for Authentication functionality.
 * @type {Object.<function>}
 * @private
 */
api.auth = {};

/**
 * Namespace for Calendars functionality.
 * @type {Object.<function>}
 * @private
 */
api.calendars = {};

/**
 * Get Authentication token and return if there one or not
 * @type {object, function} Params for Auth, Callback function
 * @Public
 */
api.auth.getToken = function(params, callback){
  chrome.identity.getAuthToken(params, function (authToken) {
    if(callback){
      if (chrome.runtime.lastError || !authToken){
        callback(null);
      }else{
        callback(authToken);
      }
    }
  });
};

/**
 * Delete Authentication token
 * @type {function} Callback function
 * @Public
 */
api.auth.deleteToken = function(callback){
  api.auth.getToken({'interactive': true}, function(accessToken){
    chrome.identity.removeCachedAuthToken({'token': accessToken}, function(){
      if(callback) callback();
    });
  });
};

/**
 * Get API retrieve calendars list
 * @Public
 */
api.calendars.getList = function(success, error){
  api.auth.getToken({'interactive': true}, function(authToken){
    if (chrome.runtime.lastError || !authToken) {
      calendars.refreshUI();
      return;
    }

    var returnApi = $.ajax({
      type: 'GET',
      url: constants.CALENDAR_LIST_API_URL,
      headers: {
        'Authorization': 'Bearer ' + authToken
      },
      success: function(response){
        if(success) success(response);
      },
      error: function(response){
        if (response.status === 401) api.auth.deleteToken(calendars.refreshUI);
        if(error) error(response);
      }
    });

  });
};

/**
 * Put API update calendars list
 * @Public
 */
api.calendars.putList = function(calendarid, data, success, error){
  chrome.identity.getAuthToken({'interactive': false}, function (authToken) {
    if (chrome.runtime.lastError || !authToken) {
      calendars.refreshUI();
      return;
    }

    $.ajax({
      type: 'PUT',
      url: constants.CALENDAR_LIST_API_URL + '/' + encodeURIComponent(calendarid) + '?' + 'colorRgbFormat=false',
      headers: {
        'Authorization': 'Bearer ' + authToken
      },
      data: data,
      dataType: 'json',
      contentType: "application/json",
      success: function(response) {
        if(success) success(response);
      },
      error: function(response) {
        if (response.status === 401) api.auth.deleteToken(calendars.refreshUI);
        if(error) error(response);
      }
    });
  });
};

/**
 * Get API retrieve calendars list
 * @Public
 */
api.calendars.getCalendars = function(getCalendarId, success, error){
  api.auth.getToken({'interactive': true}, function(authToken){
    if (chrome.runtime.lastError || !authToken) {
      calendars.refreshUI();
      return;
    }

    var urlId = (getCalendarId)? '/' + getCalendarId : '';
    var returnApi = $.ajax({
      type: 'GET',
      url: constants.CALENDARS_API_URL + urlId,
      headers: {
        'Authorization': 'Bearer ' + authToken
      },
      success: function(response){
        if(success) success(response);
      },
      error: function(response){
        if (response.status === 401) api.auth.deleteToken(calendars.refreshUI);
        if(error) error(response);
      }
    });

  });
};
