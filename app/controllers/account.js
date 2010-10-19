var sys = require('sys');

//var client = require("../../lib/redis-client").createClient();
//switching to node_redis, since node-redis-client doesn't support newer node required for NPM goodness
var client = require("redis").createClient();
var errors = require('../../util/err');
var errorHandler = errors.newHandler();

var gh = require('grasshopper');

//possible responses emitted by this object
exports.responses = {
  'accountStorageError' : {code: 500, message: "An error occurred while processing your request."},
  
  'accountSuccess' : {code: 200, message: "Account created successfully."},
  'accountInputFailure' : {code: 409, message: "username and password are necessary for account creation."},
  'accountError' : {code: 500, message: "whoa something bad happened when trying to create your account. Sorry bro."},
  'accountExistsError' : {code: 409, message: "Username already exists. Please choose another name."},
  'accountNotExists' : {code: 409, message: "This user account does not exist. Maybe you should register?"},
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
			  //drop cookie, set session info
				return callback(exports.responses['accountSuccess']);
			});
		}
		
		else {
			callback(exports.responses['accountExistsError']);
		}
		
	});
}

exports.Login = function(username, password, callback) {
  if (errors.isEmpty([username, password])) {
    callback(exports.responses['accountInputFailure']);
    return;
  }
  
  client.hexists("accounts", username, function(e, result) {
    if (result == false) {
      return callback(exports.responses['accountNotExists']);
    }
    else {
      client.hget("accounts", username, function(e, realPassword) {
        //basic auth is basic
        if (realPassword != password) {
          return callback(exports.responses['passwordMismatchFailure']);
        }
        else {
          //drop cookie, set session info
          callback({name: "dude"});
        }
      });
    }
  });
}

gh.get("/account", function() {
  this.model['message'] = "";
  this.render('account');
});

gh.post("/account/{action}", function(args) {
  var action = args.action;
  if (!action || (action != "register" && action != "login")) {
    return this.renderText("Unknown action when POSTing to /account/: " + action + ". Probably shouldn't try that again.");
  }
  
  var username = this.params['user'];
  var password = this.params['pass'];
  var self = this;
  if (errors.isEmpty([username, password, self])) {
    //TODO: render the same view again, with a variable set to display this message
    return this.renderText("Did not submit enough info... try again?");
  }
  
  var regCallback = function(result) {
    sys.puts("in registration callback with: " + result);
    self.renderText(result.message);
  }
  
  var authCallback = function(result) {
    sys.puts("in login callback with : " + result);
    if (!result || !result.name) {
      sys.puts("failure in authentication");
      self.model['errorMessage'] = "Failed to log you in. The hivemind has been notified.";
      return self.render("account");
    }
    
    var now = new Date();
    self.model['now'] = now;
    self.model['message'] = "Logged in Successfully. Hello " + result.name + "."; 
    
    self.render("home");
  }
  
  if (action == "register"){
    var confirm = this.params['passConfirm'];
  
    sys.puts("creating a new account for : " + username);         
    return exports.createAccount(username, password, regCallback);
  }
  else {
    sys.puts("logging in user: " + username);
    return exports.Login(username, password, authCallback)
  }
});