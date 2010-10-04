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
  'joinSuccess' : "Roll some 20s, broseph. Sick, so sick.",
  "noUserError" : "Client error: no user specified"
}

gh.get("/join/{id}", function(args) {
  var self = this;
  var id = args.id;
                                    
  //actually, should be reading this from a cookie : too lazy to implement yet
  if (!this.params) {
    return this.renderText(responses['noUserError']);
  }
  
  var thisUser = this.params['user'];
  if (errors.isEmpty([thisUser, id])) {return self.renderText(responses['noUserError'])}
  
  //make sure this is an existing, active session
  client.hexists("active", id, function(e, result) {
    if (e || result != true) {return self.renderText(responses['idInactiveError'])}
    
    //add this user to the list of users in the room
    client.rpush(id + "/users", thisUser, function(e, result) {
      //send back a timestamp and id where the user can listen for messages / updates
      var now = new Date();
      var listenId = id + "/listen";
      
      self.model['display'] = responses['joinSuccess'];
      self.model['startTime'] = now;
      self.model['listenId'] = listenId;
      
      self.render("room");
    });
  });
});