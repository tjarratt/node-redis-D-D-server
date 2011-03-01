//probably refactor this so that the socket / message handler interface is cleaner
function initSocket(url, id) {
  //TODO: validate this url
  if (!_url) {
    _url = "butter3.local";
    $("h2").html("This may not work, don't seem to have a valid websocket URL.");
  }

  console.log("got url: " + _url);
  //$("p#debug").html("got url: " + _url);

  io.setPath("/");
  _socket = new io.Socket(_url, {port: 8000});
  _socket.connect();
  console.log("connected socket, adding listeners for messages");
  _socket.on("message", function(data){
    var obj = JSON.parse(data);
    //$("p#debug").html(data);
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

function parseMovement(movement) {
  //expecting something like x:%d,y:%d
  //return {x: %d, y: %d}
  /*var moveString = movement[1];
  var x = moveString.substring(moveString.indexOf("x:") + 2, moveString.indexOf("y:") - 1);
  var y = moveString.substring(moveString.indexOf("y:") + 2, moveString.length);*/
  var fromUser = movement.who,
      x = movement.x,
      y = movement.y,
      imageName = movement.src,
      oldKey = movement.oldKey;
  
  return {from: fromUser, coords: {x: x, y: y}, oldKey: oldKey, imageName: imageName};
}          

function handleAdd(addObj) {
  var addFromUser = addObj.who,
      coords = {x: addObj.x, y: addObj.y};
      
  if (!coords.x || !coords.y) { console.log("got bad message when adding an image to the board"); }
  
  var newImage = new Image;
  newImage.src = addObj.img;
  newImage.onload = function() {
    var key = coords.x + "_" + coords.y;
    _positions[key] = {source: addObj.img, coords: coords, user: addObj.who};
    
    renderAll(false);
  }
  
  return {from: addObj.who, coords: coords};
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

function handleMovement(aMove) {
  var moveInfo = parseMovement(aMove.move),
      coords = moveInfo.coords;
  
  console.log(moveInfo.from + " moved to : [" + coords.x + ", " + coords.y + "]");
  
  if ( (!coords.x && coords.x != 0) || (!coords.y && coords.y != 0) ) {
    console.log("error in movement with string: " + aMove);
    return false;
  }
  
  var src = moveInfo.imageName ? moveInfo.imageName : $("img#player_" + moveInfo.from).attr('src');
  if (!src || src.length == 0) {
    console.log("got no jquery object for player " + moveInfo.from + ". Creating one with image " + moveInfo.imageName);
    var image = new Image;
    image.src = moveInfo.imageName;
    image.onload = function() {
      var key = coords.x + "_" + coords.y,
          oldKey = moveInfo.oldKey;
      
      _positions[key] = {source: moveInfo.imageName, coords: coords, user: moveInfo.from}
      delete _positions[oldKey];//remove old object
      
      renderAll(false);
    }
    
    return moveInfo;
  }
  
  /*$.each(_positions, function(index, position) {
    if (position.user == moveInfo.from) {
      delete _positions[index];
      return false;
    }
  });*/
  delete _positions[moveInfo.oldKey];
  
  //create image, add it to _positions 
  var image = new Image;
  image.src = src;
  image.onload = function() {
    var key = coords.x + "_" + coords.y;
    //TODO: instead of wiping out what's there, we should allow either
    //allow objects to exist in the same square and have some ui to SHOW this
    //or not allow this at all
    _positions[key] = {source : src, coords: coords, user: moveInfo.from};
    
    //render top scene
    //TODO : WHAT HAPPENS IF YOU ARE IN THE MIDDLE OF A DRAG HERE
    renderAll(false);
  }
  return moveInfo;
}


function sendHandler(msg, shouldDisplay){
  shouldDisplay = (shouldDisplay && msg.indexOf("/") < 0)? shouldDisplay : false;
  
  var val = msg? msg : document.getElementById("text").value;
  console.log("trying to send message: " + val);
  
  //short circuit
  if (!val) {return false;}
  
  //send the message off, only display locally if this came from chat
  _socket.send(val);
  if (shouldDisplay) {messageHandler({ message: ["you", val] });}
  document.getElementById("text").value = "";
  
  return false;
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
  var touch = e.touches[0],
      x = touch.clientX,
      y = touch.clientY,
      closestX = parseInt(x / 50) * 50,
      closestY = parseInt(y / 50) * 50;
  
  $("p#debug").html("in find touch position. calculated all the values");
  return {x: x, 
          y: y,
          closestX: closestX,
          closestY: closestY,
          }
}

function debugPrintObject(anObject) {
  var debugEle = $("p#debug");
  debugEle.html("inspecting object:");
  
  $.each(anObject, function(key, value) {
    debugEle.html("\n" + key + ":" + value);
  });
}

function renderAll(wipeTop) {
  if (wipeTop === true) {
    var topContext = _$top[0].getContext("2d");
    _$top[0].width = _$top[0].width;
    topContext.clearRect(0, 0, 1250, 1250);
  }
  
  //get the context of the canvas where we are drawing the players, wipe it clean
  var mapContext = _$canvas[0].getContext("2d");
  mapContext.clearRect(0, 0, 1250, 1250);
  _$canvas[0].width = _$canvas[0].width;
  
  //render all _positions on middle canvas
  $.each(_positions, function(index, imageObj) {
    if (!imageObj || !imageObj.source || !imageObj.coords) {
      //should return true, and continue drawing other objects
      return delete _positions[index];
    }
    
    var img = new Image();
    img.src = imageObj.source;
    
    img.onload = function() {
      mapContext.drawImage(img, imageObj.coords.x, imageObj.coords.y);
    }
  });
  
  return false;
}

function tileImageOnCanvas(image, canvas) {
  var context = $(canvas)[0].getContext("2d"),
      imgHeight = image.height,
      imgWidth = image.width,
      canvasHeight = canvas.height,
      flipY = new Image(),
      flipX = new Image();
  
  //draw image at x, y s.t. x % 2 == 0 && y % 2 == 0
  context.drawImage(image, 0, 0);
  
  flipY.className = "flip-horizontal";
  flipY.src = image.src;
  flipY.onload = function() {
    //draw the horizontally flipped images
    //ie: x % 2 == 0 and y % 2 == 1
    context.drawImage(flipY, 0, imgHeight);
  }
  
  flipX.className = "flip-vertical";
  flipX.src = image.src;
  flipX.onload = function() {
    //draw the vertically flipped images
    //ie: x % 2 == 1 && y % 2 == 0
    context.drawImage(flipX, imgWidth, 0);
  }
}