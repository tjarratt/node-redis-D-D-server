var sys = require('sys');

var errorHandler = require("./util/err"); 
var gh = require('grasshopper');
var io = require('socket.io');

var util = require('./util/util');
var json = JSON.stringify;

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
    //need to match this sessionId with a user name somehow
    sys.puts("client connected ... inspecting:");
    util.inspect(client);
    
  	client.send(json({ buffer: buffer }));
  	client.broadcast(json({ announcement: client.sessionId + ' connected' }));

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
  		
  		client.broadcast(json(msg));
  	});

  	client.on('disconnect', function(){
  		client.broadcast(json({ announcement: client.sessionId + ' disconnected' }));
  	});
	});
  
}

var tryStart = function() {
  if (gh.server == null) {
    sys.log("gh not started yet, waiting for nextTick to start socket server.");
    
    //would probably be more effective to just listen for an event that GH emits when it's done starting up
    return process.nextTick(tryStart);
  }
  StartSocket();
}

tryStart();
