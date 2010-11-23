var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");
var errors = require('../../util/err');

var client = require('../../lib/redis-client').createClient();

var errors = require('../../util/err');
require("../../lib/underscore-min"); //exposed via _ obj

var gh = require('grasshopper');
var cookie = require('cookie');

responses = {
  'idInactiveError' : "This session is not active right now.",
  'joinSuccess' : "Let's get ready to roll some dice!",
  "noUserError" : "Client error: no user specified",
  'dbError' : "Database error."
}

gh.get("/join/{id}", function(args) {
  var self = this;
  var id = args.id;
  
  //TODO: don't let more than 10 people join a table
  
  //get the ID for their session variables
  var sessionId = gh.request.getCookie("uid");  
  var now = new Date();
  
  sys.puts("user with cookie:" + sessionId + " attempting to join room:" + id);
  
  //get user session data
  client.hmget("cookie:" + sessionId, "username", "defaultImage", function(e, result) {
    if (e || !result || !result.length || result.length < 1 || result[0] == null) {
      return self.renderText("Have you ever been authenticated?");
    }
    var thisUser = result[0].toString('utf8');
    var imageName = result[1]? result[1].toString('utf8') : "Tokens";
  
    if (errors.isEmpty([thisUser, id, imageName])) {return self.renderText(responses['noUserError'])}
  
    //make sure this is an existing, active session
    client.hexists("active", id, function(e, result) {
      if (e || result != true) {return self.renderText(responses['idInactiveError'])}
    
      //the sockets hash will hold all current users by websocketId, and a reference to the room they are currently in 
      client.hmset("users:" + sessionId, "room", id, "name", thisUser, "defaultImage", imageName, function(e, result) {
        if (e || !result) {return self.renderText(responses['dbError'])}
      
        //sys.puts("getting a list of existing users...");
        //get a list of the existing usernames + images
        client.lrange(id + "/users", 0, 10, function(e, users) {
          users = users? users.toString().split(",") : [];
          totalUsers = users.length;
          var thisPlayer = {name: thisUser, src: "/res/img/" + imageName + ".png"}
        
          var players = [thisPlayer]
        
          if (users.length <= 0) {
            self.model['players'] = players;
            self.model['display'] = responses['joinSuccess'];
            self.model['listenId'] = id;
            self.model['useDefault']  = true; //use a default image for now, so this looks less broken when there is no map uploaded for a session
            self.model['websocketId'] = sessionId;
            self.model['imageName'] = imageName;
            self.model['userName'] = thisUser;
            self.model['url'] = "butter3.local";
            self.model['isDM'] = true;
            
            //need to move this into a subview
            //adding some methods for rendering it would be nice too
            self.model["dmPaletteOrNothing"] = '<div id="dmPalette">' +
            	'<h3>Tools</h3>' + 
            	'<input type="button" id="tool_annotate" src="/res/img/palette/annotate.png"/>' + 
            	'<input type="button" id="tool_shadow" src="/res/img/palette/shadow.png"/>' + 
            	'<input type="button" id="tool_erase" src="/res/img/palette/erase.png"/>' + 
            	'<input type="button" id="tool_wipe" src="/res/img/palette/wipe.png" />' + 
            	'<div id="red"></div>' +
            	'<div id="blue"></div>' +
            	'<div id="green"></div>' +
            	'<div id="swatch" class="ui-widget-content ui-corner-all"></div>' + 
            '</div>';

            //get outta here!
            return self.render("room");
          }
        
          //in most browsers it should be safe to do this, but we might also consider storing this count in redis, since operations there can be atomic
          _.each(users, function(socketid, index) {
            //get info from redis
            client.hget("sockets", socketid, function(e, userId) {
            
              var fetchThisUser = function(userId) {
                client.hmget("users:" + userId, "name", "defaultImage", function(e, result) {
                
                  result = result? result.toString().split(",") : [];
                  var userName = result[0];
                  var imageSrc = result[1];
                
                  if (e || !result || result.length < 2 || (!userName || !imageSrc)) {
                    sys.puts("got no result for hmget users:" + userId + " will attempt on next process tick.");
                    return process.nextTick(fetchThisUser(userId));
                  }

                  totalUsers--;

                  //that is kind of a weird way to fail
                  userName = userName? userName.toString('utf8') : "some user";
                  imageSrc = imageSrc? "/res/img/" + imageSrc.toString('utf8') + ".png" : "/res/img/Tokens.png";
                
                  sys.puts("identified : " + userName + " with image: " + imageSrc + " " + totalUsers + " remaining to lookup.");

                  var thisPlayer = {name: userName, src: imageSrc};
                  players.push(thisPlayer);
                
                  if (totalUsers <= 0) {
                    return renderRoomWithPlayers(players);
                
                  };
                });
              }
              var renderRoomWithPlayers = function(players) {
                self.model['players'] = players;
                self.model['display'] = responses['joinSuccess'];
                self.model['listenId'] = id;
                self.model['useDefault']  = true; //use a default image for now, so this looks less broken when there is no map uploaded for a session
                self.model['websocketId'] = sessionId; //TODO: use this to dedupe websockets when someone joins a room in multiple tabs
                self.model['imageName'] = imageName;
                self.model['userName'] = thisUser;
                self.model['url'] = "butter3.local";
                self.model['isDM'] = false;
                self.model['dmPaletteOrNothing'] = "";

                self.render("room");
              }
            
              fetchThisUser(userId);
            });
          });
        });
      });
      
    });
  });
});