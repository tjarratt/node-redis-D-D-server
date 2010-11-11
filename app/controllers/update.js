var sys = require("sys");
var fs = require("fs");//need this to create a writeable stream 
var util = require('../../util/util');
require("../../lib/uuid");

var errors = require('../../util/err');
require("../../lib/underscore-min");

var exec = require('child_process').exec;//shell scripts woo

var gh = require("grasshopper");

gh.post("/update/{roomId}/annotate", function(args) {
  var self = this,
      roomId = args.roomId,
      imgData = this.params['b64image'];
      
  //need to strip off everything before the first comma
  //ie: "data:image/png;base64,BLAHBLAHBASE64BLAHBLAH"
  imgData = imgData.substring(imgData.indexOf(",") + 1, imgData.length);
  
  sys.puts("got an image for roomId: " + roomId);;
  
  //TODO: sanity check, make sure this roomID is active
  
  //write the image to disk
  var opt = {'flags': "w",
              'encoding': "base64",
              "mode": 0666};
  //TODO: if we set this in boot.js, we won't need to worry about the correct path to our resources
  var path = __dirname + "/../../res/img/annotate/" + roomId + ".png";
              
  var fileStream = fs.createWriteStream(path, opt);
  if (!fileStream.writeable) {
    sys.puts("could not write to path: " + path);
    return this.renderText("not writeable");
  }
   
  //i worry that this will block the entire server
  //but since we pass this off to the kernel, and either receive a mesage saying "okay, wrote at once", or wait for a drain event
  //so, maybe not?
  var done = fileStream.write(imgData, "base64");
  //still need to wait for the drain event, or check if this was written all at once
  if (!done) {
    var gotDrainEvent = function(result) {
      sys.puts("got drain event from filestream: " + result);
      self.renderText("true");//indicate that other clients can now reference this image
    }
    
    return fileStream.on("drain", gotDrainEvent);
  }
  //return the client some info so they can tell other clients where to get this image from
  return this.renderText("true");
});

gh.post("/update/{roomId}/annotate/delete", function(args) {
  var self = this,
      roomId = args.roomId;
  sys.puts("deleting the annotation image for room: " + roomId);
  //copy an empty image to the location on disk where we normally have this
  //for now everything is a 700 by 700 image so let's use what we got
  var fileBase = __dirname + "/../../res/img/";
  
  exec('cp ' + fileBase + "empty_700_700.png " + fileBase + roomId + ".png", function(error, stdout, stderr) {
    if (error !== null) {
      sys.puts('exec error while deleting annotation image: ' + error);
      
      return self.renderText("false");
    }
    self.renderText("true");
  });
});

gh.post("/update/{roomId}/shadow", function(args) {
  var self = this,
      roomId = args.roomId,
      imgData = this.params['b64image'];
      
  imgData = imgData.substring(imgData.indexOf(",") + 1, imgData.length);
  
  sys.puts("got an updated shadow image for roomId: " + roomId);
  
  var opt = {'flags' : "w",
              "encoding" : "base64",
              "mode" : 0666};
  
  var path = __dirname + "/../../res/img/shadow/" + roomId + ".png";
  
  var fileStream = fs.createWriteStream(path, opt);
  if (!fileStream.writeable) {
    sys.puts("could not write to path: " + path);
    return this.renderText("error: not writeable");
  }
  
  var done = fileStream.write(imgData, "base64");
  if (!done) {
    var gotDrainEvent = function(result) {
      sys.puts("got drain event from fileStream");
      self.renderText("true");
    }
    return fileStream.on("drain", gotDrainEvent);
  }
  return this.renderText("true");
});