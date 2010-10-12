function initRoom() {
  function handleMovement(obj) {
    console.log("not implemented yet");
  }

  function message(obj){
    var el = document.createElement("p");
    if ("announcement" in obj) el.innerHTML = "<em>" + esc(obj.announcement) + "</em>";
    else if ("message" in obj) el.innerHTML = "<b>" + esc(obj.message[0]) + ":</b>" + esc(obj.message[1]);
    else if ("_move_" in obj) {
      return handleMovement(obj);
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
      if (!msg) {message({ message: ["you", val] });}
      document.getElementById("text").value = "";
    }

    function esc(msg){
      return msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    io.setPath("/");
    var socket = new io.Socket("localhost", {port: 8080});
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
  		ctx.lineTo(i * 50 + 50);
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

  var players = $("img.player");
  players[0].style.top = 0;
  players[0].style.left = 0;

  //initialize some basic values
  _matching = false;    
  
  //jquery objects for the textarea and main canvas area
  _$textArea = $("textarea#textArea");
  _$canvas = $("canvas#map");
  _$background = $("canvas#background");
  _$top = $("canvas#top");
  
  //an array of images and an object to hold the positions we have objects at, for quick lookup
  _images = [];
  _positions = [];
  _draggingImage = null;
     
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
    
    $("input#text").focus();
    return false;
  });
  
  //capture teh event here, pass it to the canvas
  _$textArea.mousedown(function(e) {
    console.log("stopping a mouse down event in the map textarea, passing to canvas");
    
    e.stopPropagation();
    _$canvas.handleMouseDown(e);
    
    return false;
  });
  
  //pass mousemove events from textarea to canvas, if applicable
  _$textArea.mousemove(function(e) {
    e.stopPropagation();
    
    if (_draggingImage != null) {
      console.log("dragging an image...");
      onDragMove(findMousePosition(e));
    }
    return false;
  });
  
  _$canvas.handleMouseDown = function(e) {
    console.log("in mousedown within canvas");
    
    //find image
    var position = findMousePosition(e);
    var key = position.closestX + "_" + position.closestY;
    
    var oImg = _positions[key];
    if (!oImg) {
      console.log("found no image stored at (" + position.x + ", " + position.y + ")");
      return false;
    }
    
    //stash this away for now
    _draggingImage = oImg;
    
    //remove this object for now, so we don't draw it
    _positions[key] = null;
    
    //handle drag action
    onDragMove(position);
    
    //push it to the top canvas
    renderAll();
  }
  
  _$canvas.handleMouseUp = function(e) {
    //find the closest position
    var atPosition = findMousePosition(e);
    
    //update _draggingImage and re-add it to the _positions array
    _draggingImage.coords = {x: atPosition.closestX, y: atPosition.closestY};
    _positions.push(_draggingImage);
    _draggingImage = null;
    
    //wipe the context of the top canvas and redraw
    renderAll();
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
      var y = e.clientX + scrollLeft - parentNode.offsetLeft;

      //return actual x, y positions, the center of the nearest grid, and the location on screen
      //TODO: are we going to use screenX, screenY?
      return {
          x: x,
          y: y,
          closestX : parseInt(x / 50) * 50,
          closestY : parseInt(y / 50) * 50,
          screenX: e.screenX,
          screenY: e.screenY
      };
  }
  
  //update image
  function onDragMove(position) {
    _draggingImage.coords.x = position.x;
    _draggingImage.coords.y = position.y;
    
    var image = new Image();
    image.src = _draggingImage.source;
    
    //wipe and redraw the top canvas layer
    _$top[0].width = _$top[0].width;
    
    var ctx = _$top[0].getContext("2d");
    ctx.drawImage(image, position.closestX, position.closestY);
  }
  
  function renderAll() {    
    //get the context of the canvas where we are drawing the players, wipe it clean
    var mapContext = _$canvas[0].getContext("2d");
    _$canvas[0].width = _$canvas[0].width;
    
    //render all _positions on middle canvas
    $.each(_positions, function(index, imageObj) {
      mapContext.drawImage(imageObj.src, imageObj.coords.x, imageObj.coords.y);
    });
    
    return false;
  }
  
}