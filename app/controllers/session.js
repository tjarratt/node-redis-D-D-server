var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");

var redis = require("../../lib/redis-client");
var client = redis.createClient();

var errors = require('../../util/err');

require("../../lib/underscore-min")

var gh = require('grasshopper');

exports.responses = {
  'sessionStorageError' : [500, "An error occurred while processing your request."],
  'sessionNotFound' : [403, 'No session was found'],
  'sessionInitOkay' : [301, "Your session has been started with id:"],
  'sessionCreated' : [200, "Your session has been successfully created."],
  'notEnoughInfo' : [400, "You did not supply enough information for this request."]
}

exports.initSession = function(id, callback) {
	client.hget("sessions", id, function(e, result) {
		if (e) {callback(exports.responses['sessionStorageError']); return false;}
		
		if (!result) {callback(exports.responses['sessionNotFound']); return false;}
		                                  
    //TODO: add this information to the result hash from redis
		var sessionData = {'players': []};
		
		client.hset("activeSessions", id, sessionData, function(e, result) {
			if (e) {callback(exports.responses['sessionStorageError']); return false;}
			
			var receivedMessageCallback = function(result, args) {
				sys.puts("got result: " + result + " and args? " + args);
			}
			
			client.subscribeTo("active:" + id, receivedMessageCallback);
			
			callback(exports.responses['sessionInitOkay']);
		});
	});
}

gh.get("/session", function() {
  this.disableCache();
  
  this.model['display'] = "How about a nice game of global thermonuclear war?"
  
  //TODO: add a view, populate a list of active sessions from a model
  //TODOTODO: it would be nice to password protect these eventually, right?
  //          actually maybe not? we should still list them here
  var self = this;
  client.hgetall("sessions", function(e, result) {
    sys.puts("got this result from hgetall sessions: " + result);    
    //util.inspect(result);
    
    if (!result) {result = []}
      
    var displayResult = [];
    var i = 0;
    _.each(result, function(v, k, l) {
      //sys.puts("looping over list with key: " + k + " and value: " + v);
      
      displayResult[i] = new Object;
      displayResult[i].name = v;
      displayResult[i++].id = k;
    });
    
    
    var activeSessions = [
      {"name" : "There are no active sessions. Maybe you should create one?",
      "href" : "/session/create"}
    ]
    
    self.model['activeSessions'] = activeSessions;
    
    self.model['sessions'] = displayResult;
    self.render("session");
    
  });
  
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
      id = Math.uuid();      
  
  if (errors.isEmpty([name, max])) {
    this.renderText("Name and Max # of players are required fields.");
    return;
  }
  
  var self = this;
    
  client.hset("sessions", id, name, function(e, result) {
    if (e) { return self.renderText(exports.responses['sessionStorageError']);}
    
    client.hmset(id, "name", name, "id", id, "max", max, "pass", pass, function(e, res) {
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
  
});
  
  //ignore the comment below, we're using websockets now, with some fallback for weaksauce browsers (prob xhr)
  
/*
  The way this works is that we grab the name of the session, match it in redis
  and then set up a client.subscribeTo with a callback. This callback will handle all messages and push them to 
  a hash that clients will be able to access via "/session/listen/{id}"
  
  an unfortunate limitation is that should the listener callback die, our published messages will no longer work
  Will this be an issue? Only time will tell...
*/
gh.post("/session/start/{name}", function(args) {
  var id = Math.uuid();
  this.model['name'] = args.name;
  this.model['id'] = id;
                  
  //stash this away so we can render a view when ready
  var self = this;
  
  var initializedCallback = function(response) {
    var resCode = response[0];
    var resMsg = response[1] + id;
    
    sys.puts("initialized session: " + resMsg);
    self.renderText(resMsg);
  }
  
  //todo: check that this session is not ALREADY in progess
  exports.initSession(name, initializedCallback);
});

gh.get("/session/edit/{id}", function(args) {
  this.disableCache();
  
  var self = this,
      id = args.id,
      sessionId = gh.request.getCookie("uid");
  
  if (errors.isEmpty([id])) {return exports.responses['notEnoughInfo']}
    
  //TODO: need to also return a list of maps, images for this request
  client.hmget(id, "name", "max", "pass", function(e, result) {
    if (e) {return exports.responses['sessionStorageError']}
    name = result[0];
    max = result[1];
    pass = result[2] ? result[2] : "none";
    var ajaxId = Math.uuid();
    
    client.hset("cookie:" + sessionId, "ajaxId", ajaxId, function(e, result) {
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