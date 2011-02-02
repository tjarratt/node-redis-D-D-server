var sys = require('sys');
var util = require('../../util/util');
require("../../lib/uuid");
var errors = require('../../util/err');
var users = require("../models/user");

var client = require('../../lib/redis-client').createClient();

var errors = require('../../util/err');
require("../../lib/underscore-min"); //exposed via _ obj

var gh = require('grasshopper');

var cookie = require('cookie');

var io = require("socket.io");

gh.get("/chat/{person}/history", function(args) {
  var messageFrom = false,
      messageTo = args.person,
      self = this;
  if (!messageTo) {sys.puts("emitting nothing"); return exports.renderJSON([], gh.response);}//should maybe return a better failure?
  
  var sessionId = gh.request.getCookie("uid");
  users.getUserByCookieId(sessionId, function(userInfo) {
    messageFrom = userInfo.messageFrom;
    sys.puts("request for history from: " + messageFrom + " for: " + messageTo);
    self.renderText(JSON.stringify([]));
  });
});

exports.renderJSON = function(message, response) {
  message = message? JSON.stringify(message) : "";
  response.writeHead(200, {
    'Content-Length': message.length,
    'Content-Type': "application/json"
  });
  response.write(message);
  response.end();
}

exports.startChat = function(reqInfo, nameKey, chatClient, callback) {
  var chatWith = reqInfo[nameKey];
  var conversation = [client.sessionId, chatWith];
  var chatId = Math.uuid();

  sys.puts("initiating private conversation between " + chatClient.sessionId + " and " + chatWith);
  util.inspect(reqInfo);
  sys.puts(nameKey);
  
  client.hget("privChat", chatWith, function(e, withSessionId) {
    sys.puts("setting up redis subscribe to chatId: " + chatId);
    client.subscribe(chatId, function(e, update) {
      sys.puts("got update: " + update);
      sys.puts(typeof update);
      if (update.toString().substr(0, 9) == "subscribe") {
        sys.puts("caught subscribe update...");
        return;//hack
      }
      
      updateObj = JSON.parse(update);
      var from = updateObj.from,
          to = updateObj.to,
          chatId = updateObj.chatId;
      
      chatClient.broadcastOnly(JSON.stringify({"message": updateObj.message, "chatId" : chatId}), [to]);
    });

    sys.puts("setting up chat:" + chatId + " in redis, then broadcasting to users...");
    sys.puts(withSessionId + ", " + chatClient.sessionId);
    client.hmset("chat:" + chatId, chatClient.sessionId, "listening", withSessionId, "listening", function(e, result) {
      chatClient.broadcastOnly(JSON.stringify({"participants": [withSessionId, chatClient.sessionId]}), [withSessionId, chatClient.sessionId]);
    });
  });
}

var server = require("http").createServer();
server.listen(_config.port);
var socket = io.listen(server);
socket.on("connection", function(chatClient) {
  sys.puts("got connected private chat");
  //client should already have history, just setup a message callback
  
  chatClient.on("message", function(data) {
    sys.puts("got client message:" + data );
    util.inspect(data);
    messageObj = JSON.parse(data);
    
    if ("announce" in messageObj) {
      //this user is announcing their privateChatSocket
      client.hset("privChat", messageObj.name, chatClient.sessionId, function(e, result) {
        if (e || !result) {
          sys.puts("CRITICAL: welp, failed to set privChat name")
        }
      });
    }
    //check for messages being sent to a new user
    else if ("switch" in messageObj) {
      exports.startChat(messageObj, "switch", this);
      //do we still need to do anything to maintain the previous chat?
      //we could unsubscribe and create a buffer for any messages passed while this user isn't listening
    }
    else {
      //this would be a message to the other user, so let's publish it
      var fromUser = this.sessionId,
          toUser = messageObj.to,
          message = messageObj.message;
      if (!fromUser || !toUser || !message) {
        sys.puts("got bad chat message, bailing (missing from, or to, or message)");
        util.inspect(messageObj);
        return false;
      }    
          
      var updateMessage = 
      {
        from: fromUser,
        to: toUser,
        message: message,
      }
      client.publish(messageObj.chatId, JSON.stringify(updateMessage), function(e, result) {
        if (e || !result) {
          sys.puts("welp. Failed to publish. Should add this message onto a buffer to resend.");
        }
      });
    }
  });
  client.on("disconnect", function(data) {
    //alert user that the other end has disconnected
    delete client;
  });
});