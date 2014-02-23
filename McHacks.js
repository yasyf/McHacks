Sessions = new Meteor.Collection("sessions");
Inputs = new Meteor.Collection("inputs");
Positions = new Meteor.Collection("positions");
Counts = new Meteor.Collection("counts");
Strings = new Meteor.Collection("strings");
if (Meteor.isClient) {
  var gridster;
  var doneFirstDownload;

  function store_hash() {
    if(location.hash.length < 2){
      location.hash = Math.random().toString(36).substring(2,7);
    }
    Session.set("session",location.hash.substring(1));
  }

  Meteor.startup(function () {
    Session.setDefault('n', 1);
    Session.setDefault('old_n', 1);
    store_hash();
    if(!Session.get('uid')){
      Session.set('uid',Math.random().toString(36).substring(2,10));
    }
    doneFirstDownload = false;
  });

  $(window).on('hashchange', function(){
      store_hash();
  });

  function rid() {
    return Math.random().toString(36).substring(2,6);
  }

  function get_xy(col,row) {
    return $(".gridster ul [data-col='"+col+"'][data-row='"+row+"']").eq(0);
  }

  function get_id(id) {
    return $(".gridster #"+id).eq(0);
  }

  Template.top.n = function() {
    return Session.get('n');
  }

  Template.inputs.rendered = function() {
    if(!gridster){
      gridster = $(".gridster ul").gridster({
          widget_selector: '.draggable',
          widget_base_dimensions: [45, 45],
          widget_margins: [5, 30],
          draggable: {
            stop: save_pos,
            items: '.draggable'
          },
          collision: {
            colliders: $('.draggable')
          },
          extra_rows: 16,
          extra_cols: 16,
          avoid_overlapped_widgets: true,
          serialize_params: function($w, wgd){ 
              return { 
                     id: $($w).attr('id'), 
                     class: $($w).attr('class'), 
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


  function save_pos() {
    current_pos =  gridster.serialize();
    console.log(current_pos);
    id = Positions.findOne({session: Session.get("session")});
    if(id){
      console.log('submitted');
      Positions.update({_id: id._id},{$set: {diff: current_pos, updater: Session.get('uid'), n: Session.get('n')}});
    }
    else{
      Positions.insert({diff: current_pos, session: Session.get("session"), updater: Session.get('uid'), n: Session.get('n')});
    }
  }
  Deps.autorun(function() {
    console.log("Switch n");
    n = Session.get("n");
    if(Session.equals("old_n",n)){
      return
    }
    counter = 1;
    Strings.find({session: Session.get('session')}).forEach(function(e){
      add_widget_from_input(e.i,false,counter);
      counter += 1;
    });

  });
  Deps.autorun(function() {
    console.log("AUTORUN");
    Inputs.find({session: Session.get('session'), n: Session.get('n')}).fetch();
    Positions.find({session: Session.get('session'), n: Session.get('n')}).fetch();
    refresh_page();
  });

  Template.top.events({
    'submit #addfrm' : function (e) {
      e.preventDefault();
      val = $('#i').val();
      Strings.insert({i: val, session: Session.get('session')});
      add_widget_from_input(val,true);
      refresh_page();
      save_pos();
      $('#i').val('');
    },
    'keyup #n' : function (e) {
      e.preventDefault();
      val = $('#n').val();
      Session.set('n',parseInt(val));
    }
  });

  function refresh_page() {
    added = Array();
    function run() {
      p = Positions.findOne({session: Session.get('session'), n: Session.get('n')});
      if(p){
         p.diff.forEach(function(e){
          if(!_.contains(added,e.id)){
            gridster.add_widget('<li class="'+e.class+'" id="'+e.id+'">'+e.content+'</li>',e.size_x,e.size_y,e.col,e.row);
            added.push(e.id);
            console.log('P added '+e.id);
          }
        });
      }
      Inputs.find({session: Session.get('session'), n: Session.get('n')}).fetch().forEach(function(e) {
        if(!_.contains(added,e.id)){
          gridster.add_widget('<li class="item '+e.type+' '+e.draggable+'" id="'+e.id+'">'+e.i+'</li>',e.l,1,e.col,e.row);
          added.push(e.id);
          console.log('I added '+e.id);
        }
      });
    }        
       
    if(gridster){
      if(gridster.$widgets.length == 0){
          run();
          return;
        } 
        var c = 0;
        var len = gridster.$widgets.length;
        gridster.remove_all_widgets(function() {
          c += 1;
          if(c == len){ 
            run();
          } 
        });
      }
    }
  
  function add_widget_from_input(str,n,counter) {
    s = new StringParser();
    var t = s.parseEquation(str).flatten(Session.get('n'));
    var id_c = Counts.findOne({session: Session.get("session")});
    if(!id_c){
      id_c = Counts.insert({session: Session.get("session"), count: 0});
      id_c = Counts.findOne({session: Session.get("session")});
    }
    if(n){
      Counts.update({_id: id_c._id}, {$inc: {count: 1}});
    }
    else{
      var old_count = id_c.count + 1;
    }
    var count = id_c.count + 1;
    var lastL = 0;
    t.forEach(function(e,i){
      if(counter){
        count = counter;
        console.log(counter);
      }
      col_n = i+lastL;
      if(col_n === 0){
        col_n = 1;
      }
      if(!Counts.findOne({i: e.toDisplayString().replace("*","&middot;"), type: e.getType(), session: Session.get("session"), l: e.getDisplayLength(), n: Session.get("n"), row: count, col: col_n, id: {$regex: i+"_"+Session.get('n')+"_"+count+"_"}})){
        if(e.draggable){
          draggable = 'draggable';
        }else{
          draggable = '';
        }
        Inputs.insert({i: e.toDisplayString().replace("*","&middot;"), type: e.getType(), draggable: draggable, row: count, col: col_n, session: Session.get("session"), id: i+"_"+Session.get('n')+"_"+count+"_"+rid(), l: e.getDisplayLength(), n: Session.get("n")});
        lastL = e.getDisplayLength() + col_n - i - 1;
      }
    });
  }
}


if (Meteor.isServer) {
  Meteor.startup(function () {
    Inputs.remove({});
    Sessions.remove({});
    Positions.remove({});
    Counts.remove({});
    Strings.remove({});
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
      if(string.match("=")){
        var index = string.indexOf('=');
        var leftTerm = parseTerm(string,0,index);
        var rightTerm = parseTerm(string,index+1, string.length);
        return new Equation(leftTerm, rightTerm);
      }
      return this.parseTerm(string);
      
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
  this.flatten=function(depth, array){
    if(array == undefined){
      array = [];
    }
    array.push(this);
    return array;
  }

  this.getType = function(){
    return "variable";
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

  this.flatten=function(depth,array){
    if(array == undefined){
      array = [];
    }
    array.push(this);
    return array;
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

  this.getType = function(){
    return "constant";
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
  this.parent;
  if(left != undefined){
    left.parent = this;
  }
  if(right != undefined){
    right.parent = this;
  }
  this.depth;
  this.draggable = true;

  this.setRight = function(term){
     right = term;
     term.parent = this;
  }

  this.setLeft = function(term){
     left = term;
     term.parent = this;
  }

  //replaces termA with termB everywhere
  this.replace = function(termA, termB){
    var parent; //the parent
    var direction=-1; //left = -1, right = 1;
    var newParent;
    if(this.equals(termA)){
      parent = this.parent;
      if(parent.getLeft().equals(termA)){
        parent.setLeft(termB);
      }
      if(parent.getRight().equals(termA)){
        parent.setRight(termB);
      }
    }
    else{
      if(this.isOperation()){
        left.replace(termA,termB);
        right.replace(termA,termB);
      }
    }

  }

  this.getType = function(){
    if(this.depth == 1){
      return "mixed";
    }
    else{
      return "operator";
    }
  }

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
      left.needsParen = false;
      right.needsParen = false;
    }
    if(operation == Operation.SUBTRACT){
      if(left.getOperation() == Operation.MULTIPLY || left.getOperation == Operation.DIVIDE){
        left.needsParen = true;
      }
      if(right.getOperation == Operation.DIVIDE){
        right.needsParen = true;
      }
    }
  }

  this.decideChildrenParen();

  this.getDisplayLength = function(){
    return this.toDisplayString().length;
  }

  this.getLength = function(){
    return this.toString().length;
  }

  this.length = this.getLength();

  this.flatten = function(depth, array){
      if(array == undefined){
        array = [];
      }
      this.depth = depth;
      if(depth == undefined){
        depth = 1000;
      }
      if(depth == 1){
        array.push(this);
        this.draggable = true;
        return array;
      }
      if(this.needsParen){
        array.push(new SpecialCharacter("(")) 
      }   
      left.flatten(depth-1,array);
      if(this.needsOp()){
        array.push(this);
      }
      this.draggable = false;
      right.flatten(depth-1,array);
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
    if(path == undefined){
      path = [];
    }
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

  this.needsOp = function(){
    if(operation == Operation.MULTIPLY){
      if(!right.isConstant()){
        return false;
      }
    }
    return true;
  }

  this.toString = function(){ 
    
    var answer = "";
    if(this.needsParen){
      answer = "(";  
    }
    answer=answer+left.toString();
    if(this.needsOp()){
      answer= answer+Operation.toString(operation);
    }
    answer= answer+right.toString();
    if(this.needsParen){
      answer= answer+ ")";
    }
    return answer;
  }

  this.toDisplayString = function(){
    if(this.depth == 1){
      return this.toString();
    }
    else{
      if(operation == Operation.MULTIPLY){
        if(right.isConstant()){
          return Operation.toString(operation);
        }
        return "";
      }
      else{
        return Operation.toString(operation);
      }
    }
  }

  this.print = function(){
    console.log(this.toString());
  }
}

function SpecialCharacter(character){
  this.displayString =  character
  this.draggable = false;

  this.toDisplayString = function(){
    return this.displayString;
  }
  this.getLength = function(){
    return this.displayString.length;
  }
  this.getDisplayLength = function(){
    if(character == '(' || character == ')'){
      return 0.5;
    }
    return 1;
  }

  this.getType = function(){
    if(character == '('){
      return "leftParen";
    }
    if(character == ')'){
      return "rightParen";
    }
    if(character == '='){
      return "equals";
    }
  }

  
}

function Equation(leftterm, rightterm){
  var left = leftterm;
  var right = rightterm;
  right.parent = this;
  left.parent = this;
  this.depth;
  this.draggable;

  this.getType =function(){
    return "equation";
  }
  
  this.replace = function(termA,termB){
    left.replace(termA,termB);
    right.replace(termA,termB);
  }

  this.flatten = function(depth,array){
    array = [];
    if(depth == undefined){
      depth = 1000;
    }
    this.depth = depth;
    if(depth == 1){
      array.push(this);
      this.draggable = true;
      return array;
    }
    
    left.flatten(depth-1,array);
    array.push(new SpecialCharacter("="));
    right.flatten(depth-1,array);
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
    return left.toString() + "=" +right.toString();
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
    return this.toDisplayString().length;
  }

  this.toDisplayString = function(){
    return this.toString();
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
