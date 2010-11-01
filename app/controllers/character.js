var sys = require("sys");
var util = require("../../util/util");
var errors = require('../../util/err');

var gh = require("grasshopper");
var cookie = require('cookie');

var client = require('../../lib/redis-client').createClient();

var players = require("../models/player");

gh.get("/pc", function() {
  var self = this;
  
  //find cookie
  var sessionId = gh.request.getCookie("uid");
  
  //verify user
  sys.puts("looking up username for cookieId:" + sessionId);
  client.hmget("cookie:" + sessionId, "username", "defaultImage", function(e, resultArray) {
    var renderCallback = function(playerList) {
      self.model['myPCs'] = playerList;
      
      self.render("pc");
    }
    
    util.inspect(resultArray);
    var username = resultArray[0];
    username = username ? username.toString('utf8') : "unknown";
    
    var defaultImage = resultArray[1];
    defaultImage = defaultImage? defaultImage : "Tokens.png";
                              
    sys.puts("got user:" + username + " and image:" + defaultImage);
    self.model['defaultImage'] = defaultImage;
    self.model['username'] = username;
    
    if (!username || username == "unknown") {
      sys.puts("unauthenticated view of PCs page.");
      return renderCallback([]);
    }
    
    players.findUsersCharacters(username, renderCallback);
  });
  
  //find user's characters
  
  //render page
});

gh.get("/pc/{id}", function(args) {
  //get pc for this ID
  
  //render detail view
});

gh.post("/pc/new", function(args) {
  //pull information out of the POST data
  var self = this;
  var sessionId = gh.request.getCookie("uid");
  client.hmget("cookie:" + sessionId, "username", "defaultImage", function(e, result) {
    var username = util.hashResultMaybe(result, 0);
    var defaultImage = util.hashResultMaybe(result, 1);
    if (!username) {
      return self.renderText("Have you ever been authenticated?");
    }
    
    var name = util.hashResultMaybe(self.params, "name");
    var _class = util.hashResultMaybe(self.parmas, "class");
    var race = util.hashResultMaybe(self.parms, "race");
    //TODO: get the image the correct way, as we do for maps
    var image = util.hashResultMaybe(self.params, "image");

    //validate
    if (errors.isEmpty([name, _class, race, image])) {
      
      var savedNewCharacterCallback = function(result) {
        var gotPCsCallback = function(players) {
          players = players? players : [];
          
          //render page
          self.model["myPCs"] = players;
          self.render("pc");
        };

        players.findUsersCharacters(username, gotPCsCallback);
      }
      
      //create new character
      return players.create(username, name, race, _class, image, savedNewCharacterCallback);
    }
  });
});

gh.post("/pc/{id}", function(args) {
  //find info for this player 
  
  //render error on /pc page or this player info
});