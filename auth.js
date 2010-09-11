var sys = require('sys');
var url = require('url');
var queryStr = require('querystring');
var client = require("redis-client").createClient();
var errorHandler = require('err');    


exports.login = function(request, response) {
	var parsed = url.parse(request.url, true);
	var query = parsed.query;
	
	var user = query? query.user : null;
	var pass = query? query.pass : null;
	
	if (!user || !pass || user.length < 1 || pass.length < 1) {
		sys.puts("query: " + sys.inspect(query));
		sys.puts(user + ":" + pass);
		
		errorHandler.err(409, "Request lacking username and/or password. Try POSTing http://server.com/auth?user=DUDE&pass=WHOA", response);
		return;
	}
	
	client.hexists("accounts", user, function(error, result) {
		if (error) {errorHandler.err(500, "Internal Server Error while authenticating. Bad database response.", response); return false;}
		
		if (result == true) {
			client.hget("accounts", user, function(error, value) {
				if (error) {errorHandler.err(500, "Internal Server Error while authenticating. Bad database response.", response); return false;}
				
				if (value != pass) {
					//probably opening myself up to a timing attack right now
					errorHandler.err(403, "Username and password do not match.");
					return false;
				}
				var uuid = Math.uuid();
				
				//I would RATHER use memcached for this, so we can expire the keys, but this works for now
				client.hset("login", uuid, user, function (e, result) {
					if (e) {errorHandler.err(500, "Internal Error while authenticating."); return false;}
					
					response.writeHead(200, {'Content-Type': 'text/plain'});
					response.end(uuid);
				});
			});
		}
	});
}