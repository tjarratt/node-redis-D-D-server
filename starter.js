var client = require('lib/redis-client').createClient();
var sys = require('sys');
var errorHandler = require('err');

exports.initSession = function(id, response) {
	client.hget("sessions", id, function(e, result) {
		if (e) {errorHandler.err(); return false;}
		                                  
		var sessionData = {'players': []};
		client.hset("activeSessions", id, sessionData, function(e, result) {
			if (e) {errorHandler.err(); return false;}
			     
			//works, but lacks callbacks
			/*client.subscribe("active:" + id, function(e, result) {
				sys.puts("got result from subscribing: " + result);
			});*/
			
			var receivedMessageCallback = function(result, args) {
				sys.puts("got result: " + result + " and args? " + args);
			}
			
			client.subscribeTo("acitve:" + id, receivedMessageCallback);
			
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end("Intialized session successfully.");
		});
	});
}