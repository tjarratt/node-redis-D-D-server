var sys = require('sys');
var url = require('url');
var queryStr = require('querystring');
var client = require("redis-client").createClient();
var errorHandler = require('err');
var sessions = require('models/session');

exports.handle = function(request, root, response) {
	var parsed = url.parse(request.url, true);
	var query = parsed.query;
	
	switch (root) {
		case "acct" :               
			//sys.puts("request: " + sys.inspect(request));
			//look for user and pass in the request
			var user = query? query.name : null;
			var pass = query? query.pass : null;
			if (errorHandler.isEmpty([user, pass])) {
				var message = "Error: username and or password expected for account creation.\n" +
								"Your request should be in this form:\n" +
								"POST http://server.com:8000/create/acct/name=FOO&pass=BAR";
				errorHandler.err(409, message, response);
				
				return false;
			}
			client.hexists("accounts", user, function(err, result) {			
				if (err) {
					errorHandler.err(500, "Whoa something bad happened when trying to create your account. Sorry bro.", response);
					return false;
				}
				if (result == false) {
					client.hset("accounts", user, pass, function(err, result) {
						if (err) {errorHandler.respondDefault(); return false;}
						
						response.writeHead(200, {'Content-Type': 'text/plain'});
						response.end("Account created successfully." + '\n');
						
						return true;
					});
				}
				else {
					errorHandler.err(409, "Username already exists. Please choose another name.", response);
					return;
				}
			});			
			
			break;
		case "map" : 
			break;
		case "session":
			var token = query.token;
			var user = query.user;
			
			client.hget("login", uuid, function(e, result) {
				if (errorHandler.isEmpty([token, user])) {
					errorHandler.err(409, "Error in creating session: Username or token missing from request.");
					return false;
				}
				
				var actualUser = result;    
				if (user != actualUser) {
					errorHandler.err(403, "You are not who you say you are. Session TERMINATED.");
					client.hdel("login", uuid, function(){return false;});
					return false;
				}
				
				var name = query.sessionName;
				var maxUsers = query.users;
				var key = query.sharedKey;
				if (errorHandler.isEmpty([name, maxUsers, key])) {
					errorHandler.err(409, "Error in creating session. Expected name, max # of user and key.\n");
				}
				                        
				var sessionID = Math.uuid();
				var sessionData = sessions.create(user, name, maxUsers, key);
				
				client.hset("sessions", sessionID, sessionData, function(e, result) {
					if (e) {errorHandle.respondDefault(); return false;}

					response.writeHead(200, {'Content-Type': 'text/plain', 'id' : sessionID});
					response.end("Created session successfully.");
				});
				
			});
			break;
		case "unit":
			break;
		case "pc" :
			break;
	}
}