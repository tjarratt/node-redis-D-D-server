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

exports.handle = function(responder, type, args) {
  if (!_.include(exports.methods, type || !typeof(exports[type]) != "function")) {
    return exports.responses['methodNotDefinedError'];
  }
  
  exports.responder = responder;
  
  sys.puts("in handle");
  sys.puts("type: " + type);
  	
	switch (type) {
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