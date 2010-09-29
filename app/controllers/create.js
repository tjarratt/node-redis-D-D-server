var sys = require('sys');

var client = require("redis-client").createClient();
var errors = require('err');
var errorHandler = errors.newHandler();

var gh = require('grasshopper');

gh.get("/account", function() {
  this.renderText("Your account information will be here.");
});

gh.post("/account/{name}", function(args) {
  this.renderText("Updated your account successfully");
});

/*
 * Create multipart parser to parse given request
 */
function parse_multipart(req) {
	var multipart = require('lib/multipart');
    var parser = multipart.parser();

    // Make parser use parsed request headers
    parser.headers = req.headers;

    // Add listeners to request, transfering data to parser
    req.addListener("data", function(chunk) {
        parser.write(chunk);
    });

    req.addListener("end", function() {
        parser.close();
    });

    return parser;
}

function upload_complete(res, id) {
	res.writeHead(200, {'Content-Type': 'text/plain', 'id': id});
	res.end("Saved file with id " + id);
}
                                   
//possible responses emitted by this object
exports.responses = {
  'methodNotDefinedError' : [500, 'Method not defined. What are you trying to create?'],
  
  'accountSuccess' : [200, "Account created successfully."],
  'accountInputFailure' : [409, "username and password are necessary for account creation.\n"],
  'accountError' : [500, "whoa something ba happened when trying to creat your account. Sorry bro."],
  'accountExistsError' : [409, "Username already exists. Please choose another name."],
}

exports.acct = function(responder, username, password) {
  if (errors.isEmpty([username, password])) {
    return exports.responses['accountInputFailure'];
  }
  
  client.hexists("accounts", user, function(err, result) {			
		if (err) {
      return exports.responder.renderText(exports.responses['accountError']);
		}
		if (result == false) {
			client.hset("accounts", user, pass, function(err, result) {
				if (err) return exports.responder.renderText(exports.responses['accountError']);
				
				return exports.responses['accountSuccess'];
			});
		}
		else {
			return exports.responses['accountExistsError'];
		}
	});
}

exports.handle = function(responder, type, args) {
  if (!_.include(exports.methods, type || !typeof(exports[type]) != "function")) {
    return exports.responses['methodNotDefinedError'];
  }
  
  exports.responder = responder;
  
  sys.puts("in handle");
  sys.puts("type: " + type);
  	
	switch (type) {
		case "acct" :
		  sys.puts("in acct");
		  
		  exports.acct(responder, args.username, args.password);
		  
		  sys.puts("after acct()");
			
			client.hexists("accounts", user, function(err, result) {
			  sys.puts("about to render from client hexists call");
			  responder.renderText("WHAT");
			  
				if (err) {
					errorHandler.err(500, "Whoa something bad happened when trying to create your account. Sorry bro.", response);
					return false;
				}
				if (result == false) {
					client.hset("accounts", user, pass, function(err, result) {
						if (err) {errorHandler.err(); return false;}
						
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
			sys.puts("whurg;");
			
			break;
		case "map" :
		 	var maps = require('models/maps');
			var multipart = require('lib/multipart');
			var fs = require('fs');
			
			var token = args.token;
			var user = args.user;
			var name = args.filename;
			
			if (errors.isEmpty([token, user, name])) {
				errorHandler.err(409, "Username or token missing from request.");
				return false;
			}
			
			request.setEncoding('binary');
			
			// Handle request as multipart
			var stream = parse_multipart(request);
			
			var fileName = null;
		    var fileStream = null;

		    // Set handler for a request part received
		    stream.onPartBegin = function(part) {
		        // Construct file name
		        fileName = "/nodeUploads/" + stream.part.filename;

		        // Construct stream used to write to file
		        fileStream = fs.createWriteStream(fileName);

		        // Add error handler
		        fileStream.addListener("error", function(err) {
		            sys.debug("Got error while writing to file '" + fileName + "': ", err);
		        });

		        // Add drain (all queued data written) handler to resume receiving request data
		        fileStream.addListener("drain", function() {
		            request.resume();
		        });
		    };

		    // Set handler for a request part body chunk received
		    stream.onData = function(chunk) {
		        // Pause receiving request data (until current chunk is written)
		        request.pause();

		        // Write chunk to file
		        // Note that it is important to write in binary mode
		        // Otherwise UTF-8 characters are interpreted
		        fileStream.write(chunk, "binary");
		    };

		    // Set handler for request completed
		    stream.onEnd = function() {
		        // As this is after request completed, all writes should have been queued by now
		        // So following callback will be executed after all the data is written out
		        fileStream.addListener("drain", function() {
		            // Close file stream
		            fileStream.end();
		
					var id = Math.uuid();
					var mapData = maps.create(user, fileName, id);
					//sys.puts("id: " + id + "\ndata: " + sys.inspect(mapData));
					
					client.rpush(user + "/maps", mapData, function(e, result) {return false;});
		            // Handle request completion, as all chunks were already written
		            upload_complete(response, id);
		        });
		    };  
			/*response.writeHead(200, {'Content-Type': 'text/plain', 'id' : sessionID});
			response.end(root + " method is not implemented yet.");*/
			break;
		case "session":   
			var sessions = require('models/session');
			
			var token = args.token;
			var user = args.user;
			
			if (errors.isEmpty([token, user])) {
				errorHandler.err(409, "Error in creating session: Username or token missing from request.", response);
				return false;
			}
			
			client.hget("login", token, function(e, result) {
				if (e) {errorHandler.err(); return false;}
				
				var actualUser = result;    
				if (user != actualUser) {
					errorHandler.err(403, "You are not who you say you are. Session TERMINATED.", response);
					client.hdel("login", token, function(){return false;});
					return false;
				}
				
				var name = args.sessionName;
				var maxUsers = args.users;
				var key = args.sharedKey;
				if (errors.isEmpty([name, maxUsers, key])) {
					errorHandler.err(409, "Error in creating session. Expected name, max # of users and shared secret.\n", response);
				}
				                        
				var sessionID = Math.uuid();
				var sessionData = sessions.create(user, name, maxUsers, key);
				
				client.hset("sessions", sessionID, sessionData, function(e, result) {
					if (e) {errorHandler.err(); return false;}

					response.writeHead(200, {'Content-Type': 'text/plain', 'id' : sessionID});
					response.end("Created session successfully.");
				});
				
			});
			break;
		case "unit":
			response.writeHead(200, {'Content-Type': 'text/plain', 'id' : sessionID});
			response.end(root + " method is not implemented yet.");
			break;
		case "pc" :
			var player = require("models/player");
			var token = args.token;
			var user = args.user;
			
			client.hget("login", token, function(e, result) {
				if (e) {errorHandler.err(); return false;}
				
				var realUser = result;
				if (user != realUser) {
					sys.puts("user: " + user + "\nrealUser: " + realUser);
					errorHandler.err(403, "Auth failure.", response);
					client.hdel("login", token, function() {return false;});
					return false;
				}
				
				var name = args.playerName;
				var race = args.playerRace;
				var playerClass = args.playerClass;
				
				var playerInfo = player.create(user, name, race, playerClass);
				                       
				var pcID = Math.uuid();
				client.hset("players", pcID, playerInfo, function(e, result) {
				   	if (e) {errorHandler.err(); return false;}
				
					response.writeHead(200, {'Content-Type': 'text/plain', 'id' : pcID});
					response.end("Character created successfully.");
				});
			});
			
			break;
	}
}