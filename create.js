var sys = require('sys');
var url = require('url');
var queryStr = require('querystring');
var client = require("redis-client").createClient();
var errorHandler = require('err');

exports.handle = function(request, root, response) {
	switch (root) {
		case "acct" :
			var parsed = url.parse(request.url, true);
			var query = parsed.query;
			                                   
			//sys.puts("request: " + sys.inspect(request));
			//look for user and pass in the request
			var user = query? query.name : null;
			var pass = query? query.pass : null;
			if (!user || !pass || user.length < 1 || pass.length < 1) {
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
			break;
		case "unit":
			break;
		case "pc" :
			break;
	}
}