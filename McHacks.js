Inputs = new Meteor.Collection("inputs");
if (Meteor.isClient) {
  Template.inputs.items = function (){
    return Inputs.find({}).fetch();
  }

  Template.top.events({
    'click #addbtn' : function () {
      Inputs.insert({i: $('#in').val()});
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
  });
}
