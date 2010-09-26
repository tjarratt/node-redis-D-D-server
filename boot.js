var sys = require('sys');

var errorHandler = require("./util/err"); 
var gh = require('grasshopper');

gh.configure({
    viewsDir: './views',
    layout: 'layout',
    //locales: require('./locales')
});

["account", "find", "map", "session"
].forEach(function(controller) {
    require("./app/controllers/" + controller);
});
     
gh.serve(8080);
sys.puts("Server running on port 8080");