var sys = require('sys');

var errorHandler = require("./util/err"); 
var gh = require('grasshopper');
var io = require('socket.io');

var util = require('./util/util');
var json = JSON.stringify;

var redisClient = require("./lib/redis-client").createClient();

gh.configure({
    viewsDir: './app/views',
    layout: './app/views/layout',
    
    //TODO: decide whether we need localization
    //one potential use for this might be 
    //locales: require('./locales')
});

["account", 
  "find", 
  "map", 
  "session", 
  "talk", 
  "join",
  "map"
].forEach(function(controller) {
    require("./app/controllers/" + controller);
});

gh.get("/", function() {
  this.disableCache();
  var now = new Date();

  this.model['now'] = now;
  this.render('home');
});
     
gh.serve(8080);
sys.puts("Server running on port 8080");

//initialize socket.io : I choose you!
var buffer = [], json = JSON.stringify;

var StartSocket = function() {
  sys.puts("starting up socket.io");
  //exported http.server from grasshopper
  var socket = io.listen(gh.server);
  
  socket.on('connection', function(client){
  	client.send(json({ buffer: buffer }));
  	
  	//may as well keep a hash of users in the SOCKETS space, we may want to store their current position, name in here as well
  	//simply for the convenience of looking it up based on their websockets clientId
  	//Might it be easier to simply override the clientsession id with something we know?
  	//We could tell the client when creating the socket what id to use...
  	//That technique would be a little less secure though...
  	
  	//another concern with storing the user ids this way is that we are duplicating a lot of information - namely the room id, but potentially more
  	//possibly the number of occupants, or any number of other fields that we may want to access 
  	redisClient.hget("sockets", client.sessionId, "room", function(e, roomId) {
  	  //need a way to disconnect the client from here
  	  if (e) { return false;}
  	  
  	  //don't particularly want to do this the "RIGHT" way - ie: call redisClient.llen and then call lrange from within its success callback
  	  //perhaps we should restrict rooms to a reasonable number of users ... 10?
  	  redisClient.lrange(roomId + "/users", 0, 10, function(e, whiteList) {
  	    //now that we've identified the user and figured out who they can talk to, we can define some message functions
  	    client.broadcastTo(json({ announcement: client.sessionId + ' connected' }), whiteList);

      	client.on('message', function(message){
      		var msg = { message: [client.sessionId, message] };

      		//this buffer does nothing currently but store a list of the last 15 messages
      		//may want to investigate using it to actually buffer client messages
      		//we would need to either call process.onNextTick or setTimeOut to use this effectively
      		//storing it in redis may not be a bad idea either, since actions there are atomic
      		buffer.push(msg);
      		if (buffer.length > 15) buffer.shift();

      		//ARGH, socket.io only supports blacklists by default
      		/*
            Updated my socket.io fork on accept a whitelist on the broadcastTo method,
            What we should do now is either:
              require the user specify the room in their message (hmmmmm, probably not a good idea)
              or 
              lookup which room this user is in, which we should have in redis, then remove the user from that list and broadcoast via the whitelist
      		*/
      		
      		//time has passed since the client joined lowly roomId in a rousing game of XYZ, now we need to look up the current whitelist and send this message back
      		redisClient.lrange(roomId + "/users", 0, 10, function(e, updatedWhiteList) {
      		  if (e) {return false;} 
      		  
      		  client.broadcastTo(json(msg), updatedWhiteList);
      		});
    		});

      	client.on('disconnect', function(){
      		client.broadcastTo(json({ announcement: client.sessionId + ' disconnected' }));
      	});
  	    
  	  });
  	  
  	});
  	
	});
  
}

var tryStart = function() {
  if (gh.server == null) {
    sys.log("gh not started yet, waiting for nextTick to start socket server.");
    
    //would probably be more effective to just listen for an event that GH could emit when it's done starting up
    return process.nextTick(tryStart);
  }
  StartSocket();
}

tryStart();
