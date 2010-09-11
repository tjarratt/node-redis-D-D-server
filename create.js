var sys = require('sys');
var client = require("redis-client").createClient();
var errorHandler = requie('err');

exports.handle = function(request, root) {
	switch (root) {
		case "acct" :
			//look for user and pass in the request
			var user = "";
			var pass = "";
			if (!user || !pass || user.length < 1 || pass.length < 1) {
				//code 409 conflict, must be length >= 1
			}
			client.exists(function(err, result) {
				if (err) 
				if (result == false) {
					
				}
			})
				
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