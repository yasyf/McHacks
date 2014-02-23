Sessions = new Meteor.Collection("sessions");
Inputs = new Meteor.Collection("inputs");
Positions = new Meteor.Collection("positions");
if (Meteor.isClient) {
  var gridster;

  function store_hash() {
    if(location.hash.length < 2){
      location.hash = Math.random().toString(36).substring(2,7);
    }
    Session.set("session",location.hash.substring(1));
  }

  Meteor.startup(function () {
    store_hash();
    if(!Session.get('uid')){
      Session.set('uid',Math.random().toString(36).substring(2,10));
    }
  });

  $(window).on('hashchange', function(){
      store_hash();
  });

  function rid() {
    return Math.random().toString(36).substring(2,6);
  }

  function get_xy(col,row) {
    return $(".gridster ul [data-col='"+col+"'][data-row='"+row+"']");
  }

  function get_id(id) {
    return $(".gridster #"+id);
  }

  Template.inputs.rendered = function() {
    if(!gridster){
      gridster = $(".gridster ul").gridster({
          widget_margins: [10, 10],
          widget_base_dimensions: [40, 40],
          draggable: {
            stop: save_pos
          },
          avoid_overlapped_widgets: true,
          min_cols: 16,
          min_rows: 16,
          serialize_params: function($w, wgd){ 
              return { 
                     id: $($w).attr('id'), 
                     col: wgd.col, 
                     row: wgd.row, 
                     size_x: wgd.size_x, 
                     size_y: wgd.size_y, 
                     content: $($w).html() 
                   };
          }
      }).data('gridster');
    }
  }

  Deps.autorun(function () {
    var pos = Positions.findOne({session: Session.get("session")});
    if(gridster && !pos){
      location.reload(true);
    }
    if(gridster && Session.get('session') && pos.updater != Session.get('uid')){
      pos.diff.forEach(function(e){
        curr = get_xy(e.col,e.row);
        if(e.id != curr.attr('id')){
          prev = get_id(e.id);
          console.log(prev);
          if(prev.length){
            gridster.remove_widget(prev, function() {
              gridster.add_widget('<li class="item number" id="'+e.id+'">'+e.content+'</li>',1,1,e.col,e.row);
            });
          }
          else{
            gridster.add_widget('<li class="item number" id="'+e.id+'">'+e.content+'</li>',1,1,e.col,e.row);
          }
        }
      });
    }
  });

  function save_pos() {
    current_pos =  gridster.serialize();
    id = Positions.findOne({session: Session.get("session")});
    if(id){
      Positions.update({_id: id._id},{$set: {diff: current_pos, updater: Session.get('uid')}});
    }
    else{
      Positions.insert({diff: current_pos, session: Session.get("session"), updater: Session.get('uid')});
    }
  }

  Template.top.events({
    'submit #addfrm' : function (e) {
      e.preventDefault();
      val = $('#i').val();
      Inputs.insert({i: val, session: Session.get("session")});
      gridster.add_widget('<li class="item number" id="'+rid()+'">'+val+'</li>');
      save_pos();
      $('#i').val('');
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // Inputs.remove({});
    // Sessions.remove({});
    // Positions.remove({});
  });
}
