var popupAction = {};


popupAction.initialize = function() {
  popupAction.fillMessages();
  popupAction.installButtonClickHandlers();
  popupAction.showLoginMessageIfNotAuthenticated();
  popupAction.listenForRequests();
  popupAction.loadInputSelection();
  popupAction.displaySetsGroup();
};


popupAction.fillMessages = function() {

  // Load internationalized messages.
  $('.i18n').each(function() {
    var i18nText = chrome.i18n.getMessage($(this).attr('id').toString());
    if (!i18nText) {
      chrome.extension.getBackgroundPage().background.log(
          'Error getting string for: ', $(this).attr('id').toString());
      return;
    }

    if ($(this).prop('tagName') == 'IMG') {
      $(this).attr({'title': i18nText});
    } else {
      $(this).text(i18nText);
    }
  });

  $('[data-href="calendar_ui_url"]').attr('href', constants.CALENDAR_UI_URL);
};

/** @private */
popupAction.installButtonClickHandlers = function() {
  $('#authorization_required').on('click', function() {
    $('#authorization_required').text(chrome.i18n.getMessage('authorization_in_progress'));
    chrome.extension.sendMessage({method: 'authtoken.update'});
  });
};


/**
 * Checks if we're logged in and either shows or hides a message asking
 * the user to login.
 * @private
 */
popupAction.showLoginMessageIfNotAuthenticated = function() {
  chrome.identity.getAuthToken({'interactive': false}, function (authToken) {
    if (chrome.runtime.lastError || !authToken) {
      chrome.extension.getBackgroundPage().background.log('getAuthToken',
          chrome.runtime.lastError.message);
      popupAction.stopSpinnerRightNow();
      $('#error-auth').show();
      $('#content-body').hide();
    } else {
      $('#error-auth').hide();
      $('#content-body').show();
    }
  });
};


popupAction.startSpinner = function() {
  $('#sync_now').addClass('spinning');
};

popupAction.stopSpinner = function() {
  $('#sync_now').one('animationiteration webkitAnimationIteration', function() {
    $(this).removeClass('spinning');
  });
};

popupAction.stopSpinnerRightNow = function() {
  $('#sync_now').removeClass('spinning');
};


/**
 * Listens for incoming requests from other pages of this extension and calls
 * the appropriate (local) functions.
 * @private
 */
popupAction.listenForRequests = function() {
  chrome.extension.onMessage.addListener(function(request, sender, opt_callback) {
    switch(request.method) {
      case 'ui.refresh':
        popupAction.showLoginMessageIfNotAuthenticated();
        popupAction.loadInputSelection();
        popupAction.displaySetsGroup();
        break;

      case 'sync-icon.spinning.start':
        popupAction.startSpinner();
        break;

      case 'sync-icon.spinning.stop':
        popupAction.stopSpinner();
        break;
    }
  });
};

popupAction.loadInputSelection = function() {
  var el = $('#selection-list');
  el.find('.select-calendar').empty();

  chrome.storage.local.get('calendars', function(storage) {

    if (storage['calendars']) {
      var calendars = storage['calendars'];
      _.each(calendars, function(calendar){
        el.find('.select-calendar').append('<option value="'+calendar.id+'">'+calendar.summary+'</option>');
      });

      // Plugin Select
      var select2 = el.find('.select-calendar').select2({
        placeholder: "Select Group",
      });

      el.find('button').click(function(e){
        e.preventDefault();
        var selection = el.find('.select-calendar').val();
        var title = el.find('.group-name').val();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
        });

        var obj = {
          'id': uuid,
          "title": title,
          "selection": selection,
          "selected": false
        };

        popupAction.tempStorage(obj);

        el.find('.group-name').val('');
        el.find('.select-calendar').val('');
        el.find('.select-calendar').select2({
          data: null
        });

      });

    }
  });
};

popupAction.tempStorage = function(sets){
  chrome.storage.local.get('sets', function(storage) {

    var setsStorage = storage['sets'] || {};
    setsStorage[sets.id] = sets;

    chrome.storage.local.set({'sets': setsStorage}, function() {
      if (chrome.runtime.lastError) return;

      chrome.storage.local.get('sets', function(storage) {
        popupAction.displaySetsGroup();
      });

    });
  });
};

popupAction.removeItemStorage = function(itemId){
  chrome.storage.local.get('sets', function(storage) {

    var setsStorage = storage['sets'] || {};
    console.log(itemId);

    delete setsStorage[itemId];

    console.log(setsStorage);

    chrome.storage.local.set({'sets': setsStorage}, function() {
      if (chrome.runtime.lastError) return;

      chrome.storage.local.get('sets', function(storage) {
        popupAction.displaySetsGroup();
      });

    });
  });
};


popupAction.displaySetsGroup = function(){
  chrome.storage.local.get('sets', function(storage) {

    var el = $('#group-list');
    sets = storage['sets'];
    el.find('.lists').empty();

    _.each(sets, function(group){
      el.find('.lists').append('<div class="radio"><label><input type="radio" name="optionsRadios" id="optionsRadios1" value="'+group.id+'" checked="'+group.selected+'"> '+group.title+' <span class="btn-delete pull-xs-right" data-id="'+group.id+'">[x]</span></label></div>');
    });

    el.find('.lists .btn-delete').click(function(){
      popupAction.removeItemStorage($(this).data('id'));
    });


  });
};


/**
 * When the popup is loaded, fetch the events in this tab from the
 * background page, set up the appropriate layout, etc.
 */
window.addEventListener('load', function() {
  popupAction.initialize();
}, false);
