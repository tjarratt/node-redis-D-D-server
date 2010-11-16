var sys = require("sys");
var util = require("../../util/util");

var client = require('../../lib/redis-client').createClient();
require("../../lib/uuid");

exports.create = function(owner, name, race, _class, image, callback) {
  //image is optional, use the default image if we need to
  image = image? image : "Tokens.png";
  
	var newPC = {
		'owner' : owner,
		'name' : name,
		'race' : race,
		'class' : _class,
		'image' : image
	}
	
	//TODO: validate this info
	var id = Math.uuid();
	newPC["id"] = id;
	
	client.hmset("pc:" + id, "owner", owner, "name", name, "race", race, "_class", _class, "image", image, function(e, result) {
	  if (e || !result) {
	    return callback(false);
    }
    client.rpush(owner + "/pcs", id, function(e, result) {return;});
    callback(newPC);
	});
}

exports.findUsersCharacters = function(userId, callback) {  
  //TODO: find out what the performance hit is to actually look up the length before calling lrange
  sys.puts("finding users for " + userId);
  client.lrange(userId + "/pcs", 0, 100, function(e, pcIDlist) {
    //do some validation for an empty list otherwise _.each blows up
    pcIDlist = pcIDlist? pcIDlist: [];
    sys.puts("got these ids:" + pcIDlist);
    
    var players = [];
    var numToPush = pcIDlist.length;
    
    _.each(pcIDlist, function(pcId, index, list) {
      sys.puts("getting info for pc w/ Id:" + pcId);
      client.hmget("pc:" + pcId, "name", "img", function(e, playerInfo) {
        var name = util.hashResultMaybe(playerInfo, 0);
        var image = util.hashResultMaybe(playerInfo, 1);
        
        players.push({
          'name' : name,
          'img' : image
        }); 
        numToPush--;
        if (numToPush <= 0) {
          callback(players);
        }
      });
    });
  });
}

exports.getPCInfo = function(pcID) {
  client.hgetall("pc:" + pcID, function(e, playerInfo) {
    var name = util.hashResultMaybe(playerInfo, "name");
    var race = util.hashResultMaybe(playerInfo, "race");
    var owner = util.hashResultMaybe(playerInfo, "owner");
    var _class = util.hashResultMaybe(playerInfo, "_class");
    var img = util.hashResultMaybe(playerInfo, "image");
    
    return {'name': name, 
            "race": race,
            "owner": owner,
            "_class": _class,
            "image": img};
    
  });
}

/*var hashResultMaybe = function(hash, value) {
  if (!hash || !value) {return false;}
  
  var maybeValue = hash[value];
  maybeValue = maybeValue? maybeValue.toString('utf8') : false;
  
  return maybeValue;
}*/

/*
  a player is associated with a user
  
  players are just some sugar on top of an image
   
  properties
  
  owner(id)
  name(string)
  race(string)
  class(string)
  image(string)
 
  ...and possibly some other useful ones (last position, hit points?)
  
  and needs the following methods
  create
  delete
  updatePosition(?)
  updateHitpoints(?)

*/