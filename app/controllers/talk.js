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
    message = "wakka wakka try harder next time";
  }

  //TODO: execute `which say` to see if it's available first
  //TODO: validate input better, it would not be fun to have someone find a way to run rm -Rf /* 
  //      (even though node is never run as root)
  exec("which say", function(result) {
    sys.puts("result of which say: " + result);
    if (!result) {return self.renderText("Sorry, this only works on OS X servers.")}
    
    //render view, THEN run the command, otherwise we're blocking on shell output
    self.renderText("Hear anything yet?");
    exec("say -v cellos " + message);
  });
});