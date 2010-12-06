//should go without saying, but everything in here is deprecated and subject to change
var gh = require("grasshopper");
var ajaxProto = require("./ajax/ajaxAPI");
var util = require(__appRoot + "/util/util");

var self = ajaxProto.apiPrototype();
                           
//testing built-in javascript random functions
//looking for a uniform 
gh.get("/test", function() {
  this.render("test/dice");
});

gh.get("/test/ipad", function() {
  return self.emitAjaxResponse(this.response, "Hello iPad");
});