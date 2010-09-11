var sys = require('sys');
var url = require('url');
var client = require("redis-client").createClient();
var errorHandler = requie('err');

exports.handle = function(request, root) {
	switch (root) {
		case "acct" :
			var query = url.parse(request.url, true).query;
			
			//look for user and pass in the request
			var user = query.name;
			var pass = query.pass;
			if (!user || !pass || user.length < 1 || pass.length < 1) {
				var message = "Error: username and or password expected for account creation.\n" +
								"Your request should be in this form:\n" +
								"POST http://server.com:8000/create/acct/name=FOO&pass=BAR";
				errorHandler.err(409, message);
			}
			client.hexists("accounts", user, function(err, result) {
				if (err) errorHandler.err(409, "Username already exists. Please choose another name.");
				if (result == false) {
					client.hset("accounts", user, pass, function(err, result) {
						if (err) errorHandler.respondDefault();
						
						res.writeHead(200, {'Content-Type': 'text/plain'});
						res.end("Account created successfully." + '\n');
					});
				}
			});
			
			if (userExists) {
				//code 409 conflict
			}
			
			
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