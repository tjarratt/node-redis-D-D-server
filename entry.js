var sys = require('sys');
var http = require('http');  
var url = require('url');
var errorHandler = require("err");

var handler = function(req, res) {
	//sys.puts(sys.inspect(req));
	                  
	var action = req.method;
	var reqUrl = url.parse(req.url);
	var paths = reqUrl.pathname;

	//now we should break down the url into its components
	paths = paths.split('/');
	paths.splice(0,1);
	var base = paths.length > 0? paths[0] : null;
	var nextURI = paths.length > 1 ? paths[1] : null;
	
	if (action == "GET" && (!base || base == "/")) {
		//sys.puts("action: " + action + "\nbase: " + base + "\npaths: " + paths);
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end("Hello World");
	}
	
	switch (base) {
		case "create" :
			if (action != "POST" && action != "PUT") errorHandler.err(409, "Creating something cannot use " + action + " method.", res);
		
		    if (!nextURI || nextURI == null) {
				errorHandler.err(403, "Shouldn't you specify what you want to create? Try /create/_TYPE_", res);
				return;
			}
			
			//sys.puts("going to create with URI: " + nextURI);
			var creator = require('create');
			creator.handle(req, nextURI, res);
			break;
		case "start" :
			var starter = require('start');
			break;
		case "join" :
			var joiner = require('join');
			break;
		default :
			errorHandler.err(501, 'This is not a valid endpoint.', res);
			break;
	}
	
}

var server = http.createServer();
server.addListener("request", handler);
server.listen(8000);
sys.puts("Server running on port 8000");