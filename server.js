try {
  var sys = require('sys');
      express = require("express"),
      app = express.createServer(
        express.compiler({src: __dirname, enable: ["sass"]}),
        express.staticProvider(__dirname)
      ),
      errorHandler = require("./util/err"),
      io = require("socket.io"),
      cookie = require("cookie"),
      util = require('./util/util'),
      json = JSON.stringify,
      redisClient = require("./lib/redis-client").createClient();
}
catch (e) {
  sys.puts("could not start server, suspect npm packages not installed", e);
  return;
}
                   
//configure this now so we have this later
__appRoot = __dirname

//clean up anything from before we last shut down
//TODO: mark all dnd sessions as inactive
//TODO: delete all cookie:* hashes that aren't active
//TODO: block all the following code on this execution, callllllbaaaaacks
//TODO: check that redis is active before we do this
sys.puts("cleaning up old users");
redisClient.keys("users:*", function(e, oldUsers) {
  var oldUsers = oldUsers? oldUsers.toString().split(",") : [];
  
  _.each(oldUsers, function(oldUser, index) {
    sys.puts("removing key[" + oldUser + "]");
    redisClient.del(oldUser, function(e, result) {});
  });
  sys.puts("deleting all old sockets");
  redisClient.del("sockets", function(e, result) {});
  
  //reset all active rooms too
  redisClient.keys("*/users", function(e, userLists) {
    sys.puts("deleting old lists of users in active sessions");
    var userLists = userLists? userLists.toString().split(",") : [];
    
    _.each(userLists, function(sessionListKey, index) {
      redisClient.del(sessionListKey, function(e, result) {});
    });
  });
});
//sys.puts("cleaing up old maps");
//redisClient.keys("*/maps", function(e, sessionMapKeys) { //get all of the maps associated with each session
/*  sessionMapKeys = sessionMapKeys? sessionMapKeys.toString().split(",") : [];
  
  //for each session, check that each of the maps at sessionId/maps exists 
  _.each(sessionMapKeys, function(sessionMapKey, index) {
    sys.puts("looking at maps for session " + sessionMapKey);
    
    redisClient.hgetall(sessionMapKey, function(e, sessionMaps) {
      util.inspect(sessionMaps)
      //check that each of these maps exists, if not then we need to remove it from this list
      _.each(sessionMaps, function(mapName, mapKey, list) {
        redisClient.hexists(mapKey, function(e, result) {
          if (! result) {
            sys.puts("deleting " + mapKey + " key from hash " + sessionMapKey);
            redisClient.hdel(sessionMapKey, mapKey, function() {});
          }
        });
      });
    });
  });
});*/

app.set("views", __dirname + "/app/views");
app.set("view engine", "jade");
app.use(express.bodyDecoder());
app.use(express.cookieDecoder());
app.use(express.session());
_app = app; //need a global ref for controllers. Urhg;

["account", 
  "map", 
  "session", 
  "talk", 
  "join",
  "character",
  "map",
  "test",
  "update",
  "ajax/ajaxAPI"
].forEach(function(controller) {
  require("./app/controllers/" + controller);
});

app.get("/", function(req, res) {
  var now = new Date();
  sys.puts("got a visitor at " + now);
  
  res.render('home');
});
     
app.listen(8000);
sys.puts("Server running on port 8000");

