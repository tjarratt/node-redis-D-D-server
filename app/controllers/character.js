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
      sys.puts("in myPCs render callback with list: " + playerList);
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
    
    //find user's characters
    players.findUsersCharacters(username, renderCallback);
  });
});

gh.get("/pc/{id}", function(args) {
  var self = this,
      sessionId = gh.request.getCookie("uid"),
      playerId = args.id;
  if (!playerId) {
    sys.puts("bad request for a pc with id: " + id);
    return self.renderText("Sorry, that didn't seem to be an actual character.");
    //should actually render PC.html with a specific message
    //need to build this sort of framework on top of what we're already doing here
  }
  client.hmget("cookie:" + sessionId, "username", "defaultImage", function(e, result) {
    var username = util.hashResultMaybe(result, 0);
    var defaultImage = util.hashResultMaybe(result, 1);
    if (!username) {
      self.flash["message"] = "You should authenticate before trying that again.";
      return self.redirect("/account");
    }
    var renderCallback = function(pcInfo) {
      self.model["player"] = pcInfo;
      return self.render("pc/singleView");
    }
    players.getPCInfo(playerId, renderCallback);
  });
  
});

gh.post("/pc/new", function(args) {
  //pull information out of the POST data
  var self = this;
  var sessionId = gh.request.getCookie("uid");
  client.hmget("cookie:" + sessionId, "username", "defaultImage", function(e, result) {
    sys.puts("seems like " + result[0].toString('utf8') + " is creating a new PC");
    
    var username = util.hashResultMaybe(result, 0);
    var defaultImage = util.hashResultMaybe(result, 1);
    sys.puts("for sessionId: " + sessionId);
    sys.puts("found user: " + username);
    
    if (!username) {
      self.flash["message"] = "You should authenticate before trying that again.";
      return self.redirect("/account");
    }
    
    sys.puts("params: " + self.params);
    sys.puts("creating user " + self.params["name"].toString("utf8") + ", " + self.params["class"].toString("utf8") + " (" + self.params["race"].toString("utf8") + ")");
    var name = util.hashResultMaybe(self.params, "name");
    var _class = util.hashResultMaybe(self.params, "class");
    var race = util.hashResultMaybe(self.params, "race");

    //validate
    if (errors.isEmpty([name, _class, race, image])) {
      
      var savedNewCharacterCallback = function(result) {
        var gotPCsCallback = function(players) {
          sys.puts("got players for this user: " + players);
          players = players? players : [];
          
          sys.puts('rendering pcs page');
          //render page
          self.model["myPCs"] = players;
          self.model["username"] = username;
          self.render("pc");
        }
        players.findUsersCharacters(username, gotPCsCallback);
      }
      return players.create(username, name, race, _class, savedNewCharacterCallback);
    }
  });
});

gh.post("/pc/{id}", function(args) {
  var self = this,
      sessionId = gh.request.getCookie("uid"),
      playerId = args.id,
      name = util.hashResultMaybe(this.params, "name"),
      race = util.hashResultMaybe(this.params, "race"),
      _class = util.hashResultMaybe(this.params, "class"),
      image = util.hashResultMaybe(this.params, "image");
      
  if (!sessionId) {
    self.flash["message"] = "You should authenticate before trying that again.";
    return self.redirect("/account");
  }
  if (errors.isEmpty([playerId, name, race, _class, image])) {
    return self.renderText("All fields are mandatory, broseph.");
  }
  //TODO: confirm session, check ownership
  
  var playerInfo = {"name" : name, "race" : race, "_class": _class, "image" : image};
  var renderCallback = function(result) {
    return self.redirect("/pc/" + playerId);
  }
  sys.puts("setting image : " + image + " for playerId : " + playerId);
  players.setPCInfo(playerId, playerInfo, renderCallback);
});