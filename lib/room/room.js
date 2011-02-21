function initUnknown() {
  //need to ask for the user's name, choose an avatar
  //okay, initRoom (or some suitable subset thereof)
  //initRoom();
}
function initRoom() {
  //TODO: optimize this for users that are joining a session in progress
  //we only buffer the last 15 messages or so, so this isn't HUGE but still...
  //at some point this is going to need to handle arbitrary amounts of messages for long running sessions
  //arbitrary, but capped at 6 (players) + 6 (player positions) + 44 (other possible object slots) for a 25x25 map  
  function getPixelDataFromPosition(position) {
    var x = position.x,
        y = position.y,
        imgd = context.getImageData(x, y, width, height);
        
    return imgd.data;
  }
  
  function colorWheelMouseDown(e) {
    var position = findMousePosition(e);
    _wheelContext = $("canvas#colorwheel")[0].getContext("2d");
    _wheelContext.clearRect(0, 0, 100, 100);
    _wheelContext.beginPath();
    //x, y, radius, not sure, radians to go around (ie: diameter), not sure
    _wheelContext.arc(75, 75, 10, 0, Math.PI*2, true); 
    _wheelContext.closePath();
    _wheelContext.stroke();
    
    //update swatch
    var colorData = getPixelDataFromPosition(position),
        red = colorData[0],
        green = colorData[1],
        blue = colorData[2],
        newColor = "pink"; //chosen randomly by roll of die
    $("div#swatch").css("background-color", newColor);
    
    return;
  }
  
  function colorWheelMouseMove(e) {
    var position = findMousePosition(e);
    //update selector over canvas
    _wheelContext.clearRect(0, 0, 100, 100);
    _wheelContext.drawImage(_wheelImage, 0, 0);
    _wheelContext.arc(25, 25, 10, 0, Math.PI*2, true);
    _wheelContext.closePath();
    _wheelContext.stroke();
    //refresh swatch
    
    var colorData = getPixelDataFromPosition(position),
        red = colorData[0],
        green = colorData[1],
        blue = colorData[2],
        newColor = "pink"; //chosen randomly by roll of die
    $("div#swatch").css("background-color", newColor);
  }
  function colorWheelMouseUp(e) {
    var finalPosition = findMousePosition(e);
    //update selector over canvas
    _wheelContext.clearRect(0, 0, 100, 100);
    _wheelContext.drawImage(_wheelImage, 0, 0);
    _wheelContext.arc(55, 55, 10, 0, Math.PI*2, true);
    _wheelContext.closePath();
    _wheelContext.stroke();
    
    var newColor = getPixelDataFromPosition(finalPosition),
        red = colorData[0],
        green = colorData[1],
        blue = colorData[2],
        newColor = "pink"; //chosen randomly by roll of die
    $("div#swatch").css("background-color", newColor);
    
    //cleanup
    delete _wheelContext;
  }
  
  console.log("initializing page");
  
  if (_isDM) {
    console.log("initializing toolbar for DM");
    
    //first off let's get that color wheel working
    _wheelImage = new Image;
    _wheelImage.src = "/res/img/colorwheel.png"    
    _wheelImage.onLoad = function() {
      var $colorWheel = $("canvas#colorwheel"),
          colorWheelContext = $colorwheel[0].getContext("2d");

      colorWheelContext.drawImage(_wheelImage, 0, 0);
      $colorWheel.mousemove(colorWheelMouseMove);
      $colorWheel.mouseup(colorWheelMouseUp);
      $colorWheel.mousedown(colorWheelMouseDown);
    }
    
    var $palette = $("div#toolsContainer");
    
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
      
      _$textArea.unbind("mousedown");
      _$textArea.unbind("mousemove");
      _$textArea.unbind("mouseup");
      
      _$textArea.mousedown(function(e) {
        console.log("stopping a mouse down event in the map textarea, passing to canvas");

        e.stopPropagation();
        _$canvas.handleMouseDown(e);

        return false;
      });
      _$textArea.mousemove(textAreaMouseMove);
      _$textArea.mouseup(textAreaMouseUp);
    });
    $palette.children("input#tool_delete").click(function(e) {
      console.log("setting dmAction to delete! Oh noes.");
      _dmAction = "delete";
      _$textArea.unbind("mouseup");
      _$textArea.unbind("mousemove");
      _$textArea.unbind("mousedown");
      
      _$textArea.mouseup(function(e) {
        var position = findMousePosition(e),
            key = position.closestX + "_" + position.closestY;
        
        if (_positions[key]) {
          delete _positions[key];
          sendHandler("_delete:" + key, false);
          renderAll(false);
        }
      });
    })

    console.log("initializing map controls");
    var mapContainer = $("p#innerMapContainer");
    var gotMapsCallback = function(maps) {
      console.log("got maps for this session: " + maps);
      if (!maps) {
        return false;
      }
      $.each(maps, function(index, map) {
        var mapHTML = "";
        mapContainer.append(mapHTML);
      });
    }
    var mapsFailure = function(errors) {
      console.log("error while getting maps for this session: " + errors);
    }
    $.ajax({
      url: "/maps/" + _listenId,
      context: this,
      success: gotMapsCallback,
      failure: mapsFailure,
      type: "GET"
    });
  }//_isDM
  
  function formatPrivateChat(message) {
    console.log("showing message: " + message);
    document.getElementById("privateChat").appendChild(message);
    document.getElementById("privateChat").scrollTop = 1000000;
    return;
  }
  
  $("div#privateChat").html("");
  $("a.chatLink").each(function(index, chatlink) {
    jQuery("a#" + this.id).click(function(e) {
      //stash away contents
      console.log("clicked on chat handler");
      _chatId = this.id;
      console.log(_chatId);
      $._chatSocket = false;
      
      var initiatedChat = function(transport) {
        console.log(transport);
        $("div#privateChat").html("got history");
        
        //set up websocket for pubsub
        var chatSocket = new io.Socket(_url, {port: 8000});
        $._chatSocket = chatSocket;
        chatSocket.connect();
        chatSocket.send("chat:" + _chatId, false);
        
        console.log("connected socket, adding listeners for messages");
        chatSocket.on("message", function(data){
          //TODO: validate this is good data
          
          var obj = JSON.parse(data);

          //if the server decided to send us several messages at once, handle each one in turn
          if ("buffer" in obj){
            document.getElementById("form").style.display="block";
            document.getElementById("chat").innerHTML = "";

            for (var i in obj.buffer) formatPrivateChat(obj.buffer[i]);
          } 
          else formatPrivateChat(obj);
        });
      }
      
      $.ajax({
        url: "/chat/" + _chatId + "/history",
        context: this,
        success: initiatedChat,
        failure: function(failure) {
          $("privateChat").html("Welp.");
        }
      });
      return false;
    });
  });
                                          
  //initiate web socket handler
  initSocket(_url, _websocketId);
  
  //set the onSubmit handler for the form
  $("form#form").submit(function(e) {
    e.preventDefault(); //otherwise this submit event will cause the page to reload
    return sendHandler(document.getElementById("text").value, true);
  });

  //load images for canvas maps
  loadCanvasImages(_listenId);
  
  //an array of images and an object to hold the positions we have objects at, for quick lookup
  //TODO: we should probably use _images as hash so we aren't constantly asking for the server to load a new image when we redraw the canvas
  _images = {};
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
  		$.each(hex, function(nr, val) {
  			if ( val.length === 1 ) {
  				hex[nr] = "0" + val;
  			}
  		});
  		return hex.join("").toUpperCase();
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
    $( "#red" ).slider( "value", 0 );
    $( "#green" ).slider( "value", 0 );
    $( "#blue" ).slider( "value", 0 );
  }
  else {
    _dmAction = false;
  }
     
  //capture drop events on the text area
  _$textArea.mouseover(function(e) {
    //if this wasn't a drag event from a player image 
    if (!e.fromElement || !e.fromElement.src || !jQuery(e.fromElement).parent().attr("class") in {"playerBlock": true, "creatures": true}) {return false;}
    
    //timing issue, see if the event wrote to the text area yet
    var newImg = _$textArea.val();
    _$textArea.val("");
    
    //look for the image source in event.fromElement 
    newImg = newImg? newImg : e.fromElement.src;
    
    if (!newImg) {
      return false;
    }
    
    var position = findMousePosition(e),
        time = new Date().getTime().toString();
    
    createNewImage(newImg, position.x, position.y, time);
    
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
          sendHandler("_update:annotate", false);
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
        _shadowContext.clearRect(0, 0, 1250, 1250);
        
        var origX = Math.abs(shadowedArea.ul.xComponent.closestX);
        var origY = shadowedArea.ul.yComponent.closestY ;
        var width = Math.abs(origX - shadowedArea.br.xComponent.closestX) + 50;
        var height = Math.abs(origY - shadowedArea.br.yComponent.closestY) + 50;
        
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
        _shadowContext.clearRect(0, 0, 1250, 1250);
        
        //draw a new top level image
        finalShadowContext.fillStyle = "rgb(0, 0, 0)";
        var origX = shadowedArea.ul.xComponent.closestX;
        var origY = shadowedArea.ul.yComponent.closestY;
        var width = Math.abs(origX - shadowedArea.br.xComponent.closestX) + 50;
        var height = Math.abs(origY - shadowedArea.br.yComponent.closestY) + 50;
        
        //get number of squares from width, origin
        var drawXSquares = width / 50;
        var drawYSquares = height / 50;
        
        //finalShadowContext.fillRect(origX, origY, width, height);
        //create images for square, four sides
        var squareImg = new Image,
            topImg = new Image,
            leftImg = new Image,
            rightImg = new Image,
            bottomImg = new Image;
        squareImg.src = "/res/img/shadow/square.png";
        topImg.src = "/res/img/shadow/top.png";
        leftImg.src = "/res/img/shadow/left.png";
        rightImg.src = "/res/img/shadow/right.png";
        bottomImg.src = "/res/img/shadow/bottom.png";
        var loaded = 0;
        
        $.each([squareImg, topImg, leftImg, rightImg, bottomImg], function(index, image) {
          image.onload = function() {
            loaded += 1;
            if (loaded >= 5) {
              //draw our new shadow image square by square
              for (var i = 0; i < drawXSquares; i++) {
                for (var j = 0; j < drawYSquares; j++) {
                  finalShadowContext.drawImage(squareImg, origX + i*50, origY + j *50);
                }
              }
              
              //draw swirld edges on top so we can avoid having ANOTHER canvas
              for (var i = 0; i < drawXSquares; i++) {
                finalShadowContext.drawImage(topImg, origX + (i * 50), origY - 15);
                finalShadowContext.drawImage(bottomImg, origX + (i * 50), origY + height - 5);
              }
              for (var i = 0; i < drawYSquares; i++) {
                finalShadowContext.drawImage(leftImg, origX - 15, origY + (i *50));
                finalShadowContext.drawImage(rightImg, origX + width - 5, origY + (i *50));
              }
            
              //send this image over THE WIRE as a base64 string representation of a png
              var shadowImage = Canvas2Image.saveAsPNG($("canvas#shadow")[0], true);
              var rawData = $(shadowImage).attr('src');

              var postedImageCallback = function(transport) {
                console.log("got result from posting annotate image: " + transport);
                //TODO: should check that this returns true
                //send update command to other clients
                sendHandler("_update:shadow", false);
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
            }
          }
        }); //$.each
        
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
        var shadowImage = Canvas2Image.saveAsPNG($("canvas#shadow")[0], true);
        var rawData = $(shadowImage).attr('src');
        
        var postedImageCallback = function(transport) {
          console.log("got result from posting annotate image: " + transport);
          //TODO: should check that this returns true
          //send update command to other clients
          sendHandler("_update:shadow", false);
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
      $("canvas#annotations")[0].getContext("2d").clearRect(0, 0, 1250, 1250);
      var deletedImageCallback = function(transport) {
        //send message to other clients
        sendHandler("_update:annotate", false);
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
    else if (_dmAction == "delete") {      
      _$textArea.unbind("mouseup");
      _$textArea.unbind("mousemove");
      _$textArea.unbind("mousedown");
      
      _$textArea.mouseup(function(e) {
        var position = findMousePosition(e),
            key = position.closestX + "_" + position.closestY;
        
        if (_positions[key]) {
          delete _positions[key];
          sendHandler("_delete:" + key, false);
          renderAll(false);
        }
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
      console.log(oldKey);
      _positions[oldKey] = _draggingImage;
      _draggingImage = null;
      
      return renderAll(true);
    }
    
    //update _draggingImage and re-add it to the _positions array
    var oldKey = _originalCoords.x + "_" + _originalCoords.y;
    _draggingImage.coords = {x: atPosition.closestX, y: atPosition.closestY};
    _positions[atPosition.closestX + "_" +  atPosition.closestY] = _draggingImage;
    _draggingImage = null;
    _originalCoords = null;
    
    //send this message to the server, and other clients
    sendHandler(JSON.stringify({"_move_": {from: _userName, x: atPosition.closestX, y: atPosition.closestY, oldKey: oldKey, img: _positions[key].source}}), false);
    
    //wipe the context of the top canvas and redraw
    renderAll(true);
  }
  
  function createNewImage(imgSrc, x, y, name) {
    console.log("creating a new image from src: " + imgSrc);
    console.log("at x: " + x + " y: " + y);
    
    //find the closest center point to here
    //the closest x, y value will be a multiple of 50
    //add 25 so we can center the image
    var closestX = parseInt(x / 50) * 50;
    var closestY = parseInt(y / 50) * 50;
    console.log("closest point is ...");
    console.log("x: " + closestX + " y: " + closestY);
    
    sendHandler("_add_x:" + closestX + ",y:" + closestY + ",src:" + imgSrc, false);
        
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
    _images[name] = newImage;
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
    //_draggingImage.coords.x = position.x - 25;
    //_draggingImage.coords.y = position.y - 25;
    
    var image = new Image();
    image.src = _draggingImage.source;
    
    image.onload = function() {
      //wipe and redraw the top canvas layer
      _$top[0].width = _$top[0].width;
    
      var ctx = _$top[0].getContext("2d");
      ctx.clearRect(0, 0, 1250, 1250);
      ctx.drawImage(image, position.x - 25, position.y - 25);
    };
  }
}
function initDrawer() {
  //get height, width
  var height = window.innerHeight,
      width = window.innerWidth,
      $tabView = $("#tabbedView"),
      $tabContent = $("#tabbedContentArea");
      
  //push drawer and tab view down to bottom of screen
  $tabView.css("top", height - 30);
  $tabView.css("width", width);
  $tabView.css("height", "50px");
  
  $tabContent.css("top", height);
  $tabContent.css("width", width);
  
  //setup event handler for onclick tabs
  _showDrawer = false;
  _tab = false;
  $("div.tabItem").click(function(e) {
    console.log("clicked on tab item.");
    
    function handleTabItemClick(theTab, height) {
      if (_showDrawer && _tab == theTab) { _showDrawer = false; }
      else { _showDrawer = true; }
      
      if (_showDrawer) {
        var desiredHeight = height? height : "300px";
        $("div#tabbedContentArea").children().css("height", "0px").css("display", "none");
        $("div#" + theTab + "Container").css("height", desiredHeight).css("display", "block");
        $("#tabbedContentContainer").css("height", desiredHeight);
        $("#discloseItem").html("<p>V</p>");
        _tab = theTab;
      }
      else {
        $("#tabbedContentContainer").css("height", "75px");
        $("discloseItem").html("<p>/\\</p>");
      }
    }
    var handler = {
      discloseItem: function() {
        //show / hide drawerArea
        _showDrawer = !_showDrawer;
        
        if (!_tab) {
          _tab = "room";
          return handleTabItemClick(_tab);
        }
        
        console.log("hide show drawer");
        if (_showDrawer) {
          _tab == "chat" ? $("#tabbedContentContainer").css("height", "500px") : $("#tabbedContentContainer").css("height", "300px");
          $("#discloseItem").html("<p>V</p>");
        }
        else {
          $("#tabbedContentContainer").css("height", "75px");
          $("#discloseItem").html("<p>/\\</p>");
        }
      },
      mapsItem: function() {
        console.log("showing map area");
        handleTabItemClick("maps");
      },
      chatItem: function() {
        console.log("showing chat area");
        handleTabItemClick("chat", "500px");
      },
      whisperItem: function() {
        console.log("showing whisper area");
        handleTabItemClick("whisper");
      },
      toolsItem: function() {
        console.log("showing tools area for DM");
        handleTabItemClick("tools");
      },
      roomItem: function() {
        console.log("showing room info");
        handleTabItemClick("room");
      }
    };
    handler[this.id]();
  });
  
  //make visible
  $tabView.css("visibility", "visible");
}