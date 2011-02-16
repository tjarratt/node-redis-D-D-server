//probably refactor this so that the socket / message handler interface is cleaner
function initSocket(url, id) {
  //TODO: validate this url
  if (!_url) {
    _url = "butter3.local";
    $("h2").html("This may not work, don't seem to have a valid websocket URL.");
  }

  console.log("got url: " + _url);

  io.setPath("/");
  _socket = new io.Socket(_url, {port: 8000});
  _socket.connect();
  console.log("connected socket, adding listeners for messages");
  _socket.on("message", function(data){
    var obj = JSON.parse(data);

    //if the server decided to send us several messages at once, handle each one in turn
    if ("buffer" in obj){
      document.getElementById("form").style.display="block";
      document.getElementById("chat").innerHTML = "";

      for (var i in obj.buffer) messageHandler(obj.buffer[i]);
    } 
    else messageHandler(obj);
  });
  
  //after creating the socket, we need to identify ourselves
  _socket.send("ID:" + id, false);
  return true;
}

function messageHandler(obj){
  var showMessage = true;
  var el = document.createElement("p");
  if ("announcement" in obj) {
    el.innerHTML = "<em>" + esc(obj.announcement) + "</em>";
    
    if (obj.username && obj.imageName) {
      console.log(obj.username + " has joined with image: " + obj.imageName);
      var username = esc(obj.username);
      var image = esc(obj.imageName);
      console.log("escapped image: " + image);
      
      var newUserBlock = "<div class='playerBlock'><img class='playerImg' id='player_" + username + "' src='" + image + "' />";
      newUserBlock += "<div id='" + username + "'><div class='innerChat'><a href='#' class='chatLink' id='" + username + "'>" + username + "</a></div></div></div>";
      
      $("div#players").append(newUserBlock);
      
      //set up private chat handler
      $("a#" + username).click(function(e) {
        //?
      });
    }
  }
  else if ("message" in obj) {
    el.innerHTML = "<b>" + esc(obj.message[0]) + ":</b>" + esc(obj.message[1]);
    console.log("message from " + obj.message[0] + ":" + obj.message[1]);
  } 
  else if ("move" in obj) {
    var info = handleMovement(obj);
    el.innerHTML = "<b>" + esc(info.from) + " has moved to [" + info.coords.x + ", " + info.coords.y + "].</b>";
  }
  else if ("add" in obj) {
    var info = handleAdd(obj.add);
    el.innerHTML = "<b>" + esc(info.from) + " has added an image to [" + info.coords.x + ", " + info.coords.y + "].</b>";
  }
  else if ("annotate" in obj) {
    showMessage = false;
    console.log("updating annotation context");
    //create new image
    var img = new Image();
    var now = new Date();
    var postfix = now.getTime().toString();
    img.src = "/res/img/annotate/" + _listenId + ".png?t=" + postfix;
    
    img.onload = function(){
      //get canvas context, draw image
      var annotateContext = $("canvas#annotations")[0].getContext("2d");
      annotateContext.clearRect(0, 0, 1250, 1250);
      annotateContext.drawImage(img, 0, 0);
      annotateContext.stroke();
    }
  }
  else if ("remove" in obj) {
    console.log("received a command to delete an object on the map");
    var actionInfo = obj["remove"],
        position = actionInfo[0]
        who = actionInfo[1],
        key = position.x + "_" + position.y,
        showMessage = false;
        
    delete _positions[key];
    if (!_draggingImage || _draggingImage == null) {
      renderAll(false);
    }
  }
  else if ("shadow" in obj) {
    console.log("updating shadow image");
    showMessage = false;
    var img = new Image();
    var now = new Date();
    var postfix = now.getTime().toString();
    img.src = "/res/img/shadow/" + _listenId + ".png?t=" + postfix;
    img.onload = function() {
      var shadowContext = $("canvas#shadow")[0].getContext("2d");
      shadowContext.clearRect(0, 0, 1250, 1250);
      shadowContext.drawImage(img, 0, 0);
      shadowContext.stroke();
    }
  }
  else {
    console.log("received unknown message: " + obj);
    console.log(obj[Object.prototype.keys(obj)[0]]);
  }
  
  if (showMessage) {
    document.getElementById("chat").appendChild(el);
    document.getElementById("chat").scrollTop = 1000000;
  }
}

