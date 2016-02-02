/**
 * Namespace for Page action functionality.
 */
var popupAction = {};


/**
 * Store Set timeout var global use.
 */
popupAction.settimeout = {}

/**
 * Store Html main Element.
 * @enum {string}
 * @const
 */
popupAction.elem = {
  footer: 'main-footer',
  auth: 'error-auth',
  mainContent : 'main-content',
  setLists : 'sets-list',
  addonCreateSet :'create-sets',
  actionBar : 'action-bar'
}


/**
 * Dadjs "Need" to be global for the deactivate to work.
 */
popupAction.globalDad = $('#' + popupAction.elem.setLists + ' .list').dad()


/**
 * Initializes UI elements in the Page action popup.
 */
popupAction.initialize = function() {
  popupAction.fillMessages();
  popupAction.installButtonClickHandlers();
  popupAction.showLoginMessageIfNotAuthenticated();
  popupAction.listenForRequests();

  // Update
  chrome.extension.sendMessage({method: 'events.Calendar.fetch'});
  chrome.extension.sendMessage({method: 'ui.refresh'});
};


/**
 * Retrieves internationalized messages and loads them into the UI.
 * @private
 */
popupAction.fillMessages = function() {

  // Load internationalized messages.
  $('.i18n').each(function() {
    var i18nText = chrome.i18n.getMessage($(this).attr('id').toString());
    if (!i18nText) return;

    if ($(this).prop('tagName') == 'IMG') {
      $(this).attr({'title': i18nText});
    } else {
      $(this).text(i18nText);
    }
  });
};


/**
 * Setup icon event handler
 * @private
 */
popupAction.installButtonClickHandlers = function() {
  var actionBar = $('#' + popupAction.elem.actionBar);
  var createSet = $('#' + popupAction.elem.addonCreateSet);
  var setLists = $('#' + popupAction.elem.setLists);
  popupAction.globalDad.deactivate();

  // Auth Button Click
  $('#authorization_required').on('click', function() {
    $('#authorization_required').text(chrome.i18n.getMessage('authorization_in_progress'));
    chrome.extension.sendMessage({method: 'authtoken.update'});
  });

  // Add new set
  actionBar.find('.btn-add-group').click(function(){
    createSet.find('.main-title').text('Add Groups').attr({'data-id':''});
    createSet.find('.btn').text('Create');
    popupAction.resetDisplay();
    popupAction.addonAddSet();
  });

  // Init Select2
  setLists.find('.btn-order-list').click(function(){
    if($(this).text().toLowerCase() == 'edit'){
      $(this).text('Done').css({color:'#0275d8'});
      popupAction.globalDad.activate();
    }else{
      $(this).text('Edit').css({color:''});
      popupAction.globalDad.deactivate();
      popupAction.putSetsOrder();
    }
  });


  // Option page
  $('#show_options').on('click', function() {
    chrome.tabs.create({'url': 'options.html'});
  });
};


/**
 * Reset the display if dropdown menu is open
 * @private
 */
popupAction.resetDisplay = function(){
  var setLists = $('#' + popupAction.elem.setLists);
  setLists.find('.btn-order-list').text('Edit').css({color:''});
  popupAction.globalDad.deactivate();
  popupAction.putSetsOrder();
}

/**
 * Checks if we're logged in and either shows or hides a message asking
 * the user to login.
 * @private
 */
popupAction.showLoginMessageIfNotAuthenticated = function() {
  api.auth.getToken({'interactive': false}, function(authToken){
    if(authToken){
      $('#' + popupAction.elem.auth).hide();
      $('#' + popupAction.elem.mainContent).show();
    }else{
      $('#' + popupAction.elem.auth).show();
      $('#' + popupAction.elem.mainContent).hide();
    }
  });
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
        popupAction.displaySetLists();
        break;

      case 'selection.sets.disabled':
        popupAction.disabledSelectSets();
        break;

      case 'selection.sets.enable':
        popupAction.enableSelectSets();
        break;

      case 'ui.close':
        window.close();
        break;

    }
  });
};


/**
 * Retrieve Sets object form Local storage. Update view
 * for Sets and validation view. Build Sets html and add
 * event handler.
 */
