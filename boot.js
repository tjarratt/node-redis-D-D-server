var sys = require('sys');

var errorHandler = require("./util/err"); 
var gh = require('grasshopper');
var io = require('socket.io');

var util = require('util/util');
var json = JSON.stringify;

gh.configure({
    viewsDir: './app/views',
    layout: './app/views/layout',
    
    //TODO: decide whether we need localization
    //one potential use for this might be 
    //locales: require('./locales')
});

["account", "find", "map", "session", "talk", "join"
].forEach(function(controller) {
    require("./app/controllers/" + controller);
});

gh.get("/", function() {
  this.disableCache();
  var now = new Date();
  sys.puts(now);
  this.model['now'] = now;
  this.render('home');
});
     
gh.serve(8080);
sys.puts("Server running on port 8080");

//initialize socket.io : I choose you!
//exported http.server from grasshopper
var buffer = [], json = JSON.stringify;

var StartSocket = function() {
  sys.puts("starting up socket.io");
  
  var socket = io.listen(gh.server);
    
  /*sys.puts("inspecting io socket obj");
  util.inspect(socket);

  	onClientConnect: function(client){
  		client.send(json({ buffer: buffer }));
  		client.broadcast(json({ announcement: client.sessionId + ' connected' }));
  	},

  	onClientDisconnect: function(client){
  		client.broadcast(json({ announcement: client.sessionId + ' disconnected' }));
  	},

  	onClientMessage: function(message, client){
  		var msg = { message: [client.sessionId, message] };
  		buffer.push(msg);
  		if (buffer.length > 15) buffer.shift();
  		client.broadcast(json(msg));
  	}

  });*/
  socket.on('connection', function(client){
    sys.puts("client connected with id: " + client.sessionId);
    sys.puts("sending message: " + buffer);
    util.inspect(buffer);
    
  	client.send(json({ buffer: buffer }));
  	client.broadcast(json({ announcement: client.sessionId + ' connected' }));

  	client.on('message', function(message){
  		var msg = { message: [client.sessionId, message] };
  		buffer.push(msg);
  		if (buffer.length > 15) buffer.shift();
  		client.broadcast(json(msg));
  	});

  	client.on('disconnect', function(){
  		client.broadcast(json({ announcement: client.sessionId + ' disconnected' }));
  	});
	});
  
}

var tryStart = function() {
  if (gh.server == null) {
    sys.log("gh not started yet, waiting for nextTick");
    return process.nextTick(tryStart);
  }
  StartSocket();
}

tryStart();
