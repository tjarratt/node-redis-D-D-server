require("../lib/underscore-min")
var testCase = require('nodeunit').testCase;
                
module.exports = testCase({
  setUp: function () {
    this.accountCtl = require('../app/controllers/account');
  },
  tearDown: function () {
    client = this.acctCtl.client;
    client.hkeys("account",function, (keys) {
      _.each(keys, function(key, index, keys) {
        client.hdel("account", key, function(){});
      })
    } 
  },
  testCreateAccount: function (test) {
    var gotResponse = function(result) {
      test.equals(result, this.acctCtl.responses['accountSuccess']);
      test.done();                                                
    }
    
    accountCtl.createAccount("tester", "password", gotResponse);
  }
});

exports.testSomething = function(test){
    test.expect(1);
    test.ok(true, "this assertion should pass");
    test.done();
};

/*exports.testSomethingElse = function(test){
    test.ok(false, "this assertion should fail");
    test.done();
};

exports.test1 = function (test) {
    test.ok(true, "this is all right");
}

exports.group = {
  test2: function (test) {
    test.okay(true, "yeah");
  },
  test3: function (test) {
      test.okay(true, "I think I get it");
    }
}*/

/*var assert = require("assert");

function setup() {
  return require("../app/controllers/account");
}

module.exports = {
  'test #createAccount()': function(assert){
    var accountCtl = setup();
    
    var gotResponse = function(result) {
      assert.equal(result, accountCtl.responses['accountSuccess']);
    }
    
    accountCtl.createAccount("tester", "password", gotResponse);
  },
  
  'test #duplicateAccount' : function(assert) {
    var acctCtl = setup();
    
    var postCreateCallback = function(response) {
      var shouldBeErrorCallback = function(result) {
        assert.equal(result, acctCtl.responses['accountExistsError']);
      }
      
      acctCtl.createAccount("newUser", "differentPassword", shouldBeErrorCallback);
    }
    
    acctCtl.createAccount("newUser", "password", postCreateCallback);
  }
}