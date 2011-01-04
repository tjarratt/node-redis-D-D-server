var sys = require('sys'),
    app = _app,
    util = require('../../util/util'),
    users = require("../models/user"),
    redis = require("redis"),
    client = redis.createClient(),
    errors = require('../../util/err');

require("../../lib/underscore-min");
require("../../lib/uuid");

exports.initSession = function(id, callback) {
	//confirm session exists
  client.hget(id, "isActive", function(e, activeState) {
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
app.get("/session", function(request, response) {
  var gotUserSessionCallback = function(userInfo) {
    var userName = userInfo.userName,
        localVars = {};
        
    sys.puts(userName + " is viewing this page");
    localVars.display = "How about a nice game of global thermonuclear war?";
  
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
      
        localVars.activeSessions = activeSessions;
        localVars.mySessions = thisUsersSessions;
        localVars.sessions = displayResult;
        response.render("session", {locals: localVars});
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
          thisUsersSessions.push({"name": name, "href" : "/session/start/" + id});
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
  users.getUserByCookieId(request.getCookie("uid"), gotUserSessionCallback);
});

app.get("/session/delete", function(req, res) {
  return;
  
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

app.get("/session/create", function(req, res) {
  res.render("sessions/create");
});

app.post("/session/create", function(request, response) {
  var name = request.body.name,
      max = request.body.maxPlayer,
      pass = request.body.password,
      id = Math.uuid(),
      sessionId = request.getCookie("uid");
      
  var gotSessionCallback = function(userInfo) {
    if (!userInfo || !userInfo.userName) {
      return response.send("Auth failure.");
    }
    var username = userInfo.userName;
    
    if (errors.isEmpty([name, max])) {
      response.send("Name and Max # of players are required fields.");
      return;
    }

    var self = this;

    client.hset("sessions", id, name, function(e, result) {
      if (e) { return response.send(exports.responses['sessionStorageError']);}

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
         response.send(exports.responses['sessionCreated']);
      });
    });
  }
  
  users.getUserBygetUserByCookieId(sessionId, gotSessionCallback);
  
});
  
  //ignore the comment below, we're using websockets now, with some fallback for weaksauce browsers (prob xhr + flash)
  
/*
  The way this works is that we grab the name of the session, match it in redis
  and then set up a client.subscribeTo with a callback. This callback will handle all messages and push them to 
  a hash that clients will be able to access via "/session/listen/{id}"
  
  an unfortunate limitation is that should the listener callback die, our published messages will no longer work
  Will this be an issue? Only time will tell...
*/
app.post("/session/start/:id", function(request, response) {
  this.model['id'] = request.params.id;
                  
  //stash this away so we can render a view when ready
  var self = this;
  var initializedCallback = function(response) {
    if (!response) {
      response.send("error while starting session.");
    }
    
    sys.puts("initialized session: " + resMsg);
    self.redirect("/join/" + id);
  }
  
  exports.initSession(name, initializedCallback);
});

app.get("/session/edit/:id", function(request, response) {  
  var id = request.params.id,
      sessionId = request.getCookie("uid");
  
  if (errors.isEmpty([id, sessionId])) {return response.send(exports.responses['notEnoughInfo']); }
    
  //TODO: need to also return a list of maps, images for this request
  client.hmget(id, "name", "max", "pass", function(e, result) {
    if (e) {return response.send(exports.responses['sessionStorageError']); }
    
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

app.post("/session/delete/:id", function(req, res) {
  var sessionId = req.params.id;
  
  var callback = function(text) {    
    res.send(text? "true" : "false");
  }
  sys.puts("trying to delete session with id: " + sessionId);
  
  client.hdel(sessionId, function(e, result) { sys.puts("deleted: " + sessionId + " hash obj") });
  
  client.hdel("sessions", sessionId, function(e, result) {
    sys.puts("deleted sessionId: " + sessionId);
    callback(e? false : true);
  });
})