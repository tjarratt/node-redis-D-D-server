var sys = require('sys');

//var client = require("../../lib/redis-client").createClient();
//switching to node_redis, since node-redis-client doesn't support newer node required for NPM goodness
var client = require("redis").createClient();
var errors = require('../../util/err');
var util = require('../../util/util');
var errorHandler = errors.newHandler();
var users = require("../models/user");

var gh = require('grasshopper');

//init cookieJar and secret for signed cookies
var cookie = require("cookie");
cookie.secret = "thisIsAGoodSecret!";

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
		sys.puts("got result: " + result + " for hexists account " + username);
		if (!result) {
			client.hset("accounts", username, password, function(err, result) {
			  //drop cookie, set session info
			  var newUID = Math.uuid();
			  
			  client.hset("cookie:" + newUID, "username", username, function(e, result) {
			    var res = gh.response;
			    
			    sys.puts("writing uid, uname cookies");
          		    res.setCookie("uid", newUID);
  			    //res.setCookie("uname", username);
			  
  			    return callback(exports.responses['accountSuccess']);
			  });
		  });
	  }
		
		else {
			callback(exports.responses['accountExistsError']);
		}
		
	});
}

exports.Login = function(username, password, callback) {
  sys.puts("in login for: " + username);
  
  if (errors.isEmpty([username, password])) {
    callback(exports.responses['accountInputFailure']);
    return;
  }
  
  client.hexists("accounts", username, function(e, result) {
    sys.puts("result: " + result)
    util.inspect(result);
    
    if (result == false) {
      sys.puts("no account with name: " + username);
      return callback(exports.responses['accountNotExists']);
    }
    else {
      client.hget("accounts", username, function(e, realPassword) {
        sys.puts("got password for " + username);
        //basic auth is basic
        if (realPassword != password) {
          sys.puts("bad password.");
          return callback(exports.responses['passwordMismatchFailure']);
        }
        else {
          //drop cookie, set session info
          sys.puts("auth successful");
          var newUID = Math.uuid();

  			  client.hset("cookie:" + newUID, "username", username, function(e, result) {
  			    var res = gh.response;
  			    var options = {path: "/"}
  			                 
  			    sys.puts("setting id:" + newUID + " for user:" + username);
    			  //res.setCookie("uname", username, options);
    			  res.setCookie("uid", newUID, options);
            callback({name: username});
          });
        }
      });
    }
  });
}

gh.get("/account", function() {
  var self = this;
  
  //check for authenticated user, so we can allow them to set a new password or default image
  var sessionId = gh.request.getCookie("uid");
  var gotAuthenticatedSession = function(userInfo) {
    if (!userInfo) {
      //unauthenticated version of this page
      sys.puts("unauthenticated view of /account");
      self.model['message'] = "";
      return self.render('account');
    }
    
    self.model["name"] = userInfo.userName;
    self.model["image"] = userInfo.defaultImage;
    return self.render("account/accountDetails");
  }
  sys.puts("got pageview from sessionid: " + sessionId);
  users.getUserByCookieId(sessionId, gotAuthenticatedSession);
});

gh.post("/account/image", function(args) {
  var self = this,
      sessionId = gh.request.getCookie("uid"),
      image = util.hashResultMaybe(this.params, "image"),
  image = image? "/res/img/" + image + ".png" : false;
  
  if (!sessionId) {return this.renderText("Have you ever been authenticated?");}
  if (!image) {return this.renderText("Did you submit an image or nothing at all?");}
  
  var updatedImageCallback = function(result) {
    if (!result) {self.renderText("failed to update image. welp.");}
    return self.redirect("/account");
  }
  
  //assume for now that this is not a custom image
  users.setUsersDefaultImage(sessionId, image, updatedImageCallback);
});

gh.get("/account/image/custom", function() {
  sys.puts("bad get request to custom image upload path");
  this.renderText("false");
});

gh.post("/account/image/custom", function(args) {
  var self = this,
      sessionId = gh.request.getCookie("uid"),
      image = this.params["image"];
      
  sys.puts("got user with sessionId: " + sessionId + " trying to upload an image: " + image);
      
  if (!sessionId) {return this.renderText("Have you ever been authenticated?");}
  if (!image) {return self.renderText("gotta submit an image, with the request, dude.");}
  
  //get image req
  sys.puts("got this image from custom request:" + image);
  util.inspect(image);
});

gh.post("/account/{action}", function(args) {
  var action = args.action;
  sys.puts(action);
  
  if (!action || (action != "register" && action != "login")) {
    return this.renderText("Unknown action when POSTing to /account/: " + action + ". Probably shouldn't try that again.");
  }
  
  var username = this.params['user'];
  var password = this.params['pass'];
  
  //what the fuck, why are these getting formatted with a comma at the end?
  
  var self = this;
  if (errors.isEmpty([username, password, self])) {
    //TODO: render the same view again, with a variable set to display this message
    return this.renderText("Did not submit enough info... try again?");
  }
  
  var regCallback = function(result) {
    sys.puts("in registration callback with: " + result);
    util.inspect(result);
    self.renderText(result.message);
  }
  
  var authCallback = function(result) {   
    if (!result || !result.name) {
      sys.puts("failure in authentication");
      self.flash['message'] = "Failed to log you in. The hivemind has been notified.";
      return self.redirect("/account");
    }
    
    var now = new Date();
    self.flash['now'] = now;
    self.flash['message'] = "Logged in Successfully. Hello " + result.name + "."; 
    
    self.redirect("/account");
  }
  
  if (action == "register"){
    var confirm = this.params['passConfirm'];
  
    sys.puts("creating a new account for : " + username);         
    return exports.createAccount(username, password, regCallback);
  }
  else {
    sys.puts("logging in user: " + username);
    sys.puts(password);
    return exports.Login(username, password, authCallback)
  }
});
