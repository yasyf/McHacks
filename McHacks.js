Sessions = new Meteor.Collection("sessions");
Inputs = new Meteor.Collection("inputs");
Positions = new Meteor.Collection("positions");
Counts = new Meteor.Collection("counts");
Strings = new Meteor.Collection("strings");
if (Meteor.isClient) {
  var gridster;

  function store_hash() {
    if(location.hash.length < 2){
      location.hash = Math.random().toString(36).substring(2,7);
    }
    Session.set("session",location.hash.substring(1));
  }

  Meteor.startup(function () {
    Session.setDefault('n', 1);
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

  Template.top.n = function() {
    return Session.get('n');
  }

  Template.inputs.rendered = function() {
    if(!gridster){
      gridster = $(".gridster ul").gridster({
          widget_margins: [7, 30],
          widget_base_dimensions: [45, 45],
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
    var pos = Positions.findOne({session: Session.get("session"), n: Session.get("n")});
    if(gridster && !pos){
      add_widget_from_input(Strings.find({session: Session.get('session'), n: Session.get('n')}));
    }
    if(gridster && Session.get('session') && pos.updater != Session.get('uid')){
      pos.diff.forEach(function(e){
        curr = get_xy(e.col,e.row);
        if(e.id != curr.attr('id')){
          prev = get_id(e.id);
          if(prev.length){
            gridster.remove_widget(prev, function() {
              gridster.add_widget('<li class="item number" id="'+i+"_"+Session.get('n')+'">'+e.content+'</li>',e.size_x,e.size_y,e.col,e.row);
            });
          }
          else{
            gridster.add_widget('<li class="item number" id="'+i+"_"+Session.get('n')+'">'+e.content+'</li>',e.size_x,e.size_y,e.col,e.row);
          }
        }
      });
    }
  });

  function save_pos() {
    current_pos =  gridster.serialize();
    id = Positions.findOne({session: Session.get("session")});
    if(id){
      Positions.update({_id: id._id},{$set: {diff: current_pos, updater: Session.get('uid'), n: Session.get('n')}});
    }
    else{
      Positions.insert({diff: current_pos, session: Session.get("session"), updater: Session.get('uid'), n: Session.get('n')});
    }
  }

  Template.top.events({
    'submit #addfrm' : function (e) {
      e.preventDefault();
      val = $('#i').val();
      Strings.insert({i: val, session: Session.get('session')});
      add_widget_from_input(val,true);
      save_pos();
      $('#i').val('');
    },
    'keyup #n' : function (e) {
      e.preventDefault();
      val = $('#n').val();
      Session.set('n',val);
    }
  });

  function add_widget_from_input(str,add) {
    s = new StringParser();
    t = s.parseTerm(str).flatten(Session.get('n'));
    var id_c = Counts.findOne({session: Session.get("session"), n: Session.get('n')});
    if(!id_c){
      id_c = Counts.insert({session: Session.get("session"), count: 0, n: Session.get('n')});
      id_c = Counts.findOne({session: Session.get("session"), n: Session.get('n')});
    }
    Counts.update({_id: id_c._id}, {$inc: {count: 1}});
    count = id_c.count + 1;
    t.forEach(function(e,i){
      if(Inputs.findOne({i: e.toDisplayString(), session: Session.get("session"), id: i, l: e.getLength(), n: Session.get("n")})){
        Inputs.insert({i: e.toDisplayString(), session: Session.get("session"), id: i, l: e.getLength(), n: Session.get("n")});
      }
      if(add){
        gridster.remove_all_widgets();
        gridster.add_widget('<li class="item number" id="'+i+"_"+Session.get('n')+'">'+e.toDisplayString().replace("*","&middot;")+'</li>',e.getDisplayLength(),1,i+1,count);
      }
    });
  }

  Deps.autorun(function() {
    n = Session.get('n');
    if(!Inputs.findOne({session: Session.get('session'), n: Session.get('n')})){
      Strings.findOne({session: Session.get('Session')}).fetch().forEach(function(e) {
        add_widget_from_input(e.i, false);
      });
    }
  });

}


if (Meteor.isServer) {
  Meteor.startup(function () {
    // Inputs.remove({});
    // Sessions.remove({});
    // Positions.remove({});
    // Counts.remove({});
  });
}


var Operation = {
  ADD: 1,
  SUBTRACT: 2,
  MULTIPLY: 3,
  DIVIDE: 4,

  getOp: function(character){
    if(character == '+'){
      return Operation.ADD;
    }
    else if(character == '-'){
      return Operation.SUBTRACT;
    }
    else if(character == '*'){
      return Operation.MULTIPLY;
    }
    else if(character == '/'){
      return Operation.DIVIDE;
    }
    return 0;
  }, 

  toString: function(operation){
    if(operation == this.ADD){
      return "+";
    }
    else if(operation == this.SUBTRACT){
      return "-";
    }else if(operation == this.MULTIPLY){
      return "*";
    }
    else if(operation == this.DIVIDE){
      return "/";
    }
  },

  print: function(operation){
    console.log(this.toString(operation));
  },

  getInverse: function(operation){
    if(operation == this.ADD){
      return this.SUBTRACT;
    }
    if(operation == this.SUBTRACT){
      return this.ADD;
    }
    if(operation == this.MULTIPLY){
      return this.DIVIDE;
    }
    if(operation == this.DIVIDE){
      return this.MULTIPLY;
    }
  }

}

function StringParser(){
  this.parseEquation = function(string){
      
  },

  this.parseTerm = function(string){
    return parseTerm(string,0,string.length);
  }

  var parseTerm = function(string, a, b){
    if(b == a + 1){
      if(string.substring(a,b).match(/\d/)){
        return new Constant(string.charAt(a));
      }
      else{
        return new Variable(string.charAt(a));
      }
    }
    else{
      var parenCount = 0;
      for(var i = a; i < b; i++){
        if(string.charAt(i) == '('){
          parenCount++;
        }
        else if(string.charAt(i) == ')'){
          parenCount--;
        }
        else if(Operation.getOp(string.charAt(i)) != 0){
          if(parenCount==1){
            var leftTerm = parseTerm(string, a+1,i);
            var rightTerm = parseTerm(string, i+1, b-1);
            var op = Operation.getOp(string.charAt(i));
            return new Term(leftTerm, rightTerm, op);
          }
        }
      }
    }
  }
}

function Variable(theletter){
  var letter = theletter;//the letter that represents the variable
  this.getLetter = function(){
    return letter;
  }

  this.isVariable = function(){//returns true if this term is a variable
    return true;
  }

  this.isOperation =  function(){
    return false;
  }

  this.toString = function(){
    return letter;
  }

  this.toDisplayString = function(){
    return letter;
  }

  this.equals = function(term){
    if(!term.isVariable()){
      return false;
    }
    if(!(letter === term.getLetter())){
      return false;
    }
    return true;
  }

  this.find = function(term,path){
    //this.print();
    if(!this.equals(term)){
      return false;
    }
    return true;
  }
  this.flatten=function(array){
    array.push(this);
  }
}
Variable.prototype = new Term();

//represents a constant value in an equation
function Constant(thevalue){
  var value = thevalue;//the value of the constant
  this.getValue = function(){
    return value;
  }

  this.isConstant = function(){//returns true if this term is a constant
    return true;
  }

  this.isOperation = function(){
    return false;
  }

  this.toString = function(){
    return value;
  }

  this.toDisplayString = function(){
    return value;
  }

  this.flatten=function(array){
    array.push(this);
  }

  this.equals = function(term){
    if(!term.isConstant()){
      return false;
    }
    if(value != term.getValue()){
      return false;
    }
    return true;
  }

  this.find = function(term,path){
    if(!this.equals(term)){
      return false;
    }
    return true;
  }
}
Constant.prototype = new Term();


function combine(eq1,eq2,operation){
  var left = new Term(eq1.getLeft(),eq2.getLeft(),operation);
  var right = new Term(eq1.getRight(),eq2.getRight(),operation);
  return new Equation(left,right);
}




//any term in an equation: e.g. "x", "x+y", "(x+y)/(2*2)", etc.
//Defined in terms of an operation on two other terms, which could be general terms or constants or variables
function Term(leftterm, rightterm, operation){
  this.needsParen = false;  
  var left = leftterm;
  var right = rightterm;
  var operation = operation;

  this.decideChildrenParen = function(){
    if(operation == Operation.MULTIPLY){
      if(left.getOperation() == Operation.ADD || left.getOperation == Operation.SUBTRACT){
        left.needsParen = true;
      }
      if(right.getOperation() == Operation.ADD || right.getOperation == Operation.SUBTRACT){
        right.needsParen = true;
      }
    }
    if(operation == Operation.DIVIDE){
      if(left.getOperation() == Operation.ADD || left.getOperation == Operation.SUBTRACT){
        left.needsParen = true;
      }
      right.needsParen = true;
    }
    if(operation == Operation.ADD){
      if(left.getOperation() == Operation.MULTIPLY || left.getOperation == Operation.DIVIDE){
        left.needsParen = true;
      }
      if(right.getOperation() == Operation.MULTIPLY || right.getOperation == Operation.DIVIDE){
        right.needsParen = true;
      }
    }
    if(operation == Operation.SUBTRACT){
      if(left.getOperation() == Operation.MULTIPLY || left.getOperation == Operation.DIVIDE){
        left.needsParen = true;
      }
      if(operation == Operation.DIVIDE){
        right.needsParen = true;
      }
    }
  }

  this.decideChildrenParen();

  this.getDisplayLength = function(){
    return 1;
  }

  this.getLength = function(){
    return this.toString().length;
  }

  this.length = this.getLength();

  this.flatten = function(array){
      if(array == undefined){
        array = [];
      }
      if(this.needsParen){
        array.push(new SpecialCharacter("(")) 
      }   
      left.flatten(array);
      array.push(this);
      right.flatten(array);
      if(this.needsParen){
        array.push(new SpecialCharacter(")")) 
      }
      return array;
  }

  this.equals = function(term){
    if(term == undefined){
      return false;
    }
    if(operation != term.getOperation()){
      return false;
    }

    if(left.equals(term.getLeft()) && right.equals(term.getRight())){
      return true;
    }

    if(left.equals(term.getRight()) && right.equals(term.getLeft())){
      if(operation == Operation.ADD || operation == Operation.MULTIPLY){
      return true;
      }
    }
    return false;
  }

  
  //finds a term in this term.  Returns true if its found, false otherwise.  Path is assumed to begin pointing to this node, and is lengthened to point to the correct term if its found. -1 in path indicates a leftward move, 1 indicates a rightward move
  this.find = function(term,path){
    //this.print();
    //left.print();
    if(this.equals(term)){
      return true;
    }
    path.push(-1);
    if(left.find(term,path)){
      return true;
    }
    path.pop();
    path.push(1);
    if(right.find(term,path)){
      return true;
    }
    path.pop();
    return false;
  }

  this.swap = function(){
    var temp = left;
    left = right;
    right = temp;
  }

  this.getLeft = function(){
    return left;
  }

  this.getRight = function(){
    return right;
  }

  this.getOperation = function(){
    return operation;
  }

  this.isConstant = function(){//returns true if this term is a constant
    return false;
  }

  this.isVariable = function(){//returns true if this term is a variable
    return false;
  }

  this.isOperation = function(){
    return true;
  }

  this.toString = function(){ 
    if(!this.needsParen){
      return left.toString() + Operation.toString(operation)+right.toString();
    }
    return "(" + left.toString()+Operation.toString(operation)+right.toString()+")";
  }

  this.toDisplayString = function(){
    return Operation.toString(operation);
  }

  this.print = function(){
    console.log(this.toString());
  }
}

function SpecialCharacter(character){
  this.displayString =  character
  this.toDisplayString = function(){
    return this.displayString;
  }
  this.getLength = function(){
    return this.displayString.length;
  }
  this.getDisplayLength = function(){
    return 1;
  }
}

function Equation(leftterm, rightterm){
  var left = leftterm;
  var right = rightterm;
  
  this.flatten = function(array){
    array = [];
    left.flatten(array);
    array.push(new SpecialCharacter("="));
    right.flatten(array);
    return array;
  }

  this.isolate = function(term){
    var path = [];
    var findable = this.find(term,path);
    for (var i=1; i<path.length; i++){
      this.isolateControler(path[0],path[i]);
    }

  }

  this.find = function(term,path){
    path.push(-1);
    if(left.find(term,path)){
      return true;
    }
    path.pop();
    path.push(1);
    if(right.find(term,path)){
      return true;
    }
    path.pop;
    return false;
  }

  this.swap = function(){
    var temp = left;
    left = right;
    right = temp;
  }

  this.toString = function(){ 
    return left.toString()+ "=" +right.toString();
  }

  this.getLength = function(){
    return this.toString().getLength;
  }

  this.length = this.getLength();

  this.print = function(){
    console.log(this.toString());
  }

  this.getLeft = function(){
    return left;
  }

  this.getRight = function(){
    return right;
  }

  this.getDisplayLength = function(){
    return 1;
  }

  this.isolateControler= function(a,b) {
    if (a==1){
      if (b==1){
        this.isolateRightsRight();
      }
      else{
        this.isolateRightsLeft();
      }
    }
    else{
      if (b==1){
        this.isolateLeftsRight();
      }
      else{
        this.isolateLeftsLeft();
      }
    }
  }

  //isolates the term on the left of the left hand side
  this.isolateLeftsLeft = function(){
    if(left.isConstant()){
      console.log("Cannot move left to right. Left is a constant.");
      return;
    }
    if(left.isVariable()){
      console.log("Cannot move left to right. Left is a variable.");
      return;
    }
    var newRight = new Term(right,left.getRight(),Operation.getInverse(left.getOperation()));
    var newLeft = left.getLeft();
    left = newLeft;
    right = newRight;
  }

  //isolates the term on the left of the right hand side
  this.isolateRightsLeft = function(){
    var newLeft = new Term(left,right.getRight(),Operation.getInverse(right.getOperation()));
    var newRight = right.getLeft();
    left = newLeft;
    right = newRight;
  }


  //isolates the term on the right of the right hand side
  this.isolateRightsRight = function(){
    if(right.getOperation() == Operation.ADD || left.getOperation() == Operation.MULTIPLY){
      right.swap();
      this.isolateRightsLeft();
    }
    else{
      this.isolateRightsLeft();
      left.swap();
      this.isolateLeftsLeft();
      this.swap();
    }
  }

  //isolates the term on the right of the left hand side
  this.isolateLeftsRight = function(){
    if(left.getOperation() == Operation.ADD || left.getOperation() == Operation.MULTIPLY){
      left.swap();
      this.isolateLeftsLeft();
    }
    else{
      this.isolateLeftsLeft();
      right.swap();
      this.isolateRightsLeft();
      this.swap();
    }
  }
}
