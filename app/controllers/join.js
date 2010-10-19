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
  
  //TODO: replace these with session vars
  var thisUser = this.params['user'];
  var imageName = this.params['image'];
  
  var now = new Date();
  var websocketId = Math.uuid();
  
  if (errors.isEmpty([thisUser, id, imageName])) {return self.renderText(responses['noUserError'])}
  
  //make sure this is an existing, active session
  client.hexists("active", id, function(e, result) {
    if (e || result != true) {return self.renderText(responses['idInactiveError'])}
      
    sys.puts("setting this info for user with id: " + websocketId);
    sys.puts("name: " + thisUser);
    sys.puts("room: " + id);
    
    //the sockets hash will hold all current users by websocketId, and a reference to the room they are currently in 
    client.hmset("users:" + websocketId, "room", id, "name", thisUser, "defaultImage", imageName, function(e, result) {
      if (e || !result) {return self.renderText(responses['dbError'])}
      
      sys.puts("getting a list of existing users...");
      //get a list of the existing usernames + images
      client.lrange(id + "/users", 0, 10, function(e, users) {
        users = users? users.toString().split(",") : [];
        var totalUsers = users.length;
        var thisPlayer = {name: thisUser, src: "/res/img/" + imageName + ".png"}
        
        var players = [thisPlayer]
        
        if (users.length <= 0) {
          self.model['players'] = players;
          self.model['display'] = responses['joinSuccess'];
          self.model['listenId'] = id;
          self.model['useDefault']  = true; //use a default image for now, so this looks less broken when there is no map uploaded for a session
          self.model['websocketId'] = websocketId;
          self.model['imageName'] = imageName;
          self.model['userName'] = thisUser;

          //get outta here!
          return self.render("room");
        }
        
        //in most browsers it should be safe to do this, but we might also consider storing this count in redis, since operations there can be atomic
        _.each(users, function(userId, index) {
          //get info from redis
          client.hmget("users: " + userId, "name", "defaultImage", function(e, result) {
            result = result? result.toString().split(",") : [];
            
            totalUsers--;
            
            if ((e || !result || result.length < 2) && totalUsers > 0) {
              return;
            }
            
            var userName = result[0];
            var imageSrc = result[1];
            
            userName = userName? userName.toString('utf8') : "some user";
            imageSrc = imageSrc? "/res/img/" + imageSrc.toString('utf8') + ".png" : "/res/img/Tokens.png";

            var thisPlayer = {name: userName, src: imageSrc};
            players.push(thisPlayer);

            if (totalUsers <= 0) {
              self.model['players'] = players;
              self.model['display'] = responses['joinSuccess'];
              self.model['listenId'] = id;
              self.model['useDefault']  = true; //use a default image for now, so this looks less broken when there is no map uploaded for a session
              self.model['websocketId'] = websocketId;
              self.model['imageName'] = imageName;
              self.model['userName'] = thisUser;

              self.render("room");
            }
          });
        });
      });
    });
      
  });
});