function sendHandler(msg, shouldDisplay){
  shouldDisplay = (shouldDisplay && msg.indexOf("/") < 0)? shouldDisplay : false;
  
  var val = msg? msg : document.getElementById("text").value;
  console.log("trying to send message: " + val);
  
  //short circuit
  if (!val) {return false;}
  
  //send the message off, only display locally if this came from chat
  _socket.send(val);
  if (shouldDisplay) {message({ message: ["you", val] });}
  document.getElementById("text").value = "";
}

function loadCanvasImages(roomId) {
  //draw the map on the background layer, instead of where we have the players
  var canvas = $("canvas#background")[0],
      ctx = canvas.getContext("2d"),
      backImgSrc = _default ? "default" : _listenId,
      players = $("img.playerImg"),
      shadowContext = $("canvas#shadow")[0].getContext("2d"),
      annotateContext = $("canvas#annotations")[0].getContext("2d"),
      backgroundImg = new Image(),
      shadowImg = new Image(),
      annotateImg = new Image();
      
  backImgSrc = "/res/img/" + backImgSrc + ".jpg";
  backgroundImg.src = backImgSrc;
  
  backgroundImg.onload = function(){
    ctx.drawImage(backgroundImg,0,0);
    ctx.beginPath();
    //going to assume we want a 25x25 grid
    //(x, y)                             
    ctx.moveTo(0, 0);
    //might it not be easier to do this with a series of transparent squares?
    for (var i = 1; i <= 25; i ++) {
      ctx.lineTo(i * 50, 0);
      ctx.lineTo(i * 50, 1250);
      ctx.lineTo(i * 50 + 50, 1250);
      ctx.lineTo(i * 50 + 50, 0);
      
      //add some letters and numbers to the grid
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(String.fromCharCode(64 + i), i * 50 - 25, 15);
      ctx.fillText(i.toString(), 15, i * 50 - 25);
    }
    ctx.stroke();
    
    //TODO: can we keep the stroke where it was before?
    ctx.moveTo(0, 0);
    for (var j = 1; j <= 25; j++) {
      ctx.lineTo(0, j * 50);
      ctx.lineTo(1250, j*50);
      ctx.lineTo(1250, j*50 + 50);
      ctx.lineTo(0, j*50 + 50);
    }
    ctx.stroke();
    
    ctx.moveTo(0, 1250);
    ctx.lineTo(0,0);
    ctx.lineTo(1250, 0);
    ctx.stroke();
  }
  
  //jquery objects for the textarea and main canvas area
  _$textArea = $("textarea#textArea"); //won't be needing this much longer
  _$canvas = $("canvas#map");
  _$background = $("canvas#background");
  _$top = $("canvas#top");
  
  //draw any annotations or shadows on the board now
  shadowImg.src = "/res/img/shadow/" + _listenId + ".png";
  annotateImg.src = "/res/img/annotate/" + _listenId + ".png";
  
  shadowImg.onload = function() {
    shadowContext.drawImage(shadowImg, 0, 0);
  }
  annotateImg.onload = function() {
    annotateContext.drawImage(annotateImg, 0, 0);
  }
  
}

function getShadowArea(start, end) {
  /*several cases here, basically boils down to...
  START is above / below END
  START is left / right of END
  */
  var upperLeft = {};
  var bottomRight = {};
  //sacrificing some code size here for brevity..., 
  //would separate code paths be faster than these ternary comparisons?
  
  upperLeft.xComponent = start.x < end.x ? start : end;
  upperLeft.yComponent = start.y < end.y ? start : end;
  
  bottomRight.xComponent = start.x > end.x ? start : end;
  bottomRight.yComponent = start.y > end.y ? start : end;
  //TODO: should we change this to only return the closest point instead of the entire {closest, screen, exact} obj?
  
  return {ul: upperLeft, br: bottomRight};
}

function validArgs(args) {
  result = true;
  $.each(args, function(index, element, list) {
    if (!element && typeof element != "number") {
      result = false;
      return false;
    }
  });
  return result;
}
function esc(msg){
  return msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

function findTouchPosition(e) {
  var touch = e.touches[0];
  
  return {x: touch.clientX, y: touch.clientY};
}