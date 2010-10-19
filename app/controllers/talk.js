var sys = require('sys')
var exec = require('child_process').exec;

var errors = require('../../util/err');

var gh = require('grasshopper');

gh.get("/talk", function() {
  this.render('talk');
});

gh.post("/talk", function(args) {
  var self = this;
  var message = originalMessage = this.params['message'];
  
  if (errors.isEmpty([message])) {
    return this.renderText("Failed, you should provide a message maybe?");
  }
  
  //hey let's not allow any bad input
  message = message.replace(/[~`!@#$%^&*()_+-=":';?\/>.<,]/g, "");
  if (/^[A-Za-z0-9\s]*$/.test(message) != true) {
    sys.puts("found a message that does not match our regex: " + message);
    message = "Congratulations, you just found a golden wonka ticket.";
  }

  //TODO: execute `which say` to see if it's available first
  //TODO: validate input better, it would not be fun to have someone find a way to run rm -Rf /* 
  //      (even though node is never run as root)
  exec("which say", function(result) {
    //result is always null, which is lame
    //if (!result) {return self.renderText("Sorry, this only works on OS X servers.")}
    
    //render view, THEN run the command, otherwise we're blocking on shell output
    self.renderText("Hear anything yet?");
    exec("say -v cellos " + message);
  });
});