/*
prototype for api controller
should define methods to ....
  get entire response, when multi-part
  emit response
  parse json
  provide hooks for authentication
*/

var sys = require("sys"),
    util = require(__appRoot + "/util/util"),
    uid = require(__appRoot + "/lib/uuid"),
    exec = require("child_process").exec,
    redisClient = require(__appRoot + "/lib/redis-client").createClient(),
    json = JSON.stringify,
    gh = require("grasshopper");
    
//and a helper lib    
require(__appRoot + "/lib/underscore-min");
    
    /*
      idea:
      controller manages its own REST paths via an assoc array of paths + functions 
      eg, for an account controller
      var getAccount = function(){};
      var renderLogin = function(){};
      this.getFunctions = {"/account": getAccount, "/account/login": renderLogin};
      this.postFunctions = {"/account": updateAccount, "account/login": submitLogin};
      _.each(this.getFunctions, function(block, path, list) {
        gh.get(path, function);
      });
      
      should allow for easier test writing, and reuse between web and API
    */
    
exports.apiPrototype = function() {
  return {
    modelVars : {},
    getFunctions : {},
    postFunctions : {},
    //call this once per controller to configure all of the paths automatically
    setupPaths : function() {
      _.each(this.getFunctions, function(block, path, list) {
        gh.get(path, block);
      });
      _.each(this.postFunctions, function(block, path, list) {
        gh.post(path, block);
      });
      return true;//let's be nice
    },
    render : function(pathToHTML) {
      _.each(this.modelVars, function(value, key, list) {
        gh.model[key] = value;
      });
      gh.render(pathToHTML);
    },
    getAjaxData : function(request, callback) {
      var body = request.url + "?";
      request.on("data", function(chunk) {
        body += chunk;
      });
      request.on("end", function() {
        var ajaxData = require("url").parse(body, true);
        callback(ajaxData);
      });
      request.on("error", function() {
        sys.puts("error on request, abort, abort");
        callback(false);
      })
    },
    emitAjaxResponse : function(response, body, contentType) {
      contentType = contentType? contentType : "application/json";
      response.writeHead(200, {
        'Content-Length': body.length,
        'Content-Type': contentType
      });
      response.write(body);
      response.end();
    }
  };
}