popupAction.displaySetLists = function(){
  storage.local.getSets(function(setsStorage){
    var setLists = $('#' + popupAction.elem.setLists);

    // Reset Display
    setLists.find('.list').empty();
    if(_.isEmpty(setsStorage)){
      setLists.find('.msg').fadeIn()
      setLists.find('.list').hide();
      return;
    }

    // Sort sets object
    sortBy = _.sortBy(setsStorage, 'order');

    // Build Html
    _.each(sortBy, function(set){
      var infoArray = _.map(set.selection, function(item){return item.summary});
      var layout = '<div class="item container-fluid" data-id="'+set.id+'"><div class="row">';
      layout += '<div class="btn-change-calendar box col-xs-7">' + set.title + '</div>';
      layout += '<div class="box col-xs-5"><span class="pull-xs-right fa fa-align-justify"></span>';
      layout += '<div class="icon-list pull-xs-right">';
      layout += '<span class="btn-icon-info fa fa-info-circle"></span>';
      layout += '<span class="btn-icon-more fa fa-caret-square-o-down"><ul class="more-menu"><li class="btn-edit">Edit</li><li class="btn-delete">Delete</li></ul></span>';
      layout += '</div></div></div>';
      layout += '<div class="tab-info">'+infoArray.join(', ')+'</div>';
      layout += '</div>';
      setLists.find('.list').append(layout);
    });


    // After building html turn on display as needed
    setLists.find('.msg').hide();
    setLists.find('.list').fadeIn();
    (sortBy.length > 1)? setLists.find('.btn-order-list').fadeIn(): setLists.find('.btn-order-list').hide();


    // Hover show Info List of Calendar
    setLists.find('.btn-icon-info').hover(function(){
      $(this).closest('.item').find('.tab-info').show();
    },function(){
      $(this).closest('.item').find('.tab-info').hide();
    });

    // Delete Set
    setLists.find('.list .btn-delete').click(function(){
      popupAction.deleteSet($(this).closest('.item').data('id'));
    });

    // Edit Set
    setLists.find('.list .btn-edit').click(function(){
      popupAction.addonAddSet(setsStorage[$(this).closest('.item').data('id')]);
    });

    // Update Calendar selection list
    setLists.find('.btn-change-calendar').click(function(){
      var setId = $(this).closest('.item').data('id');
      if(!$(this).hasClass('dad-active')){
        chrome.extension.sendMessage({method: 'selection.sets.disabled'});
        _.each(setsStorage, function(obj){(obj.id == setId)? obj.selected = true : obj.selected = false;});

        storage.local.putSets(setsStorage, chrome.extension.sendMessage({method: 'events.sets.uptdate'}));
      }
    });

  });
};


/**
 * Addon - Create Sets
 * Retrieve calendars list and build html select list.
 * Event handler for creating set and fields validation
 * @private
 */
popupAction.loadInputSelection = function() {
  storage.local.getCalendars(function(calendarsStorage){

    var createSet = $('#'+ popupAction.elem.addonCreateSet);
    createSet.find('.select-calendar').empty();

    // Building html section lists
    _.each(calendarsStorage, function(calendar){
      createSet.find('.select-calendar').append('<option value="'+calendar.id+'">'+calendar.summary+'</option>');
    });

    // Create set
    createSet.find('.btn').click(function(e){
      // Create object id
      var setId = createSet.find('.main-title').data('id');
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });

      newCalendarsList = _.map(createSet.find('.select-calendar').val(), function(item){
        return {id: item, summary: calendarsStorage[item].summary}
      });

      var newSet = {
        'id': (setId)? setId : uuid,
        "title": createSet.find('.group-name').val() || '',
        "selection": newCalendarsList,
        "selected": false
      };


      // Validation
      if(newSet.selection.length > 0 && newSet.title){
        popupAction.createSet(newSet);
        popupAction.closeAddon();
      }else{
        popupAction.alert('Please, fill in all the fields.');
      }

    });

  });
};


/**
 * Create and update set object and set in local storage
 * @typedef {{
 *   id: (string|unique id),
 *   title: (string),
 *   selection: {Array.<string>},
 *   selected: (boolean|false)
 * }}
 * @private
 */
popupAction.createSet = function(set){
  storage.local.getSets(function(setsStorage){
    var order = (_.isEmpty(setsStorage))? 0 : (_.max(setsStorage, function(obj){return obj.order;})).order;
    (setsStorage[set.id])? set.order = setsStorage[set.id].order : set.order = order + 1;
    setsStorage[set.id] = set;

    storage.local.putSets(setsStorage, popupAction.displaySetLists);
  });
};


