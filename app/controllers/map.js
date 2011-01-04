var sys = require('sys');
    util = require('../../util/util'),
    app = _app,
    exec = require('child_process').exec,
    redis = require("../../lib/redis-client"),
    client = redis.createClient(),
    errors = require('../../util/err'),
    json = JSON.stringify;

require("../../lib/underscore-min");
require("../../lib/uuid");

app.get("/maps/:id", function(request, response) {
  var id = request.params.id;
  
  sys.puts("getting maps for session: " + id);
  mapObjs = [];
  client.hgetall(id + "/maps", function(e, result) {
    if (e || !result) {return response.send("false")}
    
    var total = _.size(result);
    sys.puts("found " + total + " maps for this session.");
    sys.puts("time to fetch them....");
    util.inspect(result);
    
    _.each(result, function(name, mapKey, list) {
      sys.puts("Looking at map with key: " + mapKey);
      client.exists(mapKey, function(e, result) {
        if (e || !result) {
          sys.puts("bad map: " + mapKey);
          total--;
          //this is a bad map
          return;
        }
        client.hmget(mapKey, "name", "width", "height", "image", function(e, thisMap) {
          util.inspect(thisMap);
          
          var map = {name: thisMap[0].toString('utf8'),
                    width: thisMap[1].toString('utf8'),
                    height: thisMap[2].toString('utf8'),
                    id: mapKey,
                    image: util.hashResultMaybe(thisMap, 3),
                    };

          total--;
          mapObjs.push(map);
          sys.puts("pushed map onto stack. " + total + " maps remaining");

          if (total == 0) {
            sys.puts("emitting maps Array");
            response.send(json(mapObjs));
          }

        });//getall
      });
     
    });//each
        
  });//getall
});

function getAjaxData(request, callback) {
  var body = request.url + "?";
  request.on("data", function(chunk) {
    body += chunk;
  });
  request.on("end", function() {
    var ajaxData = require("url").parse(body, true);
    callback(ajaxData);
  });
}

function emitAjaxResponse(response, body, contentType) {
  contentType = contentType? contentType : "application/json";
  response.writeHead(200, {
    'Content-Length': body.length,
    'Content-Type': contentType
  });
  response.write(body);
  response.end();
}

/*
  For now, create a map that only has the meta data
  we can push the file uplaod to a separate process
  ideally, this would all be completed via ajax on the client
*/

app.post("/maps/new", function(request, response) {
  sys.puts("Trying to create a new map.");
  var self = this;
  var ajaxData = "/maps/new?";
  
  //util.inspect(this);
  
  //need to wait for the rest of the ajax data to send
  request.on("data", function(chunk) {
    sys.puts("got chunk from ajax map req:" + chunk);
    ajaxData += chunk;
  });
  request.on("end", function() {
    var params = require('url').parse(ajaxData, true).query;
    util.inspect(params);
    
    var sessionId = params.id;
        name = params.name;
        width = params.width;
        height = params.height;
        ajaxId = params.aid,
        cookieId = request.getCookie("uid");
        
    //get username, ajaxId from cookie
    client.hmget("cookie:" + cookieId, "username", "ajaxId", function(e, result) {
      var username = util.hashResultMaybe(result, 0);
      var realAjaxId = util.hashResultMaybe(result, 1);

      //this isn't working because the code that sets the ajax ID is running several times for a single render
      if (realAjaxId != ajaxId) {
        sys.puts("bad ajax id for: " + username);
        sys.puts("real: " + realAjaxId);
        sys.puts("supplied: " + ajaxId);
        //return self.renderText("false");
      }
      
      //confirm session exists
      client.hexists("sessions", sessionId, function(e, result) {
        if (e || !result) {return res.send("Invalid session.")}
        var newUUID = Math.uuid();

        //TODO: confirm user owns session 
        //create new map
        sys.puts("creating new map with id: " + newUUID);
        client.hmset(newUUID, "session", sessionId, "name", name, "width", width, "height", height, function(e, result) {

          client.hset(sessionId + "/maps", newUUID, name, function(e, result) {
            if (e) {
              //TODO: undo the last command
              //This is a fairly common occurrence with this data model, perhaps we should, at startup, look for any 'orphaned' objects so they aren't floating free in redis
              sys.puts("Created a map for session: " + sessionId + " but did not associate it with anything. See mapid: " + newUUID);
              return response.send("FUCK. Well you created a map, but it's not associated with anything.")
            }
            
            //setup the view the ajax will render
            var body = '<div class="mapInnerContainer">' +
      				'<a class="detail" href="#">' +
      					'<span class="mapName" style="padding: 20px;" >' + name + '</span>' +
      				'</a>' +
      				'<span class="mapWidth" style="padding: 20px;" >' + width + '</span>' +
      				'<span class="mapHeight" style="padding: 20px;" >' + height + '</span>' +
      				'<img src="/" style="visibility: hidden"/>' + 
      				'<a class="rm" id="' + newUUID + '" href="#" onclick="deleteThis(this); return false;">x</a>' + 
      				'<div class="file-uploader">' +
                '<input id=\'upload" + index + "\' type=\'file\' name=\'file\'/> <div class=\'clear\'></div>' + 
    						'<input type=\'submit\' onclick=\'return ajaxFileUpload(this);\' value=\'Send\'>' + 
      				'</div>' +
      			'</div>';
            response.writeHead(200, {
              'Content-Length': body.length,
              'Content-Type': 'application/html'
            });
            response.write(body);
            response.end();
          });
        });
      });
    });
  });
  
});

app.post("/maps/:id/delete", function(request, response) {
  var mapId = request.params.id;
  var gotAjaxData = function(ajaxParams) {
    client.hexists(mapId, "width", function(e, result) {
      //gotta make sure this is actually a map key (should probably be prefaced by map: in redis)
      if (e || !result) {return emitAjaxResponse(gh.response, "false", "application/json");}
      client.del(mapId, function(e, result) {
        if (e || !result) {return emitAjaxResponse(gh.response, "false", "application/json");}
        
        emitAjaxResponse(response, "true", "application/json");
      });
    });
  }
  getAjaxData(request, gotAjaxData);
});

/*
  id - map ID
*/

app.post("/maps/:id/upload", function(req, res) {
  var id = req.params.id;
  
  sys.puts("uploading an image for mapId: " + id);
  
  var fileObj = req.body.file;
  var file = fileObj.path;
  
  if (errors.isEmpty([id, fileObj, file])) {
    sys.puts("missing something: " + [id, file]);
    return res.send("Missing some data. " + [id, file]);
  }
    
  var newName = __dirname + "/../../res/img/maps/" + id;
  sys.puts("creating map image at path: " + newName);
  
  exec('cp ' + file + " " + newName, function(error, stdout, stderr) {
    if (error !== null) {
      res.send("nyurrrr");
      return sys.puts('exec error: ' + error);
    }
    sys.puts("copied over file to filesystem");
    
    client.hset(id, "image", "/res/img/maps/" + id, function(e, result) {
      //need to check if we actually can write to redis -- might want to kill that image otherwise
      if (e) {
        res.send("whoops, redis didn't like this... deleting image");
        return exec('rm -f ' + newName);
      }
      sys.puts("saved image to disk and redis");
      
      res.send(id);
    });
  });
});