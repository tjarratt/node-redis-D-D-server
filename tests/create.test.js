var assert = require("assert");

function setup() {
  return = require("../create");
}

module.exports = {
  'test #createAccount()': function(assert){
      var creator = setup();
      
      var response = creator.acct("tester", "password");
      assert.equal(response, creator.responses['accountSuccess']);
  },
}