/**
 * Delete Set object form Local storage
 * @type {string:id}
 * @private
 */
popupAction.deleteSet = function(setId){
  storage.local.getSets(function(setsStorage){
    delete setsStorage[setId];
    storage.local.putSets(setsStorage, popupAction.displaySetLists);
  });
};


/**
 * Retrieve Sets object form Local storage and save the new
 * order that that was assign to set. Update View after save.
 */
popupAction.putSetsOrder = function(){
  storage.local.getSets(function(setsStorage){
    var setLists = $('#' + popupAction.elem.setLists + ' .list' );

    setLists.find('.item').each(function(){
      setsStorage[$(this).data('id')].order = $(this).data('dad-position');
    });

    storage.local.putSets(setsStorage, popupAction.displaySetLists);
  });
};


/**
 * Addon : Show dropdown menu that create set and
 * event handler to close dropdown
 * @typedef {{
 *   id: (string|unique id),
 *   title: (string),
 *   selection: {Array.<string>},
 *   selected: (boolean|false)
 * }}
 * @private
 */
popupAction.addonAddSet = function(editObj){
  var addonCreateSet = $('#' + popupAction.elem.addonCreateSet);

  // Reset all fields
  addonCreateSet.find('.group-name').val('');
  addonCreateSet.find('.select-calendar').val('').trigger("change");

  // Animation and init select2
  addonCreateSet.show(function(){

    // If edit button press load data back in the fields
    if(editObj){
      var selectCalendarArray = _.map(editObj.selection, function(item){return item.id});

      addonCreateSet.find('.main-title').text('Edit Groups').attr({'data-id': editObj.id});
      addonCreateSet.find('.btn').text('Edit');
      addonCreateSet.find('.group-name').val(editObj.title);
      addonCreateSet.find('.select-calendar').val(selectCalendarArray).trigger("change");
    }

    addonCreateSet.find('.select-calendar').select2({placeholder: "Select Group"});
  }).animate({top:0});

  //Init close button
  addonCreateSet.find('.btn-close').click(function(){
    popupAction.closeAddon();
  });

};


/**
 * Global close all dropdown menu
 * @private
 */
popupAction.closeAddon = function(){
  $('#' + popupAction.elem.mainContent + ' .dropdown').animate({top:'-600px'}, function(){
    $(this).hide();
  });
};


/**
 * Footer alert with message display. On timer or click to hide
 * @type {string, string} Your messsage, what type of alert
 * @private
 */
popupAction.alert = function(msg, type){
  var footer = $('.' + popupAction.elem.footer);

  //Reset
  footer.find('.alert').removeClass('alert-success, alert-info, alert-warning, alert-danger');
  footer.find('.alert .msg').empty();
  if(popupAction.settimeout.alert) clearTimeout(popupAction.settimeout.alert);

  // Find the type of alert
  switch(type){
    case "success":
      footer.find('.alert').addClass('alert-success');
      break;
    case "info":
      footer.find('.alert').addClass('alert-info');
      break;
    case "warning":
      footer.find('.alert').addClass('alert-warning');
      break;
    default:
      footer.find('.alert').addClass('alert-danger');
      break;
  }

  footer.find('.alert .msg').html(msg);
  footer.find('.alert').fadeIn();

  // Auto hide alert
  popupAction.settimeout.alert = setTimeout(function(){
    footer.find('.alert').hide();
  }, 5000);

  // Click hide alert
  footer.find('.alert').click(function(){
    footer.find('.alert').hide();
  });
};


/**
 * Disable selecting sets.
 * @private
 */
popupAction.disabledSelectSets = function() {
  var setLists = $('#' + popupAction.elem.setLists);
  setLists.find('.list').addClass('disabled-click');
  setLists.find('.btn-order-list').addClass('disabled-click');
};


/**
 * Enable selecting sets.
 * @private
 */
popupAction.enableSelectSets = function() {
  var setLists = $('#' + popupAction.elem.setLists);
  setLists.find('.list').removeClass('disabled-click');
  setLists.find('.btn-order-list').removeClass('disabled-click');
};


/**
 * When the popup is loaded, fetch the events in this tab from the
 * background page, set up the appropriate layout, etc.
 */
window.addEventListener('load', function() {
  popupAction.initialize();
}, false);
