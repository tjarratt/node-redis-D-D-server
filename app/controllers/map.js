var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");
var exec = require('child_process').exec;

var redis = require("../../lib/redis-client");
var client = redis.createClient();

var errors = require('../../util/err');
require("../../lib/underscore-min")
var json = JSON.stringify;

var gh = require('grasshopper');

gh.get("/maps/{id}", function(args) {
  var self = this;
  var id = args.id;
  
  sys.puts("getting maps for session: " + id);
  mapObjs = [];
  client.hgetall(id + "/maps", function(e, result) {
    if (e || !result) {return self.renderText("false")}
    
    var total = _.size(result);
    sys.puts("found " + total + " maps for this session.");
    sys.puts("time to fetch them....");
    util.inspect(result);
    
    _.each(result, function(name, mapKey, list) {
      sys.puts("Looking for map with key: " + mapKey);
      client.hmget(mapKey, "name", "width", "height", function(e, thisMap) {
        var map = {name: thisMap[0].toString('utf8'),
                  width: thisMap[1].toString('utf8'),
                  height: thisMap[2].toString('utf8'),
                  id: mapKey,
                  file: "null",
                  };
        
        total--;
        mapObjs.push(map);
        sys.puts("pushed map onto stack. " + total + " maps remaining");
       
        if (total == 0) {
          sys.puts("emitting maps Array");
          self.renderText(json(mapObjs));
        }
       
      });//getall
     
    });//each
        
  });//getall
});

/*
  For now, create a map that only has the meta data
  we can push the file uplaod to a separate process
  ideally, this would all be completed via ajax on the client
*/

gh.post("/maps/new", function(args) {
  sys.puts("Trying to create a new map.");
  
  if (!this.params) {
    return this.renderText("Need to specify some arguments, brutha");
  }
  
  util.inspect(this.params);
  
  var self = this;
  var sessionId = this.params['id'],
      name = this.params['name'],
      width = this.params['width'],
      height = this.params['height'];
      
  var postData = [sessionId, name, width, height];
  if (errors.isEmpty(postData)) {
    util.inspect(postData);
    return this.renderText("Needs more sessionId specified.")
  }

  client.hexists("sessions", sessionId, function(e, result) {
    if (e || !result) {return self.renderText("Invalid session.")}
    var newUUID = Math.uuid();
  
    client.hmset(newUUID, "session", sessionId, "name", name, "width", width, "height", height, function(e, result) {
    
      client.hset(sessionId + "/maps", newUUID, name, function(e, result) {
        if (e) {
          //TODO: undo the last command
          //This is a fairly common occurrence with this data model, perhaps we should, at startup, look for any 'orphaned' objects so they aren't floating free in redis
          sys.puts("Created a map for session: " + sessionId + " but did not associate it with anything. See mapid: " + newUUID);
          return self.renderText("FUCK. Well you created a map, but it's not associated with anything.")
        }
        
        self.renderText(newUUID);
      });
    });
  });
});

/*
  id - map ID
*/

gh.post("/maps/{id}/upload", function(args) {
  var self = this;
  var id = args.id;
  
  sys.puts("params");
  util.inspect(this.params);
  
  var fileObj = this.params['file'];
  var file = fileObj.path;
  
  if (errors.isEmpty([id, file])) {
    sys.puts("missing something: " + [id, file]);
    return this.renderText("Missing some data. " + [id, file]);
  }
                
  //sanity check on mimetype : this is not guaranteed to work. We should also check the filetype if possible
  
  var mapId = Math.uuid();
  var newName = "/nodeUploads/" + mapId;
  sys.puts("created map at path: " + newName);
  
  exec('cp ' + file + " " + newName, function(error, stdout, stderr) {
    if (error !== null) {
      return sys.puts('exec error: ' + error);
    }
    sys.puts("copied over file to more permanent filesystem");
    
    client.hmset(id, mapId + "mapPath", newName, function(e, result) {
      //need to check if we actually can write to redis -- might want to kill that image otherwise
      if (e) {
        self.renderText("whoops, redis didn't like this... deleting image");
        return exec('rm -f ' + newName);
      }
      sys.puts("saved image to disk and redis");
      
      self.renderText("true");
    });
  });
});