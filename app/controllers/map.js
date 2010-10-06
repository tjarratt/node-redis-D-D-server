var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");

var redis = require("../../lib/redis-client");
var client = redis.createClient();

var errors = require('../../util/err');
require("../../lib/underscore-min")

var gh = require('grasshopper');

gh.get("/maps/{id}", function(args) {
  var self = this;
  var id = args.id;
  
  sys.puts("getting maps for session:" + id);
  mapObjs = [];
  client.hgetall(id + "maps", function(e, result) {
    var total = result.length;
    
    _.each(result, function(mapKey) {
     client.hgetall(mapKey, function(e, thisMap) {
       total--;
       mapObjs.push(thisMap);
       
       if (total == 0) {
         self.renderText("done");
       }
       
     });//getall
     
   });//each
        
 });//getall
});

gh.post("/maps/new", function(args) {
  if (!args) {
    return this.renderText("Need to specify some arguments, brutha");
  }
  
  var self = this;
  var sessionId = args.id,
      name = args.name,
      width = args.x,
      height = args.y;
      
  var postData = [sessionId, name, width, height];
  if (errors.isEmpty(postData)) {return this.renderText("Needs more sessionId specified.")}

  client.hexists("sessions", sessionId, function(e, result) {
    if (e || !result) {return self.renderText("Invalid session.")}
    var newUUID = Math.uuid();
  
    client.hmset(newUUID, "session", session, "name", name, "width", width, "height", height, function(e, result) {
    
      client.hset(sessionId + "maps", newUUID, name, function(e, result) {
        if (e) {return self.renderText("FUCK. Well you created a map, but it's not associated with anything.")}
        
        self.renderText("successfully created a map for that session. Awesome");
      });
    });
  });
});