var sys = require('sys');
var http = require('http');  
var url = require('url');
var errorHandler = require("err"); 
var auth = require('auth');
var uuid = require('uuid');
var gh = require('grasshopper');



/*gh.get("/message/{channel}", function(args) {
	//not implemented yet
	this.renderText("Not implemented yet.");

	this.model['channel'] = args.channel;
	var messageCtl = require('messager');
	messageCtl.model = this.model;

	messageCtl.handle(args);
});

gh.get("/auth", function(args) {
	var auth = require('auth');
	this.render("views/auth");
});
gh.post("/auth", function(args) {
	var auth = require("auth");
	auth.login(args);
});

gh.get("/start", function(args) {
	var starter = require("starter");
	this.renderText("What do you want to start? (no web interface, try POSTing).");
});
gh.post("/start/{type}", function(args) {
	var starter = require('starter');
	starter.initSession(args.type, args);
});
     
gh.get("/join", function(args) {
	var joiner = require("joiner");
	this.renderText("What do you want to join? (no web interface, try POSTing)");
});
gh.post("/join/{session}", function(args) {
	var joiner = require("joiner");
	joiner.joinSession(args.session)
});
                             
gh.get("/create", function(args) {
	var creator = require("create");
	this.renderText("What do you want to create?");
});

gh.post("/create/{type}", function(args) {
	var creator = require("create");

  var type = args.type;
  
  var responseCallback = function(result) {
    if (typeof(result) == "string" {
      this.renderText(result);
    }
    else {
      this.renderText(result);
    }
  }
	
	creator.handle(this, type, args);
});*/
     
gh.serve(8080);
sys.puts("Server running on port 8080");