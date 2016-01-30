var popupAction = {};

popupAction.settimeout = {}

popupAction.initialize = function() {
  popupAction.fillMessages();
  popupAction.installButtonClickHandlers();
  popupAction.showLoginMessageIfNotAuthenticated();
  popupAction.listenForRequests();

  // Update
  chrome.extension.sendMessage({method: 'events.Calendar.fetch'});
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

  // $('[data-href="calendar_ui_url"]').attr('href', constants.CALENDAR_UI_URL);
};

/** @private */
popupAction.installButtonClickHandlers = function() {
  var actionBar = $('#action-bar');
  var selection = $('#selection-list');
  var groupsList = $('#group-list');

  $('#authorization_required').on('click', function() {
    $('#authorization_required').text(chrome.i18n.getMessage('authorization_in_progress'));
    chrome.extension.sendMessage({method: 'authtoken.update'});
  });

  // Add New Groups
  actionBar.find('.btn-add-group').click(function(){
    selection.find('.main-title').text('Add Groups').attr({'data-id':''});
    selection.find('.btn').text('Create');
    popupAction.addonAddGroup();
  });

  var dad = $('#group-list .lists').dad().deactivate();
  groupsList.find('.btn-order-list').click(function(){
    if($(this).text().toLowerCase() == 'edit'){
      $(this).text('Done').css({color:'#0275d8'});
      dad.activate();
    }else{
      $(this).text('Edit').css({color:''});
      dad.deactivate();
      popupAction.setsGroupOrder();
    }
  });


  $('#show_options').on('click', function() {
    chrome.tabs.create({'url': 'options.html'});
  });
};

popupAction.addonAddGroup = function(editObj){
  var selection = $('#selection-list');

  // Clear all the fields
  selection.find('.group-name').val('');
  selection.find('.select-calendar').val('').trigger("change");

  // Animation and init select2
  selection.show(function(){
    if(editObj){
      selection.find('.main-title').text('Edit Groups');
      selection.find('.btn').text('Edit');
      var selectionArray = []
      _.each(editObj.selection, function(item){selectionArray.push(item.id)});
      selection.find('.main-title').attr({'data-id': editObj.id});
      selection.find('.group-name').val(editObj.title);
      selection.find('.select-calendar').val(selectionArray).trigger("change");
    }

    selection.find('.select-calendar').select2({
      placeholder: "Select Group"
    });
  }).animate({top:0});

  //Init close button
  selection.find('.btn-close').click(function(){
    popupAction.closeAddon();
  });

};

popupAction.closeAddon = function(){
  $('#content-body .dropdown').animate({top:'-600px'}, function(){
    $(this).hide();
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
      $('#error-auth').show();
      $('#content-body').hide();
    } else {
      $('#error-auth').hide();
      $('#content-body').show();
    }
  });
};

popupAction.disabledFieldset = function() {
  var groupsList = $('#group-list');
  groupsList.find('.lists').addClass('disabled-click');
  groupsList.find('.btn-order-list').addClass('disabled-click');
};

popupAction.enableFieldset = function() {
  var groupsList = $('#group-list');
  groupsList.find('.lists').removeClass('disabled-click');
  groupsList.find('.btn-order-list').removeClass('disabled-click');
};

popupAction.alert = function(msg, type){
  var footer = $('.main-footer');
  footer.find('.alert').removeClass('alert-success, alert-info, alert-warning, alert-danger');

  if(popupAction.settimeout.alert) clearTimeout(popupAction.settimeout.alert);

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

  popupAction.settimeout.alert = setTimeout(function(){
    footer.find('.alert').fadeOut();
  }, 5000);

  footer.find('.alert .btn-close').click(function(){
    footer.find('.alert').fadeOut();
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
        popupAction.displaySetsGroup();
        break;

      case 'fieldset.radio.disabled':
        popupAction.disabledFieldset();
        break;

      case 'fieldset.radio.enable':
        popupAction.enableFieldset();
        break;

      case 'ui.close':
        window.close();
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

      //Create Groups
      el.find('.btn').click(function(e){
        e.preventDefault();
        var selection = el.find('.select-calendar').val();
        var title = el.find('.group-name').val();
        var setId = el.find('.main-title').attr('data-id');
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
        });

        newSelectionData = [];
        _.each(selection, function(item){
          newSelectionData.push({id: item, summary: calendars[item].summary })
        });

        var obj = {
          'id': (setId)? setId : uuid,
          "title": title,
          "selection": newSelectionData,
          "selected": false
        };

        if(selection && title ){
          popupAction.tempStorage(obj);
          popupAction.closeAddon();
        }else{
          popupAction.alert('Please, fill in all the fields.');
        }
      });

    }
  });
};

