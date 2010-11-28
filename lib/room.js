function initRoom() {
  function parseMovement(movement) {
    //expecting something like x:%d,y:%d
    //return {x: %d, y: %d}
    var moveString = movement[1];
    var x = moveString.substring(moveString.indexOf("x:") + 2, moveString.indexOf("y:") - 1);
    var y = moveString.substring(moveString.indexOf("y:") + 2, moveString.length);
    
    return {from: movement[0], coords: {x: x, y: y}}
  }
  
  //TODO: optimize this for users that are joining a session in progress
  //we only buffer the last 15 messages or so, so this isn't HUGE but still...
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
      //TODO: instead of wiping out what's there, we should allow either
      //allow objects to exist in the same square and have some ui to SHOW this
      //or not allow this at all
      _positions[key] = {source : src.attr('src'), coords: coords, user: moveInfo.from};
      
      //render top scene
      //TODO : WHAT HAPPENS IF YOU ARE IN THE MIDDLE OF A DRAG HERE
      renderAll(false);
    }
    return moveInfo;
  }

  function message(obj){
    var showMessage = true;
    var el = document.createElement("p");
    if ("announcement" in obj) {
      el.innerHTML = "<em>" + esc(obj.announcement) + "</em>";
      
      if (obj.username && obj.imageName) {
        console.log(obj.username + " has joined with image: " + obj.imageName);
        $("div#players").append("<img id='player_" + esc(obj.username) + "' src=" + esc(obj.imageName) + " />");
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
        annotateContext.clearRect(0, 0, 700, 700);
        annotateContext.drawImage(img, 0, 0);
        annotateContext.stroke();
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
        shadowContext.clearRect(0, 0, 700, 700);
        shadowContext.drawImage(img, 0, 0);
        shadowContext.stroke();
      }
    }
    
    if (showMessage) {
      document.getElementById("chat").appendChild(el);
      document.getElementById("chat").scrollTop = 1000000;
    }
  }

  function send(msg, shouldDisplay){
    shouldDisplay = (shouldDisplay && msg.indexOf("/") < 0)? shouldDisplay : false;
    
    var val = msg? msg : document.getElementById("text").value;
		console.log("trying to send message: " + val);
		                        
		//short circuit
		if (!val) {return false;}
    
    //send the message off, only display locally if this came from chat
    socket.send(val);
    if (shouldDisplay) {message({ message: ["you", val] });}
    document.getElementById("text").value = "";
  }

  function esc(msg){
    return msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  
  console.log("initializing page");
  
  if (_isDM) {
    console.log("initializing toolbar for DM");
    var $palette = $("div#dmPalette");
    
    //TODO: as we add more tools, this is going to get more complicated
    //should just set the correct mouse events for _$textArea instead
    $palette.children("input#tool_annotate").click(function(e) {
      console.log("setting dmAction to annotate");
      _dmAction = "annotate"; //line drawing tool
    });
    
    $palette.children("input#tool_shadow").click(function(e) {
      console.log("setting dmAction to shadow");
      _dmAction = "shadow"; //drag squares over the grid to hide them
    });
    
    $palette.children("input#tool_erase").click(function(e) {
      console.log("setting dmAction to erase");
      _dmAction = "erase"; //erase shadows for now
    });
    
    $palette.children("input#tool_wipe").click(function(e) {
      console.log("setting dmAction to wipe");
      _dmAction = "wipe"; //wipe annotations (and shadows?)
    });
    
    $palette.children("input#tool_move").click(function(e) {
      console.log("setting dmAction to false for char movement");
      _dmAction = false;
    })
  }
  
  //TODO: validate this url
  if (!_url) {
    _url = "butter3.local";
    $("h2").html("This may not work, don't seem to have a websocket URL to connect to.");
  }
  
  console.log("got url: " + _url);

  io.setPath("/");
  var socket = new io.Socket(_url, {port: 8080});
  socket.connect();
  console.log("connected socket, adding listeners for messages");
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
  socket.send("ID:" + _websocketId, false);
  
  //set the onSubmit handler for the form
  $("form#form").submit(function() {
    send(document.getElementById("text").value, true);
    return false;
  });

  $("div#text").focus();
             
  //draw the map on the background layer, instead of where we have the players
  var canvas = $("canvas#background")[0]
  var ctx = canvas.getContext("2d");
  
  //create image to draw on the background map layer
  var img = new Image();
  var imgSrc = _default ? "default" : _listenId;
  imgSrc = "/res/img/" + imgSrc + ".jpg";
  img.src = imgSrc;
  
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
  		
	  	//add some letters and numbers to the grid
	  	ctx.font = "bold 12px sans-serif";
	  	ctx.fillText(String.fromCharCode(64 + i), i * 50 - 25, 15);
	  	ctx.fillText(i.toString(), 15, i * 50 - 25);
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
  
  //draw any annotations or shadows on the board now
  var shadowContext = $("canvas#shadow")[0].getContext("2d");
  var annotateContext = $("canvas#annotations")[0].getContext("2d");
  var shadowImg = new Image();
  shadowImg.src = "/res/img/shadow/" + _listenId + ".png";
  var annotateImg = new Image();
  annotateImg.src = "/res/img/annotate/" + _listenId + ".png";
  
  shadowImg.onload = function() {
    shadowContext.drawImage(shadowImg, 0, 0);
  }
  annotateImg.onload = function() {
    annotateContext.drawImage(annotateImg, 0, 0);
  }
  
  //an array of images and an object to hold the positions we have objects at, for quick lookup
  _images = [];
  _positions = {};
  _draggingImage = null;
  if (_isDM) {
    _dmAction = "annotate";
    function hexFromRGB(r, g, b) {
  		var hex = [
  			r.toString( 16 ),
  			g.toString( 16 ),
  			b.toString( 16 )
  		];
  		$.each( hex, function( nr, val ) {
  			if ( val.length === 1 ) {
  				hex[ nr ] = "0" + val;
  			}
  		});
  		return hex.join( "" ).toUpperCase();
  	}
  	function refreshSwatch() {
  		$( "#swatch" ).css( "background-color", "#" + getColorHexValue());
    }
    function getColorHexValue() {
      var red = $( "#red" ).slider( "value" ),
  			green = $( "#green" ).slider( "value" ),
  			blue = $( "#blue" ).slider( "value" );
  			
  		return hexFromRGB( red, green, blue );
    }
		$( "#red, #green, #blue" ).slider({
  			orientation: "horizontal",
  			range: "min",
  			max: 255,
  			value: 127,
  			slide: refreshSwatch,
  			change: refreshSwatch
		});
		$( "#red" ).slider( "value", 255 );
		$( "#green" ).slider( "value", 140 );
		$( "#blue" ).slider( "value", 60 );
  }
  else {
    _dmAction = false;
  }
     
  //capture drop events on the text area
  _$textArea.mouseover(function(e) {
    //if this wasn't an event with a fromElement src, short circuit
    if (!e.fromElement || !e.fromElement.src || $(e.fromElement).parent().attr("id") != "players") {return false;}
    
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
      if (_isDM && _dmAction) {
        this.handleDMaction(position);
      }
      
      return false;
    }
    if (oImg.user != _userName && !_isDM) {
      console.log("sorry you can't move this piece - its not yours.");
      return;
    }
    
    //stash this away for now
    _draggingImage = oImg;
    _originalCoords = oImg.coords;
    
    //remove this object for now, so we don't draw it
    delete _positions[key] 
    
    //handle drag action
    onDragMove(position);
    
    //push it to the top canvas
    renderAll(false);
  }
  
  _$canvas.handleDMaction = function(initialPoint) {   
    if (_dmAction == "annotate") {
      var annotationContext = $("canvas#annotations")[0].getContext("2d");
      var currentHexValue = getColorHexValue();
      annotationContext.fillStyle = "#" + currentHexValue;
      annotationContext.strokeStyle = "#" + currentHexValue;
      
      _lastPosition = initialPoint;
      _annotationContext = annotationContext;
      
      _$textArea.mousemove(function(e) {
        console.log("mouse moved while annotating");
        if (!_annotationContext) {
          console.log("no annotation context, short circuit");
          return false;
        }
        
        var position = findMousePosition(e);
        var currentHexValue = getColorHexValue();
        
        _annotationContext.fillStyle = "#" + currentHexValue;
        _annotationContext.strokeStyle = "#" + currentHexValue;
        
        _annotationContext.moveTo(_lastPosition.x, _lastPosition.y);
        _annotationContext.lineTo(position.x, position.y);
        _annotationContext.stroke();
        _annotationContext.fill();
        
        _lastPosition = position;
      });
      
      _$textArea.mouseup(function(e) {
        console.log("mouse up while annotating");
        
        var end = findMousePosition(e);
        _annotationContext.beginPath();
        _annotationContext.moveTo(_lastPosition.x, _lastPosition.y);
        _annotationContext.lineTo(end.x, end.y);
        _annotationContext.stroke();
        _annotationContext.fill();
        
        //revert listeners
        console.log("reverting listeners");
        _$textArea.unbind("mousemove");
        _$textArea.unbind('mouseup');
        /*_$textArea.mousemove(textAreaMouseMove);
        _$textArea.mouseup(textAreaMouseUp);*/
        
        //send this image over THE WIRE as a base64 string representation of a png
        var image = Canvas2Image.saveAsPNG($("canvas#annotations")[0], true);
        var rawData = $(image).attr('src');
        
        var postedImageCallback = function(transport) {
          console.log("got result from posting annotate image: " + transport);
          //TODO: since this send function is being used so frequently, it would be nice to build a more official protocol on top of the send()
          send("_update:annotate", false);
        }
        
        //TODO: I'd like to include this in the prototype for objects that make ajax requests
        var failure = function(transport) {
          //revert canvas
          //display an unobstrusive error message
        }
        
        $.ajax({
          url: "/update/" + _listenId + "/annotate",
          context: this,
          success: postedImageCallback,
          failure: failure,
          type: "POST",
          data: {"b64image": rawData}
        });
        
        _lastPosition = false;
        _annotationContext = false;
      });
    }
    else if (_dmAction == "shadow"){
      console.log("shadow time!");
      _shadowContext = $("canvas#shadowDrag")[0].getContext("2d");
      _shadowContext.fillStyle = "black";
      _shadowStartPt = initialPoint;
         
      _$textArea.mousemove(function(e) {
        console.log("mouse moved while shadowing");
        if (!_shadowContext) {
          console.log("no context for drawing shadow, short circuiting.");
          return false;
        }
        
        var updatedPoint = findMousePosition(e);
        var shadowedArea = getShadowArea(_shadowStartPt, updatedPoint);
        
        //clear the canvas context
        _shadowContext.clearRect(0, 0, 700, 700);
        
        var origX = shadowedArea.ul.xComponent.closestX;
        var origY = shadowedArea.ul.yComponent.closestY;
        var width = Math.abs(origX - shadowedArea.br.xComponent.closestX);
        var height = Math.abs(origY - shadowedArea.br.yComponent.closestY);
        
        //debug
        console.log("drawing a new shadow from: " + origX + ", " + origY + " to: " + shadowedArea.br.xComponent.closestX + ", " + shadowedArea.br.yComponent.closestY);
        console.log(origX + ", " + origY + " / " + width + " x " + height);
        
        //find teh current spot, draw a new (relatively) clear rect
        _shadowContext.fillStyle = "rgba(0, 0, 0, 0.75)";
        _shadowContext.fillRect(origX, origY, width, height);
        
      });
      //define a function that captures the mouseup event so we can end this madness 
      _$textArea.mouseup(function(e) {
        console.log("mouse up while shadowing");
        var lastPoint = findMousePosition(e);        //update the end point
        var shadowedArea = getShadowArea(_shadowStartPt, lastPoint);
        
        var finalShadowContext = $("canvas#shadow")[0].getContext("2d");
        //clear off the last image we had
        _shadowContext.clearRect(0, 0, 700, 700);
        
        //draw a new top level image
        finalShadowContext.fillStyle = "rgb(0, 0, 0)";
        var origX = shadowedArea.ul.xComponent.closestX;
        var origY = shadowedArea.ul.yComponent.closestY;
        var width = Math.abs(origX - shadowedArea.br.xComponent.closestX);
        var height = Math.abs(origY - shadowedArea.br.yComponent.closestY);
        
        finalShadowContext.fillRect(origX, origY, width, height);
        //TODO: at some point it would be nice to replace a harsh rectangle with a more cloud-inspired border (fog of war?)
        
        //send this image over THE WIRE as a base64 string representation of a png
        var shadowImage = Canvas2Image.saveAsPNG($("canvas#shadow")[0], true);
        var rawData = $(shadowImage).attr('src');
        
        var postedImageCallback = function(transport) {
          console.log("got result from posting annotate image: " + transport);
          //TODO: should check that this returns true
          //send update command to other clients
          send("_update:shadow", false);
        }
        
        var failure = function(transport) {
          //revert canvas
          //display an unobstrusive error message
        }
        
        $.ajax({
          url: "/update/" + _listenId + "/shadow",
          context: this,
          success: postedImageCallback,
          failure: failure,
          type: "POST",
          data: {"b64image": rawData}
        });
        
        _shadowContext = false;
        _shadowStartPt = false;
        _shadowEndPt = false;
        
        _$textArea.unbind("mousemove");
        _$textArea.unbind("mouseup");
      });
    }
    else if (_dmAction == "erase") {
      _erasing = true;
      
      _$textArea.mousemove(function(e) {
        if (!_erasing) {return false;}
        
        var shadowContext = $("canvas#shadow")[0].getContext("2d");
        var position = findMousePosition(e);
        
        //suspect we'll actually want to draw a semi-opaque white rectangle instead
        shadowContext.clearRect(position.closestX, position.closestY, 50, 50);
      });
      
      _$textArea.mouseup(function(e) {
        _erasing = false;
        
        //update image
        /*var lastPoint = findMousePosition(e);        //update the end point
        var shadowedArea = getShadowArea(_shadowStartPt, lastPoint);
        
        var finalShadowContext = $("canvas#shadow")[0].getContext("2d");
        
        //draw a clear rect over the shadow canvas layer
        var origX = shadowedArea.ul.xComponent.closestX;
        var origY = shadowedArea.ul.yComponent.closestY;
        var width = Math.abs(origX - shadowedArea.br.xComponent.closestX);
        var height = Math.abs(origY - shadowedArea.br.yComponent.closestY);
        
        finalShadowContext.clearRect(origX, origY, width, height); */
        var shadowImage = Canvas2Image.saveAsPNG($("canvas#shadow")[0], true);
        var rawData = $(shadowImage).attr('src');
        
        var postedImageCallback = function(transport) {
          console.log("got result from posting annotate image: " + transport);
          //TODO: should check that this returns true
          //send update command to other clients
          send("_update:shadow", false);
        }
        
        var failure = function(transport) {
          //revert canvas
          //display an unobstrusive error message
        }
        
        $.ajax({
          url: "/update/" + _listenId + "/shadow",
          context: this,
          success: postedImageCallback,
          failure: failure,
          type: "POST",
          data: {"b64image": rawData}
        });
        
        _$textArea.unbind("mousemove");
        _$textArea.unbind("mouseup");
        
      });
    }
    else if (_dmAction == "wipe") {
      $("canvas#annotations")[0].getContext("2d").clearRect(0, 0, 700, 700);
      var deletedImageCallback = function(transport) {
        //send message to other clients
        send("_update:annotate", false);
      }
      var failure = function(e) {
        console.log("error when ajax posting to delete annotation image");
      }
      
      //tell server to delete the annotation image
      $.ajax({
        url: "/update/" + _listenId + "/annotate/delete",
        context: this,
        success: deletedImageCallback,
        failure: failure,
        type: "POST",
        data: false
      });
    }
    else {
      console.log("received unknown DM action: " + _dmAction);
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
    var key = atPosition.closestX + "_" +  atPosition.closestY;
    
    /*
    For now, instead of allowing users to put their pieces on the same square and having to deal with that UI nightmare, forbid it
    at some point this will might be useful to allow, but it's easier to opt out of it for now.
    */
    if (_positions[key]) {
      console.log("found an image at mousedown, reverting to where the dragging image originated");
      var oldKey = _originalCoords.x + "_" + _originalCoords.y;
      _positions[oldKey] = _draggingImage;
      _draggingImage = null;
      
      return renderAll(true);h
    }
    
    //update _draggingImage and re-add it to the _positions array
    _draggingImage.coords = {x: atPosition.closestX, y: atPosition.closestY};
    _positions[atPosition.closestX + "_" +  atPosition.closestY] = _draggingImage;
    _draggingImage = null;
    
    //send this message to the server, and other clients
    send("_move_x:" + atPosition.closestX + ",y:" + atPosition.closestY, false);
    
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
    
    send("_move_x:" + closestX + ",y:" + closestY, false);
        
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
  
}