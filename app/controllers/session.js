var sys = require('sys');

var client = require("redis").createClient();
var errors = require('../../util/err');
var errorHandler = errors.newHandler();

var gh = require('grasshopper');

exports.responses = {
  'sessionStorageError' : [500, "An error occurred while processing your request."],
  
  'sessionInitOkay' : [301, "Your session has been started with id:"]
}

exports.initSession = function(id, callback) {
	client.hget("sessions", id, function(e, result) {
		if (e) {callback(exports.responses['sessionStorageError']); return false;}
		                                  
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
  //TODO: add a view, populate a list of active sessions from a model
  //TODOTODO: it would be nice to password protect these eventually, right?
  this.renderText("What session do you want to join?");
});

gh.get("/session/create", function(args) {
  this.render("session.create");
});

gh.post("/session/create/", function(args) {
  this.renderText("Not implemented sorry");
});
  
/*
  The way this works is that we grab the name of the session, match it in our DB
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

gh.get("/session/listen/{id}", function(args) {
  var lastTime = args.time ? args.time : 0;
  this.renderText("No messages yet");
});

gh.post("/session/listen/{id}", function(args) {
  this.renderText("not implemented yet");
});