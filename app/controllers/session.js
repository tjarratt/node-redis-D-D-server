var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");
var users = require("../models/user");
var redis = require("../../lib/redis-client");
var client = redis.createClient();
var errors = require('../../util/err');

require("../../lib/underscore-min")
var gh = require('grasshopper');

exports.initSession = function(id, callback) {
	//confirm session exists
  client.hget(id, "isActive" function(e, activeState) {
  	//set session state == active
    if (e || !sessionInfo) {return callback(false);}
    activeState = activeState == "true"? true : false;
    if (activeState) {return callback(false);}
    client.hset(id, "isActive", "true", function(e, result) {
      if (e || !result) {return callback(false);}
      callback(true);
    });
  });
}

/*
Several things we want to show here
A list of sessions owned by the user
A list of active sessions you could join
A list of all sessions (why not?)
*/
gh.get("/session", function() {
  var self = this;
  this.disableCache();
  
  var gotUserSessionCallback = function(userInfo) {
    var userName = userInfo.userName;
    sys.puts(userName + " is viewing this page");
    self.model['display'] = "How about a nice game of global thermonuclear war?"
  
    //TODOTODO: it would be nice to password protect these eventually, right?
    //          actually maybe not? we should still list them here
    client.hgetall("sessions", function(e, result) {
      var sessions = result? result : [];
    
      var activeSessions = [];
      var thisUsersSessions = [];
      
      var displayResult = [];
      var i = 0;
      var sessionsToDisplay = _.keys(sessions).length;
      var renderSessions = function() {
        if (activeSessions.length == 0) {
          activeSessions = [{"name" : "There are no active sessions. Maybe you should create one?","href" : "/session/create"}];
        }
        if (thisUsersSessions.length == 0) {
          var emptyForm = "";
          thisUsersSessions = [{"name": "You do not own any sessions", "form" : emptyForm}];
        }
      
        self.model['activeSessions'] = activeSessions;
        self.model["mySessions"] = thisUsersSessions;
        self.model['sessions'] = displayResult;
        self.render("session");
      }
    
      var gotSessionDetails = function(e, sessionInfo) {
        if (e || !sessionInfo) {
          sessionsToDisplay--;
          return sessionsToDisplay <= 0? renderSessions() : false;
        }
        //pull interesting values out of the result
        var owner = util.hashResultMaybe(sessionInfo, "owner"),
            active = util.hashResultMaybe(sessionInfo, "isActive"),
            name = util.hashResultMaybe(sessionInfo, "name"),
            id = util.hashResultMaybe(sessionInfo, "id");
      
        active = active == "true" ? true : false;
        if (owner == userName) {
          var form = '<form method="POST" action="/session/start/' + id + '">' +
    				'<input type="submit" value="Start This Session" />' +
    			'</form>';
          thisUsersSessions.push({"name": name, "form" : form});
        }
        if (active) {activeSessions.push({"name" : name, "href": "/join/" + id});}
        sessionsToDisplay--;
      
        if (sessionsToDisplay <= 0) {
          return renderSessions();
        }
      }
    
      //value, key, list
      _.each(sessions, function(name, id, list) {
        displayResult[i] = new Object;
        displayResult[i].name = name;
        displayResult[i++].id = id;
      
        client.hgetall(id, gotSessionDetails);
      });
    });
  }
  users.getUserByCookieId(gh.request.getCookie("uid"), gotUserSessionCallback);
});

gh.get("/session/delete", function() {
  var self = this;
  
  var callback = function(text) {    
    self.model['display'] = text || "Deleted all existing sessions.";
    self.model['sessions'] = [];
    
    self.render("session");
  }
  
  client.hkeys("sessions", function(e, keys) {
    if (!keys) {return callback("No sessions to delete!")}
    
    _.each(keys, function(sessionId) {
      sys.puts("trying to delete session with id: " + sessionId);
      
      client.hdel(sessionId, function(e, result) { sys.puts("deleted: " + sessionId + " hash obj") });
      
      client.hdel("sessions", sessionId, function(e, result) {
        sys.puts("deleted sessionId: " + sessionId);
      });
    });
    
    callback("Finished deleting all sessions.");
  });
})

