var client = require('lib/redis-client').createClient();
var sys = require('sys');
var url = require('url');
var errorHandler = require('err');

exports.joinSession = function(id, response, name) {
	if (errorHandler.isEmpty([id, name])) {
		errorHandler.err();
	}
	
	client.hget("activeSessions", id, function(e, users) {
		if (e) {errorHandler.err(); return false;}
		                                              
		//should never happen, since active session are supposed to die when no one is left
		if (typeof(users) != "array") {users = [name]}
		else {
			users.push(name);
		}
		
		var receivedMessageCallback = function(key, message) {
			response.write(message + "\n");
			//response.end();
		}
		
		client.subscribeTo("active" + id, receivedMessageCallback);
		
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.write("Intialized session successfully.\n");
	});
}
                                      
//usage: for clients that don't want to leave a connection open, register an endpoint like
//http://server.com:8000/messages/__UUID__
exports.joinSessionAndRegisterEndPoint = function(id, response, name) {
	if (errorHandler.isEmpty([id, name])) {errorHandler.err();}
	
	client.hget("activeSessions", id, function(e, users) {
		if (e) {errorHandler.err(); return false;}
		                                              
		//should never happen, since active session are supposed to die when no one is left
		if (typeof(users) != "array") {users = [name]}
		else{
			users.push(name);
		}
		
		var key = "msgs:" + name + "/" + id;
		var receivedMessageCallback = function(key, message) {
			//push message onto queue so users can pick it up later
			client.rpush(key, message, function() {return;});
		}
		
		client.subscribeTo("active" + id, receivedMessageCallback);
		
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end("Intialized session successfully.");
		
		//initialize a queue object that we can put messages in
		client.rpush(key, "Initialized", function(){return;});
	});
}