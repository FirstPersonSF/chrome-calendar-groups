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
