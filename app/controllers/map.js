var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");

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
          return self.renderText("FUCK. Well you created a map, but it's not associated with anything.")
        }
        
        self.renderText(newUUID);
      });
    });
  });
});

/*
  Yay, frankenstein code
  This depends intricately on the request (set encoding binary, streams, )
*/

gh.post("/maps/{id}/file", function(args) {
  var self = this;
  
  //start handling multipart upload
  request.setEncoding('binary');
  
  var stream = parse_multipart(request);
	
	var fileName = null;
  var fileStream = null;

  // Set handler for a request part received
  stream.onPartBegin = function(part) {
      // Construct file name
      fileName = "/nodeUploads/" + stream.part.filename;

      // Construct stream used to write to file
      fileStream = fs.createWriteStream(fileName);

      // Add error handler
      fileStream.addListener("error", function(err) {
          sys.debug("Got error while writing to file '" + fileName + "': ", err);
      });

      // Add drain (all queued data written) handler to resume receiving request data
      fileStream.addListener("drain", function() {
          request.resume();
      });
  };

  // Set handler for a request part body chunk received
  stream.onData = function(chunk) {
      // Pause receiving request data (until current chunk is written)
      request.pause();

      // Write chunk to file
      // Note that it is important to write in binary mode
      // Otherwise UTF-8 characters are interpreted
      fileStream.write(chunk, "binary");
  };

  // Set handler for request completed
  stream.onEnd = function() {
    // As this is after request completed, all writes should have been queued by now
    // So following callback will be executed after all the data is written out
    fileStream.addListener("drain", function() {
      // Close file stream
      fileStream.end();

      var id = Math.uuid();
		  var mapData = maps.create(user, fileName, id);
		  //sys.puts("id: " + id + "\ndata: " + sys.inspect(mapData));

		  client.rpush(user + "/maps", mapData, function(e, result) {return false;});
      // Handle request completion, as all chunks were already written
      upload_complete(response, id);
    });
  }
});

/*
 * Create multipart parser to parse given request
 */
function parse_multipart(req) {
	var multipart = require('lib/multipart');
    var parser = multipart.parser();

    // Make parser use parsed request headers
    parser.headers = req.headers;

    // Add listeners to request, transfering data to parser
    req.addListener("data", function(chunk) {
        parser.write(chunk);
    });

    req.addListener("end", function() {
        parser.close();
    });

    return parser;
}