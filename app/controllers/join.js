var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");
var errors = require('../../util/err');

var client = require('../../lib/redis-client').createClient();

var errors = require('../../util/err');
require("../../lib/underscore-min")

var gh = require('grasshopper');

responses = {
  'idInactiveError' : "This session is not active right now.",
  'joinSuccess' : "Let's get ready to roll some dice!",
  "noUserError" : "Client error: no user specified",
  'dbError' : "Database error."
}

gh.get("/join/{id}", function(args) {
  var self = this;
  var id = args.id;
                                    
  //actually, should be reading this from a cookie : too busy to implement yet
  if (!this.params) {
    return this.renderText(responses['noUserError']);
  }
  
  //TODO: don't let more than 10 people join a table
  
  var thisUser = this.params['user'];//TODO: replace this with a session var
  var now = new Date();
  var websocketId = Math.uuid();
  
  if (errors.isEmpty([thisUser, id])) {return self.renderText(responses['noUserError'])}
  
  //make sure this is an existing, active session
  client.hexists("active", id, function(e, result) {
    if (e || result != true) {return self.renderText(responses['idInactiveError'])}
      
    sys.puts("setting this info for user with id: " + websocketId);
    sys.puts("name: " + thisUser);
    sys.puts("room: " + id);
    
    //the sockets hash will hold all current users by websocketId, and a reference to the room they are currently in 
    client.hmset("users:" + websocketId, "room", id, "name", thisUser, function(e, result) {
      if (e || !result) {return self.renderText(responses['dbError'])}
      
      self.model['display'] = responses['joinSuccess'];
      self.model['listenId'] = id;
      self.model['useDefault']  = true; //use a default image for now, so this looks less broken when there is no map uploaded for a session
      self.model['websocketId'] = websocketId;

      self.render("room");
    });
      
  });
});