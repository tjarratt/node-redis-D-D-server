var sys = require('sys'),
    expressApp = _app;

//var client = require("../../lib/redis-client").createClient();
//switching to node_redis, since node-redis-client doesn't support newer node required for NPM goodness
var client = require("redis").createClient(),
var errors = require('../../util/err');
var util = require('../../util/util');
var errorHandler = errors.newHandler();
var users = require("../models/user");
var ajaxProto = require("./ajax/ajaxAPI");

//init cookieJar and secret for signed cookies
var cookie = require("cookie");
cookie.secret = "thisIsAGoodSecret!"; //TODO: set this in a file from .gitignore when deploying

//possible responses emitted by this object
exports.responses = {
  'accountStorageError' : {code: 500, message: "An error occurred while processing your request."},
  'accountSuccess' : {code: 200, message: "Account created successfully."},
  'accountInputFailure' : {code: 409, message: "username and password are necessary for account creation."},
  'accountError' : {code: 500, message: "whoa something bad happened when trying to create your account. Sorry bro."},
  'accountExistsError' : {code: 409, message: "Username already exists. Please choose another name."},
  'accountNotExists' : {code: 409, message: "This user account does not exist. Maybe you should register?"},
}

this.prototype = ajaxProto.apiPrototype();
//set up getMethods
//set up postMethods

exports.createAccount = function(username, password, callback, res) {
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
			    sys.puts("writing uid, uname cookies");
  		    res.setCookie("uid", newUID,  {path: "/"});//TODO: change all of this to setSecureCookie and getSecureCookies
			  
			    return callback(exports.responses['accountSuccess']);
			  });
		  });
	  }
		
		else {
			callback(exports.responses['accountExistsError']);
		}
		
	});
}

exports.Login = function(username, password, callback, res) {
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
  			    var options = {path: "/"};
  			                 
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


expressApp.get("/account", function(request, response) { 
  //check for authenticated user, so we can allow them to set a new password or default image
  var sessionId = request.getCookie("uid"),
      msg = request.flash("message")[0];
  
  //sys.puts("checking for flashed messages", msg);
  
  var gotAuthenticatedSession = function(userInfo) {
    if (!userInfo) {
      //unauthenticated version of this page
      sys.puts("unauthenticated view of /account");
      return response.render('account', {locals: {message: msg}});
    }
    
    return response.render("account/accountDetails", {locals: {message: msg, name: userInfo.userName, image: userInfo.defaultImage }});
  }
  sys.puts("got pageview from sessionid: " + sessionId);
  users.getUserByCookieId(sessionId, gotAuthenticatedSession);
});

expressApp.post("/account/image", function(request, response) {
  var sessionId = request.getCookie("uid"),
      image = request.body.image;
  image = image? "/res/img/" + image + ".png" : false;
  
  if (!sessionId) {
    request.flash("message", "You should authenticate before trying that again.");
    return response.redirect("/account");
  }
  if (!image) {return response.send("Did you submit an image or nothing at all?");}
  
  var updatedImageCallback = function(result) {
    if (!result) {response.send("failed to update image. welp.");}
    return response.redirect("/account");
  }
  
  //assume for now that this is not a custom image
  users.setUsersDefaultImage(sessionId, image, updatedImageCallback);
});

expressApp.post("/account/image/custom", function(request, response) {
  var sessionId = request.getCookie("uid"),
      image = this.params["image"];
      
  sys.puts("got user with sessionId: " + sessionId + " trying to upload an image: " + image);
      
  if (!sessionId) {
    request.flash("message", "You should authenticate before trying that again.");
    return response.redirect("/account");
  }
  if (!image) {return response.send("gotta submit an image, with the request, dude.");}
  
  //get image req
  sys.puts("got this image from custom request:" + image);
  util.inspect(image);
});

expressApp.post("/account/:action", function(request, response) {
  var action = request.params.action;
  
  if (!action || (action != "register" && action != "login")) {
    return this.send("Unknown action when POSTing to /account/: " + action + ". Probably shouldn't try that again.");
  }
  
  var username = request.body.user;
  var password = request.body.pass;
  
  if (errors.isEmpty([username, password])) {
    //TODO: render the same view again, with a flash message to display this message
    return response.send("Did not submit enough info... Need username, password at a bare minimum, bro.");
  }
  
  var regCallback = function(result) {
    sys.puts("in registration callback with: " + result);
    util.inspect(result);
    response.send(result.message);
  }
  
  var authCallback = function(result) {   
    if (!result || !result.name) {
      sys.puts("failure in authentication");
      
      request.flash('message', "Failed to log you in. The hivemind has been notified.");
      return response.redirect("/account");
    }
    
    request.flash('message', "Logged in Successfully. Hello " + result.name + ".");
    
    response.redirect("/account");
  }
  
  if (action == "register"){
    var confirm = request.body.passConfirm;
  
    sys.puts("creating a new account for : " + username);         
    return exports.createAccount(username, password, regCallback, response);
  }
  else {
    sys.puts("logging in user: " + username);
    sys.puts(password);
    return exports.Login(username, password, authCallback, response);
  }
});
