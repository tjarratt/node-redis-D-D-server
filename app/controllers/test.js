//should go without saying, but everything in here is deprecated and subject to change
var gh = require("grasshopper");
                           
//testing built-in javascript random functions
//looking for a uniform 
gh.get("/test", function() {
  this.render("test/dice");
});

gh.get("/test/ipad", function() {
  this.renderText("Hello iPad");
});