//initialize socket.io : I choose you!
var buffer = [], json = JSON.stringify;
var StartSocket = function() {
  sys.puts("starting up socket.io");
  //exported http.server from grasshopper
  var socket = io.listen(app);
  
  //on connection, send out a small buffer, then configure on message handlers
  /*
    This is fairly complicated, what we initially expect from a user is their clientID, which we will use internally to identify them
    overriding the websocket sessionId would require hacking apart the client + server libraries, when I'm not up to yet
  */
  socket.on('connection', function(client){
    util.inspect(client);
  	client.send(json({ buffer: buffer }));
  	client.on('message', function(message){
  	  sys.puts("got message: " + message + " from: " + client.sessionId);
  	  var webSocketId = client.sessionId;
  	  
  	  //may as well keep a hash of websocket ids in the SOCKETS space simply for the convenience of looking it up based on their websockets clientId
    	redisClient.hget("sockets", webSocketId, function(e, clientId) {    	  
    	  sys.puts("WEBSOCKET START");
    	  sys.puts("got :" + clientId + " for socketId: " + webSocketId);
    	  
    	  if (e || (!clientId || clientId == null)) {//error, or we don't recognize this user
    	    sys.puts("error on redis, or we don't recognize this user.");
    	    //inspect message for an id, tell the client to disconnect otherwise
    	    //we need the ID here to identify them on future requests
    	    if (message.indexOf("ID:") < 0) {
    	      sys.puts("could not identify user with message:" + message);
    	      //TODO: implement a disconnect method
    	      //client.send(json('disconnect'));
    	      return false;
    	    }
    	    //otherwise, grab the id, stash it away in redis for now, until they try to chat again
    	    var id = message.substring(message.indexOf(":") + 1, message.length);
    	    sys.puts("setting userID: " + id + " for websocketId:" + webSocketId)
    	    
    	    if (!(id || id.length > 10)) {
    	      //client.send(json('disconnect'));
    	      return false;
    	    }
    	    
    	    //TODO: check if this user had already joined, in which case we need to update, and then do nothing
    	    //for now we can get all sockets and look for a matching id
    	    //but really we should be storing this in the user hash ("user:id", "socketId")
    	    redisClient.hgetall("sockets", function(e, sockets) {
    	      sys.puts("checking to see if this is a returning user: " + id);
    	      var isReturning = false;
    	      sockets = sockets? sockets : [];
    	      _.each(sockets, function(userId, socketId, list) {
    	        sys.puts("comparing " + userId + " to " + id);
    	        if (userId == id) {
    	          sys.puts("bingo, removing old session, updating lists");
    	          isReturning = true;
    	          return false;
    	          redisClient.hdel("sockets", socketId, function(e, result) {});//TODO: do we need to handle this error?
    	        }
    	      });
    	      
    	      redisClient.hset("sockets", webSocketId, id, function(e, result) {
      	      sys.puts("set id, getting info for key:" + id);
      	      if (e || !result) {
      	        sys.puts("failed to set websocket sessionId - clientId");
      	        //client.send(json('disconnect'));
      	        return false;
      	      }
      	      
      	      //get whitelist and announce that a user joined
      	      redisClient.hmget("users:" + id, "name", "room", "defaultImage", function(e, info) {
      	        var name = info[0].toString('utf8');
      	        var roomId = info[1].toString('utf8');
      	        var defaultImage = info[2].toString('utf8');

                sys.puts("got info for this client:");
      	        sys.puts("name: " + name + ", room: " + roomId);
      	        
      	        if (isReturning) {
        	        redisClient.rpush(roomId + "/users", webSocketId, function(e, result) {
        	          if (e || !result) {
        	            //need to handle this error in a clean way
        	            //client.send(json("error"));
        	            return false;
        	          }
        	        });
        	        return true;
        	      }

      	        redisClient.lrange(roomId + "/users", 0, 10, function(e, whiteList) {
      	          //now that we've identified the user, their name + room, we can announce they joined
      	          whiteList = whiteList? whiteList.toString().split(",") : [];
      	          whiteList = _.without(whiteList, webSocketId);

      	          sys.puts("announcing user: " + name + " joined to " + whiteList);    	          
            	    client.broadcastOnly(json({ announcement: name + ' connected' , username: name, imageName: defaultImage}), whiteList);

            	    //push ourselves onto this list
            	    redisClient.rpush(roomId + "/users", webSocketId, function(e, result) {
            	      if (e || !result) {
            	        //client.send(json('disconnection'));
            	      }
            	    });
      	        });
      	      });
      	    });
    	    });
  	    }
  	    else {
    	    //we have an id for this user, now we need their info         	    
    	    sys.puts("this clientId: " + clientId + " should be good.");
    	    redisClient.hmget("users:" + clientId, "name", "room", function(e, userInfo) {
    	      if (e || !userInfo || userInfo.length < 2) {
    	        sys.puts("error while getting userinfo for sessionId: " + clientId);
    	        //
    	        client.send(json('disconnect'));
    	        return false;
    	      }
  	      
    	      sys.puts("got userInfo for client with sessionId: " + clientId + " userinfo: " + userInfo);
  	      
    	      var name = userInfo[0].toString('utf8');
    	      var roomId = userInfo[1].toString('utf8');
    	      var websocketId = websocketId? websocketId : client.sessionId;
    	      
    	      var sendToSelf = false;
    	      var bufferMsgToReplace = false;
    	      var bufferType = false;
  	      
    	      //create message, whether it's a movement or message type
    	      var msg;
        	  var indexOfMove = message.indexOf("_move_");
        	  if (indexOfMove >= 0) {
        	    sys.puts("creating a move message");
        	    msg = {move : [name, message.substring(message.lastIndexOf("_"), message.length)]}
        	    //TODO: find a way to replace the last move message for this user
        	  }
        	  else if (message.indexOf("_update") >= 0) {
        	    var itemToUpdate = message.substring(message.lastIndexOf(":") + 1, message.lenth);
        	    sys.puts("received update for:" + itemToUpdate);
        	    msg = {};
        	    msg[itemToUpdate] = [name, true];
        	    bufferMsgToReplace = itemToUpdate;
        	    bufferType = "update";
        	  }
        	  else if (message[0] == "/") {
        	    var emote = handleEmote(message);
        	    sys.puts(name + " has emote: " + emote);
        	    msg = {message: [name, emote] };
        	    sendToSelf = true;
        	  }
        		else {
        		  msg = {message: [name, message] }; 
      		  }
    		    
    		    if (bufferMsgToReplace) {
    		      var didReplace = false;
    		      _.each(buffer, function(bufferMsg, index) { 
    		        if (typeof bufferMsg[bufferType] != "undefined" && bufferMsg[bufferType][1] == bufferMsgToReplace) {
    		          didReplace = true;
    		          buffer[index] = msg;
    		          return false;//exit .each loop
    		        }
    		      });
    		      if (!didReplace) {
    		        sys.puts("error while replacing a message of type: " + bufferType);
    		        buffer.push(msg);
    		        if (buffer.length > 15) buffer.shift();
    		      } 
    		    }
    		    else {
      		    //this buffer currently stores a list of the last 15 messages (mainly for clients that connect midway through a session)
          		//may want to investigate using it to actually buffer client messages
          		//we would need to either call process.onNextTick or setTimeOut to use this effectively
          		//storing it in redis may not be a bad idea either, since actions there can be guaranteed atomic
          		buffer.push(msg);
          		if (buffer.length > 15) buffer.shift();
        		}

        		//ARGH, socket.io only supports blacklists by default
        		/*
              Updated my socket.io fork on accept a whitelist on the broadcastOnly method,
              since we have looked up their roomId, we can easily get a list of users in the room
        		*/

        		//time has passed since the client joined lowly roomId in a rousing game of XYZ, 
        		//now we need to look up the current whitelist and send this message back
        		redisClient.lrange(roomId + "/users", 0, 10, function(e, updatedWhiteList) {
        		  if (e) {return false;} 

        		  //TODO: remove self from updatedWhiteList, unless we need to display an emote
        		  //TODO: perhaps we should always be sending messages back to the user that originated it? However simpler, isn't that wasteful?
        		  updatedWhiteList = updatedWhiteList? updatedWhiteList.toString().split(",") : [];
        		  if (!sendToSelf) { updatedWhiteList = _.without(updatedWhiteList, websocketId); }
        		  
        		  sys.puts("got whitelist for this user. Going to send a message to: " + updatedWhiteList);
        		  client.broadcastOnly(json(msg), updatedWhiteList);
        		});
    	    });            
  	    }
	    });
		});

  	client.on('disconnect', function(){
  	  sys.puts(client.sessionId + " has disconnected.");
  	  redisClient.hget("sockets", client.sessionId, function(e, userId) {
  	    redisClient.hmget("users:" + userId, "name", "room", function(e, userInfo) {
  	      if (!userInfo || userInfo.length < 2) {
  	        sys.puts("got insufficient userinfo when disconnecting.");
  	        return false;
  	      }
  	      
  	      var name = util.hashResultMaybe(userInfo, 0);//userInfo[0].toString('utf8');
  	      var roomId = util.hashResultMaybe(userInfo, 1);
  	      var websocketId = websocketId ? websocketId : client.sessionId;
  	      
  	      sys.puts(name + " has disconnected from room: " + roomId);
  	      
  	      redisClient.lrange(roomId + "/users", 0, 10, function(e, whiteList) {
  	        whiteList = whiteList? whiteList.toString().split(",") : [];
  	        whiteList = _.without(whiteList, websocketId);
  	        
  	        client.broadcastOnly(json({ announcement: + ' someone has dddddisconnected' }), whiteList);
  	          //remove this user from any lists of users
        		  redisClient.hdel("socket:" + client.sessionId, "room", function(e, result){});
        		  //remove from list (roomId + "/users")
        		  
      	  });
	      });
	    });
    });
  });
}

var handleEmote = function(message) {
  sys.puts("handling emote for message:" + message);
  
  var parts = message.split(" ");
  var len = parts.length;
  
  if (parts[0] == "/roll") {
    var first = len > 1 ? parts[1] : 20;
    var second = len > 2 ? parts[2] : 1;
    
    sys.puts("rolling between " + second + " and " + first);
    
    var result = Math.floor(Math.random() * first) + 1;
    sys.puts("rolls a " + result);
    
    //TODO: for now assume that second will always be 1
    return "rolled a " + result.toString() + " (from " + second.toString() + " to " + first.toString() + ")";
  }
  return "waves their hands around in the air, emoting wildly.";
}

var tryStart = function() {
  if (!app || app == null) {
    sys.log("http server not started yet, waiting for nextTick to start socket server.");
    
    //would probably be more effective to just listen for an event that GH could emit when it's done starting up
    return setTimeout(tryStart, 3000); //Fix to avoid pegging the cpu when this is failing repeatedly
                                       //this originally just called tryStart on nextTick, which really hurts an awful lot
  }
  StartSocket();
}

tryStart();
