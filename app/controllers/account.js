var sys = require('sys');

//var client = require("../../lib/redis-client").createClient();
//switching to node_redis, since node-redis-client doesn't support newer node required for NPM goodness
var client = require("redis").createClient();
var errors = require('../../util/err');
var errorHandler = errors.newHandler();

var gh = require('grasshopper');

//possible responses emitted by this object
exports.responses = {
  'accountStorageError' : [500, "An error occurred while processing your request."],
  
  'accountSuccess' : [200, "Account created successfully."],
  'accountInputFailure' : [409, "username and password are necessary for account creation.\n"],
  'accountError' : [500, "whoa something ba happened when trying to creat your account. Sorry bro."],
  'accountExistsError' : [409, "Username already exists. Please choose another name."],
}

exports.createAccount = function(username, password, callback) {
  if (errors.isEmpty([username, password])) {
    callback(exports.responses['accountInputFailure']);
    return;
  }
  
  client.on("error", function (err) {
      sys.puts("Redis connection error to " + client.host + ":" + client.port + " - " + err);
      callback(exports.responses[accountStorageError]);
      return;
  });
  
  client.hexists("accounts", username, function(result) {			
		if (result == false) {
			client.hset("accounts", username, password, function(err, result) {
				callback(exports.responses['accountSuccess']);
			});
		}
		
		else {
			callback(exports.responses['accountExistsError']);
		}
		
	});
}

gh.get("/account", function() {  
  this.model['name'] = "test";
  this.render('account');
});

gh.post("/account", function(args) {
  var username = this.params['user'];
  var password = this.params['pass'];
  
  var self = this;
  
  var resultCallback = function(result) {
    sys.puts("in result callback with: " + result);
    self.renderText(result[1]);
  }
  
  sys.puts("calling createAccount");
         
  exports.createAccount(username, password, resultCallback);
});