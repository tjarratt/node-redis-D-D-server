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
  'joinSuccess' : "",
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
  
  //get user session data TODO: replace this with users.getUserByCookieId
  client.hmget("cookie:" + sessionId, "username", "defaultImage", function(e, result) {
    if (e || !result || !result.length || result.length < 1 || result[0] == null) {
      self.flash["message"] = "You should authenticate before trying that again.";
      return self.redirect("/account");
    }
    var thisUser = result[0].toString('utf8');
    var imageName = result[1]? result[1].toString('utf8') : "Tokens";
  
    if (errors.isEmpty([thisUser, id, imageName])) {return self.renderText(responses['noUserError'])}
  
    //make sure this is an existing, active session
    client.hmget(id, "isActive", "owner", function(e, result) {
      if (e || !result) {return self.renderText(responses['idInactiveError']);}
      var isActive = util.hashResultMaybe(result, 0);
      if (!isActive) {return self.renderText(responses['idInactiveError']);}
      
      var owner = util.hashResultMaybe(result, 1);
    
      //the sockets hash will hold all current users by websocketId, and a reference to the room they are currently in 
      client.hmset("users:" + sessionId, "room", id, "name", thisUser, "defaultImage", imageName, function(e, result) {
        if (e || !result) {return self.renderText(responses['dbError'])}
      
        //get a list of the existing usernames + images
        client.lrange(id + "/users", 0, 10, function(e, users) {
          users = users? users.toString().split(",") : [];
          var totalUsers = users.length;
          var thisPlayer = {name: thisUser, src: imageName}
        
          var players = [thisPlayer]
        
          if (users.length <= 0 || owner == thisUser) {
            self.model['players'] = players;
            self.model['display'] = responses['joinSuccess'];
            self.model['listenId'] = id;
            self.model['useDefault']  = true; //use a default image for now, so this looks less broken when there is no map uploaded for a session
            self.model['websocketId'] = sessionId;
            self.model['imageName'] = imageName;
            self.model['userName'] = thisUser;
            self.model['url'] = "butter3.local";
            self.model['isDM'] = true;
            
            //TODO:need to move this into a subview
            //adding some methods for rendering it would be nice too
            self.model["dmPaletteOrNothing"] = '<div id="dmPalette">' +
            	'<h3>Tools</h3>' + 
            	'<input type="button" id="tool_annotate" >' + 
            	'<input type="button" id="tool_shadow" >' + 
            	'<input type="button" id="tool_erase" >' + 
            	'<input type="button" id="tool_wipe" >' + 
            	'<input type="button" id="tool_move" >' +
            	'<canvas id="annotateColor" width="100" height="101"></canvas>' + 
            	'<div id="swatch" class="ui-widget-content ui-corner-all"></div>' + 
            '</div>' +
            '<div class="clear"></div>' + 
            '<h3>Maps</h3>' + 
            '<div id="dmMaps">' + 
            '<p id="innerMapContainer"></p>' + 
            '</div>';

            //get outta here!
            return self.render("room");
          }
        
          //user is not DM, we need to set this up so they can see other users
          //might be possible to push this off to an API call later
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
                  userName = userName? userName.toString('utf8') : "some user";//that is kind of a weird way to fail
                  imageSrc = imageSrc? imageSrc.toString('utf8') : "/res/img/Tokens.png";
                  if (!imageSrc.match("/res/img/")) {imageSrc = "/res/img/" + imageSrc + ".png";}
                
                  sys.puts("identified : " + userName + " with image: " + imageSrc + " " + totalUsers + " remaining to lookup.");
                  
                  var isDuplicate = false;
                  _.each(players, function(playerObj, key, list) {
                    if (playerObj.name == userName) {
                      isDuplicate = true;
                      return false;
                    }
                  });
                  
                  if (!isDuplicate) {
                    var thisPlayer = {name: userName, src: imageSrc};
                    players.push(thisPlayer);
                  }
                  
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