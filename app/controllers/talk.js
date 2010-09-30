var sys = require('sys')
var exec = require('child_process').exec;

var errors = require('../../util/err');

var gh = require('grasshopper');

gh.get("/talk", function() {
  this.render('talk');
});

gh.post("/talk", function(args) {
  var message = this.params['message'];
  if (errors.isEmpty([message])) {
    this.renderText("Failed, you should provide a message maybe?");
    return;
  }
  
  //little bit of cleanup
  if (message.indexOf(";") >= 0) {
    message = message.substr(0, message.indexOf(";"));
  }
  if (message.indexOf("&&") >= 0) {
    message = message.substr(0, message.indexOf("&&"));
  }
  
  if (message.length <= 1) {
    this.renderText("Say nothing once? Why say it again? (sanitzed: " + message + ")");
    return;
  }
    
  var self = this;
  var callback = function() {
    self.renderText("Hear anything yet?");
  }
  
  //TODO: execute `which say` to see if it's available first
  //TODO: validate input better, it would not be fun to have someone find a way to run rm -Rf /* 
  //      (even though node is never run as root)
  
  exec("say -v cellos " + message, callback);
});