gh.get("/session/create", function(args) {
  this.render("sessions/create");
});

gh.post("/session/create", function(args) {
  var name = this.params['name'],
      max = this.params['maxPlayer'],
      pass = this.params['password'];
      id = Math.uuid(),
      sessionId = gh.request.getCookie("uid");
      
  var gotSessionCallback = function(userInfo) {
    if (!userInfo || !userInfo.userName) {
      return self.renderText("Auth failure.");
    }
    var username = userInfo.userName;
    
    if (errors.isEmpty([name, max])) {
      this.renderText("Name and Max # of players are required fields.");
      return;
    }

    var self = this;

    client.hset("sessions", id, name, function(e, result) {
      if (e) { return self.renderText(exports.responses['sessionStorageError']);}

      client.hmset(id, "name", name, "id", id, "max", max, "pass", pass, "owner", username, function(e, res) {
         if (e) {
           //failed to write session data, rrrrroll back
           sys.puts("wrote sessionID, but no data. Welp.");
           client.hdel("sessions", id, function(e, r) {
              self.model['display'] = exports.responses['sessionStorageError'];
              self.render("session");

              return;
             });
         }
         self.renderText(exports.responses['sessionCreated']);
      });
    });
  }
  
  users.getUserBygetUserByCookieId(sessionId, gotSessionCallback);
  
});
  
  //ignore the comment below, we're using websockets now, with some fallback for weaksauce browsers (prob xhr)
  
/*
  The way this works is that we grab the name of the session, match it in redis
  and then set up a client.subscribeTo with a callback. This callback will handle all messages and push them to 
  a hash that clients will be able to access via "/session/listen/{id}"
  
  an unfortunate limitation is that should the listener callback die, our published messages will no longer work
  Will this be an issue? Only time will tell...
*/
gh.post("/session/start/{id}", function(args) {
  this.model['id'] = args.id;
                  
  //stash this away so we can render a view when ready
  var self = this;
  var initializedCallback = function(response) {
    if (!response) {
      self.renderText("error while starting session.");
    }
    
    sys.puts("initialized session: " + resMsg);
    self.redirect("/join/" + id);
  }
  
  exports.initSession(name, initializedCallback);
});

gh.get("/session/edit/{id}", function(args) {
  this.disableCache();
  
  var self = this,
      id = args.id,
      sessionId = gh.request.getCookie("uid");
  
  if (errors.isEmpty([id, sessionId])) {return exports.responses['notEnoughInfo']}
    
  //TODO: need to also return a list of maps, images for this request
  client.hmget(id, "name", "max", "pass", function(e, result) {
    if (e) {return exports.responses['sessionStorageError']}
    name = result[0];
    max = result[1];
    pass = result[2] ? result[2] : "none";
    var ajaxId = Math.uuid();
    
    client.hmset("cookie:" + sessionId, "ajaxId", ajaxId, function(e, result) {
      if (e || !result) {sys.puts('error while setting ajax id for this session.');}
      
      self.model["sid"] = ajaxId;
      self.model['name'] = name;
      self.model['max'] = max;
      self.model['pass'] = pass? pass : "none";
      self.model['id'] = id;

      self.render("sessions/edit");
    });
    
  });
});

gh.post("/session/delete/{id}", function(args) {
  var self = this,
      sessionId = args.id;
  
  var callback = function(text) {    
    self.renderText(text? "true" : "false");
  }
  sys.puts("trying to delete session with id: " + sessionId);
  
  client.hdel(sessionId, function(e, result) { sys.puts("deleted: " + sessionId + " hash obj") });
  
  client.hdel("sessions", sessionId, function(e, result) {
    sys.puts("deleted sessionId: " + sessionId);
  });
})