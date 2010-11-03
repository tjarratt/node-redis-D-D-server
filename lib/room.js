function initRoom() {
  function parseMovement(movement) {
    //expecting something like x:%d,y:%d
    //return {x: %d, y: %d}
    var moveString = movement[1];
    var x = moveString.substring(moveString.indexOf("x:") + 2, moveString.indexOf("y:") - 1);
    var y = moveString.substring(moveString.indexOf("y:") + 2, moveString.length);
    
    return {from: movement[0], coords: {x: x, y: y}}
  }
  
  function handleMovement(aMove) {
    var moveInfo = parseMovement(aMove.move);
    var coords = moveInfo.coords;
    
    console.log(moveInfo.from + " moved to : [" + coords.x + ", " + coords.y + "]");
    
    if (!coords.x || !coords.y) {
      console.log("error in movement with string: " + aMove);
      return false;
    }
    
    var src = $("img#player_" + moveInfo.from);
    if (!src || src.length == 0) {
      console.log("got no jquery object for player " + moveInfo.from + ". Creating one with image " + moveInfo.imageName);
      var image = new Image;
      image.src = moveInfo.imageName;
      image.onload = function() {
        var key = coords.x + "_" + coords.y;
        _positions[key] = {source: moveInfo.imageName, coords: coords, user: moveInfo.from}
        
        renderAll(false);
      }
      
      return moveInfo;
    }
    
    $.each(_positions, function(index, position) {
      if (position.user == moveInfo.from) {
        delete _positions[index];
        return false;
      }
    });
    
    //create image, add it to _positions 
    var image = new Image;
    image.src = src.attr('src');
    image.onload = function() {
      var key = coords.x + "_" + coords.y;
      _positions[key] = {source : src.attr('src'), coords: coords, user: moveInfo.from};
      
      //render top scene
      //TODO : WHAT HAPPENS IF YOU ARE IN THE MIDDLE OF A DRAG HERE
      renderAll(false);
    }
    return moveInfo;
  }

  function message(obj){
    console.log("received: " + obj.toString());
    var el = document.createElement("p");
    if ("announcement" in obj) {
      el.innerHTML = "<em>" + esc(obj.announcement) + "</em>";
      
      if (obj.username && obj.imageName) {
        $("div#players").append("<img id='player_" + esc(obj.username) + "' src='/res/img/" + esc(obj.imageName) + ".png' />");
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
    
    document.getElementById("chat").appendChild(el);
    document.getElementById("chat").scrollTop = 1000000;
  }

  function send(msg){
    var val = msg? msg : document.getElementById("text").value;
		console.log("trying to send message: " + val);
		                        
		//short circuit
		if (!val) {return false;}
    
    //send the message off, only display locally if this came from chat
    socket.send(val);
    if (!msg && val[0] != "/") {message({ message: ["you", val] });}
    document.getElementById("text").value = "";
  }

  function esc(msg){
    return msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  
  //TODO: validate this url
  if (!_url) {
    _url = "butter3.local";
    $("h2").html("This may not work, don't seem to have a websocket URL to connect to.");
  }

  io.setPath("/");
  var socket = new io.Socket(_url, {port: 8080});
  socket.connect();
  socket.on("message", function(data){
    var obj = JSON.parse(data);

    //if the server decided to send us several messages at once, handle each one in turn
    if ("buffer" in obj){
      document.getElementById("form").style.display="block";
      document.getElementById("chat").innerHTML = "";

      for (var i in obj.buffer) message(obj.buffer[i]);
    } 
    else message(obj);
  });
    
  //after creating the socket, we need to identify ourselves
  socket.send("ID:" + _websocketId);
  
  //set the onSubmit handler for the form
  $("form#form").submit(function() {
    send();
    return false;
  });

  $("div#text").focus();
             
  //draw the map on the background layer, instead of where we have the players
  var canvas = $("canvas#background")[0]
  var ctx = canvas.getContext("2d");
  
  var img = new Image();
  var imgSrc = _default ? "default" : _listenId;
  imgSrc += ".jpg";
  img.src = "/res/img/" + imgSrc;
  
  img.onload = function(){
    ctx.drawImage(img,0,0);
    ctx.beginPath();
    //going to assume we want a 14 x 10 grid
    //(x, y)                             
    ctx.moveTo(0, 0);
  	//might it not be easier to do this with a series of transparent squares?
  	for (var i = 1; i <= 14; i ++) {
  		ctx.lineTo(i * 50, 0);
  		ctx.lineTo(i * 50, 700);
  		ctx.lineTo(i * 50 + 50, 700);
  		ctx.lineTo(i * 50 + 50, 0);
  	}
  	ctx.stroke();

  	//TODO: can we keep the stroke where it was before?
  	ctx.moveTo(0, 0);
  	for (var j = 1; j <= 14; j++) {
  		ctx.lineTo(0, j * 50);
  		ctx.lineTo(700, j*50);
  		ctx.lineTo(700, j*50 + 50);
  		ctx.lineTo(0, j*50 + 50);
  	}
  	ctx.stroke();

  	ctx.moveTo(0, 500);
  	ctx.lineTo(0,0);
  	ctx.lineTo(700, 0);
  	ctx.stroke();
  } 

  var players = $("div#players>img");
  players[0].style.top = 0;
  players[0].style.left = 0;
  
  //jquery objects for the textarea and main canvas area
  _$textArea = $("textarea#textArea");
  _$canvas = $("canvas#map");
  _$background = $("canvas#background");
  _$top = $("canvas#top");
  
  //an array of images and an object to hold the positions we have objects at, for quick lookup
  _images = [];
  _positions = {};
  _draggingImage = null;
  _dmAction = "annotate";
  _isDM = true; //TODO: revert
     
  //capture drop events on the text area
  _$textArea.mouseover(function(e) {
    //if this wasn't an event with a fromElement src, short circuit
    if (!e.fromElement || !e.fromElement.src) {return false;}
    
    //timing issue, see if the event wrote to the text area yet
    var newImg = _$textArea.val();
    _$textArea.val("");
    
    //look for the image source in event.fromElement 
    newImg = newImg? newImg : e.fromElement.src;
    
    if (!newImg) {
      return false;
    }
    
    var position = findMousePosition(e);
    createNewImage(newImg, position.x, position.y);   
    
    return false;
  });
                       
  //prevent users from typing in this field
  _$textArea.keydown(function(e) {
    e.stopPropagation();
    return false;
  });
  
  //stop any attempts by the user to push input into the textarea, put focus on the chat field for now
  _$textArea.focus(function(e) {
    e.stopPropagation();
    
    $(document).focus();
    return false;
  });
  
  //capture teh event here, pass it to the canvas
  _$textArea.mousedown(function(e) {
    console.log("stopping a mouse down event in the map textarea, passing to canvas");
    
    e.stopPropagation();
    _$canvas.handleMouseDown(e);
    
    return false;
  });

  //this is defined here, because we temporarily overwrite this listener when annotating
  textAreaMouseMove = function(e) {
    e.stopPropagation();
    
    if (_draggingImage != null) {
      console.log("dragging an image...");
      onDragMove(findMousePosition(e));
    }
    return false;
  };
  
  //pass mousemove events from textarea to canvas, if applicable
  _$textArea.mousemove(textAreaMouseMove);
  
  _$canvas.handleMouseDown = function(e) {
    console.log("in mousedown within canvas");
    
    //find image
    var position = findMousePosition(e);
    var key = position.closestX + "_" + position.closestY;
    
    var oImg = _positions[key];
    if (!oImg) {
      console.log("found no image stored at (" + position.closestX + ", " + position.closestY + ")");
      if (_isDM) {
        this.handleDMaction(position);
      }
      
      return false;
    }
    
    //stash this away for now
    _draggingImage = oImg;
    
    //remove this object for now, so we don't draw it
    delete _positions[key] 
    
    //handle drag action
    onDragMove(position);
    
    //push it to the top canvas
    renderAll(false);
  }
  
  _$canvas.handleDMaction = function(initialPoint) {
    //decide if this is an annotation, or DM tool
    if (_dmAction == "annotate") {
      var annotationContext = $("canvas#annotations")[0].getContext("2d");
      //TODO: need a color selector, we can pick red for now
      console.log("in annotate init");
      annotationContext.fillStyle = "red";
      _lastPosition = initialPoint;
      _annotationContext = annotationContext;
      
      _$textArea.mousemove(function(e) {
        console.log("mouse moved while annotating");
        
        var position = findMousePosition(e);
        _annotationContext.fillStyle = "rgba(32, 45, 21, 25)";
        
        _annotationContext.moveTo(_lastPosition.x, _lastPosition.y);
        _annotationContext.lineTo(position.x, position.y);
        _annotationContext.stroke();
        
        _lastPosition = position;
      });
      
      _$textArea.mouseup(function(e) {
        console.log("mouse up while annotating");
        
        var end = findMousePosition(e);
        _annotationContext.moveTo(_lastPosition.x, _lastPosition.y);
        _annotationContext.lineTo(end.x, end.y);
        _annotationContext.stroke();
        
        //revert listeners
        _$textArea.mousemove(textAreaMouseMove);
        _$textArea.mouseup(textAreaMouseUp);
        
        //send this image over THE WIRE        
        var image = Canvas2Image.saveAsJPEG($("canvas#annotations")[0], true);
        //alternatively, ajax post it and then send the url afterwards... but that's wasteful
        
        _lastPosition = false;
        _annotationContext = false;
      });
    }
    else {
      //for now we'll just shadow/unshadow the grid
      console.log("unimplemented shadow/unshadow grid call");
    }
  }
  
  textAreaMouseUp = function(e) {
    console.log("caught mouseup event in textarea");
    e.stopPropagation();
    
    _$canvas.handleMouseUp(e);
  };
  
  _$textArea.mouseup(textAreaMouseUp);
  
  //going to draw the image at its new location, send it over the wire
  _$canvas.handleMouseUp = function(e) {
    if (!_draggingImage) {
      return false;
    }
    
    //find the closest position
    var atPosition = findMousePosition(e);
    
    console.log("mouse up at position " + atPosition.x + ", " + atPosition.y);
    
    //update _draggingImage and re-add it to the _positions array
    _draggingImage.coords = {x: atPosition.closestX, y: atPosition.closestY};
    console.log("final position is " + atPosition.closestX + ", " + atPosition.closestY )
    _positions[atPosition.closestX + "_" +  atPosition.closestY] = _draggingImage;
    _draggingImage = null;
    
    //send this message to the server, and other clients
    send("_move_x:" + atPosition.closestX + ",y:" + atPosition.closestY);
    
    //wipe the context of the top canvas and redraw
    renderAll(true);
  }
  
  function createNewImage(imgSrc, x, y) {
    console.log("creating a new image from src: " + imgSrc);
    console.log("at x: " + x + " y: " + y);
    
    //find the closest center point to here
    //the closest x, y value will be a multiple of 50
    //add 25 so we can center the image
    var closestX = parseInt(x / 50) * 50;
    var closestY = parseInt(y / 50) * 50;
    console.log("closest point is ...");
    console.log("x: " + closestX + " y: " + closestY);
    
    send("_move_x:" + closestX + ",y:" + closestY);
        
    var canvas = _$canvas[0];
    var ctx = canvas.getContext("2d");
    var img = new Image();
    img.src = imgSrc;
    
    img.onload = function(){
      ctx.drawImage(img, closestX, closestY);
    }
    
    var coords = {x: closestX, y: closestY};
    var newImage = {
      source: imgSrc,
      coords: coords,
      user: _userName,
    };
    
    //add this to the array of images
    _images.push(newImage);
    //and store it for quick access in _positions
    var key = closestX + "_" + closestY;
    _positions[key] = newImage;
  }
  
  function findMousePosition(e) {
    // srcElement = IE
    var parentNode = (e.srcElement) ? e.srcElement.parentNode : e.target.parentNode;
    var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    
    var x = e.clientX + scrollLeft - parentNode.offsetLeft;
    var y = e.clientY + scrollTop - parentNode.offsetTop;

    //return actual x, y positions, the center of the nearest grid, and the location on screen
    return {
        x: x,
        y: y,
        closestX : parseInt(x / 50) * 50,
        closestY : parseInt(y / 50) * 50,
        screenX: e.screenX,     //TODO: are we going to use screenX, screenY?
        screenY: e.screenY      //maybe only include when debugging?
    };
  }
  
  //update image
  function onDragMove(position) {
    _draggingImage.coords.x = position.x - 25;
    _draggingImage.coords.y = position.y - 25;
    
    var image = new Image();
    image.src = _draggingImage.source;
    
    image.onload = function() {    
      //wipe and redraw the top canvas layer
      _$top[0].width = _$top[0].width;
    
      var ctx = _$top[0].getContext("2d");
      ctx.clearRect(0, 0, 700, 700);
      ctx.drawImage(image, position.x - 25, position.y - 25);
    };
  }
  
  function renderAll(wipeTop) {
    if (wipeTop === true) {
      var topContext = _$top[0].getContext("2d");
      _$top[0].width = _$top[0].width;
      topContext.clearRect(0, 0, 700, 700);
    }
    
    //get the context of the canvas where we are drawing the players, wipe it clean
    var mapContext = _$canvas[0].getContext("2d");
    mapContext.clearRect(0, 0, 700, 700);
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
  
}