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

/*
  For now, create a map that only has the meta data
  we can push the file uplaod to a separate process
  ideally, this would all be completed via ajax on the client
*/

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