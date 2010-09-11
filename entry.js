var http = require('http');  
var url = require('url');
var errorHandler = require("err");

var handler = function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Hello World\n');
	                  
	var action = req.method;
	var reqUrl = url.parse(req.url);
	var paths = reqUrl.pathname;

	//now we should break down the url into its components
	paths = paths.split('/');
	var base = paths[0];
	var nextURI = paths.length > 1 ? paths[1] : null;
	
	switch (base) {
		case "create" :
			if (action != "POST" && action != "PUT") errorHandler.err(409, "Creating something cannot use " + action + " method.");
		
		    if (!nextURI || nextURI == null) {
				errorHandler.err(403, "Shouldn't you specify what you want to create? Try /create/_TYPE_");
				return;
			}
			
			var creator = require('create');
			creator.handle(req, nextURI);
			break;
		case "start" :
			var starter = require('start');
			break;
		case "join" :
			var joiner = require('join');
			break;
		default :
			errorHandler.err(501, 'This is not a valid endpoint.');
			break;
	}
	
}

var server = http.createServer();
server.addListener("request", handler);
server.listen(8000);
console.log("Server running on port 8000");