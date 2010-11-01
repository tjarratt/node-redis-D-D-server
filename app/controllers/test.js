var gh = require("grasshopper");
                           
//testing built-in javascript random functions
//looking for a uniform 
gh.get("/test", function() {
  this.render("test/dice");
});