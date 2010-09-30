var sys = require('sys');

var errorHandler = require("./util/err"); 
var gh = require('grasshopper');

gh.configure({
    viewsDir: './app/views',
    layout: './app/views/layout',
    
    //TODO: figure out what this is
    //locales: require('./locales')
});

["account", "find", "map", "session", "talk"
].forEach(function(controller) {
    require("./app/controllers/" + controller);
});

gh.get("/", function() {
  var now = new Date();
  this.model['now'] = now.getMonth() + "/" + now.getDate() + "/" + now.getFullYear();
  this.render('home');
});
     
gh.serve(8080);
sys.puts("Server running on port 8080");