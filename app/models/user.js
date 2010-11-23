var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");
var errors = require('../../util/err');

var client = require('../../lib/redis-client').createClient();

var errors = require('../../util/err');
require("../../lib/underscore-min");
/*
  users are users
  
  properties
  -------------
  (id)
  username
  password
  list of player characters
  list of owned sessions
  a socketId for communication
  
  
  methods
  _______________
  create
  delete
  updateWebsocket
  associateSession
  associatePC

*/

exports.setUsersDefaultImage = function(sessionId, image, callback) {
  client.exists("cookie:" + sessionId, function(e, result) {
    if (!result) {
      sys.puts("user that doesn't have a session tried to set an image.");
      return callback(false);
    }
    
    client.hset("cookie:" + sessionId, "defaultImage", image, function(e, result) {
      if (e || !result) {sys.puts("failure when trying to set a user's image.");}
      callback(true);
    });
  });
}

exports.getUserByCookieId = function(sessionId, callback) {
  sys.puts("getting user info for sessionId: " + sessionId);
  
  client.hmget("cookie:" + sessionId, "username", "defaultImage", function(e, result) {
    if (e || !result || !result.length || result.length < 1 || result[0] == null) {
      return callback(false);
    }
    var thisUser = util.hashResultMaybe(result, 0);
    var imageName = util.hashResultMaybe(result, 1);
    imageName = imageName ? imageName : "res/img/Tokens.png";
  
    if (errors.isEmpty([thisUser, imageName])) { return callback(false); }
    
    callback({"userName": thisUser, "defaultImage": imageName});
  });
}

exports.doesUserOwnCharacter = function(userId, characterId, callback) {
  return true;
}