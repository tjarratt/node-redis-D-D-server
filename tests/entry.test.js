var entry = require('../entry');
var assert = require('assert');
  
var create = function(){
    var app = entry.createServer();
};

module.exports = {
  'test #createServer()': function(assert){
      var app = create();
      
      assert
  },
}