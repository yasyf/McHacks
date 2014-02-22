Sessions = new Meteor.Collection("sessions");
Inputs = new Meteor.Collection("inputs");
Positions = new Meteor.Collection("positions");
if (Meteor.isClient) {
  var gridster;
  Meteor.startup(function () {
    if(location.hash.length < 2){
      location.hash = Math.random().toString(36).substring(2,7);
    }
    Session.set("session",location.hash.substring(1));
    if(!Session.get('uid')){
      Session.set('uid',Math.random().toString(36).substring(2,10));
    }
  });

  Template.inputs.rendered = function() {
    if(!gridster){
      gridster = $(".gridster ul").gridster({
          widget_margins: [10, 10],
          widget_base_dimensions: [40, 40],
          draggable: {
            stop: save_pos
          },
          avoid_overlapped_widgets: true,
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
    if(gridster && Session.get('session') && pos.updater != Session.get('uid')){
      var count = 0;
      var len = gridster.$widgets.length;
      function add_all() {
        pos.diff.forEach(function(e){
          gridster.add_widget('<li class="item number">'+e.content+'</li>',1,1,e.col,e.row);
        });
      }
      if(len == 0){
        add_all();
      }
      else{
        gridster.remove_all_widgets(function(){
          count += 1;
          if(count == len){
            add_all();
          }
        });
      }
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
      gridster.add_widget('<li class="item number">'+val+'</li>');
      save_pos();
      $('#i').val('');
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    //Inputs.remove({});
  });
}
