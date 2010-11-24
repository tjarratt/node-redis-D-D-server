var sys = require("sys");
var util = require("../../util/util");

var client = require('../../lib/redis-client').createClient();
require("../../lib/uuid");

exports.create = function(owner, name, race, _class, callback) {
  
	var newPC = {
		'owner' : owner,
		'name' : name,
		'race' : race,
		'class' : _class,
		'image' : "Tokens.png"
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
	if (numToPush == 0) {
		return callback([]);
	}
    
    _.each(pcIDlist, function(pcId, index, list) {
      sys.puts("getting info for pc w/ Id:" + pcId);
      client.hmget("pc:" + pcId, "name", "img", function(e, playerInfo) {
        var name = util.hashResultMaybe(playerInfo, 0);
        var image = util.hashResultMaybe(playerInfo, 1);
        image = image ? image : "/res/img/Tokens.png";
        
        sys.puts(pcId + ": is " + name + " with image " + image);
        
        players.push({
          'name' : name,
          'img' : image,
          "href" : "/pc/" + pcId 
        }); 
        numToPush--;
        if (numToPush <= 0) {
          callback(players);
        }
      });
    });
  });
}

exports.getPCInfo = function(pcID, callback) {
  client.hgetall("pc:" + pcID, function(e, playerInfo) {
    var name = util.hashResultMaybe(playerInfo, "name");
    var race = util.hashResultMaybe(playerInfo, "race");
    var owner = util.hashResultMaybe(playerInfo, "owner");
    var _class = util.hashResultMaybe(playerInfo, "_class");
    var img = util.hashResultMaybe(playerInfo, "image");
    sys.puts("got image : " + img + " for pcId" + pcID);
    
    return callback({'name': name, 
            "race": race,
            "owner": owner,
            "_class": _class,
            "image": img,
            "href" : "/pc/" + pcID});
    
  });
}

exports.setPCInfo = function(pcId, info, callback) {
  client.hmset("pc:" + pcId, "name" , info.name, "_class", info._class, "race", info.race, "image", info.image, function(e, result) {
    callback(result);
  });
}

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