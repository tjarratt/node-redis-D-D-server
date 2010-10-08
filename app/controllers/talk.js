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
    return this.renderText("Failed, you should provide a message maybe?");
  }
  
  //little bit of cleanup
  if (message.indexOf(";") >= 0) {
    message = message.substr(0, message.indexOf(";"));
  }
  if (message.indexOf("&") >= 0) {
    message = message.substr(0, message.indexOf("&"));
  }
  
  if (/^[A-Za-z0-9\s]*$/.test(message) != true) {
    message = "wakka wakka you fool try harder next time";
  }

  //TODO: execute `which say` to see if it's available first
  //TODO: validate input better, it would not be fun to have someone find a way to run rm -Rf /* 
  //      (even though node is never run as root)
  
  exec("say -v cellos " + message);
  self.renderText("Hear anything yet?");
});