popupAction.tempStorage = function(sets){
  chrome.storage.local.get('sets', function(storage) {

    var setsStorage = storage['sets'] || {};
    var maxNum = _.max(setsStorage, function(obj){return obj.order;});
    var order = (_.isEmpty(setsStorage))? 0 : maxNum.order;

    if(setsStorage[sets.id]){
      sets.order = setsStorage[sets.id].order;
    }else{
      sets.order = order + 1;
    }

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
    delete setsStorage[itemId];

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
    sets = storage['sets'] || {};

    if(_.isEmpty(sets)){
      el.find('.error-msg').fadeIn();
      el.find('.lists, .btn-order-list').hide();
      return;
    }
    el.find('.btn-order-list').hide();


    sortBy = _.sortBy(sets, 'order');
    el.find('.lists').empty();

    _.each(sortBy, function(group){
      var infoArray = []
      _.each(group.selection, function(item){return infoArray.push(item.summary)})

      var layout = '<div class="item container-fluid" data-id="'+group.id+'"><div class="row">';
      layout += '<div class="btn-change-calendar box col-xs-7">' + group.title + '</div>';
      layout += '<div class="box col-xs-5"><span class="pull-xs-right fa fa-align-justify"></span>';
      layout += '<div class="icon-list pull-xs-right">';
      layout += '<span class="btn-icon-info fa fa-info-circle"></span>';
      layout += '<span class="btn-icon-more fa fa-caret-square-o-down"><ul class="more-menu"><li class="btn-edit">Edit</li><li class="btn-delete">Delete</li></ul></span>';
      layout += '</div></div></div>';
      layout += '<div class="tab-info">' + group.id +infoArray.join(', ')+'</div>';
      layout += '</div>';
      el.find('.lists').append(layout);
    });

    // Show List
    el.find('.error-msg').hide();
    el.find('.lists').fadeIn();
    if(sortBy.length > 1) el.find('.btn-order-list').fadeIn();

    el.find('.btn-icon-info').hover(function(){
      $(this).closest('.item').find('.tab-info').show();
    },function(){
      $(this).closest('.item').find('.tab-info').hide();
    });

    // Delete button
    el.find('.lists .btn-delete').click(function(){
      popupAction.removeItemStorage($(this).closest('.item').data('id'));
    });

    // Edit button
    el.find('.lists .btn-edit').click(function(){
      popupAction.addonAddGroup(sets[$(this).closest('.item').data('id')]);
    });

    el.find('.btn-change-calendar').click(function(){
      var self = $(this);
      if(!self.hasClass('dad-active')){
        chrome.extension.sendMessage({method: 'fieldset.radio.disabled'});
        _.each(sets, function(obj){obj.selected = false});
        sets[self.closest('.item').data('id')].selected = true;

        chrome.storage.local.set({'sets': sets}, function() {
          if (chrome.runtime.lastError) return;

          chrome.extension.sendMessage({method: 'events.sets.uptdate'});
        });

      }
    });

  });
};

popupAction.setsGroupOrder = function(){
  chrome.storage.local.get('sets', function(storage) {
    var groupList = $('#group-list .lists');
    var setsStorage = storage['sets'] || {};

    groupList.find('.item').each(function(){
      setsStorage[$(this).data('id')].order = $(this).data('dad-position');
    });

    chrome.storage.local.set({'sets': setsStorage}, function() {
      if (chrome.runtime.lastError) return;
      popupAction.displaySetsGroup();
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
