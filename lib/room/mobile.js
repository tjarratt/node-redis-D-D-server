// assume head.js has loaded jquery, socket.io, etc
function initMobileRoom() {
  console.log("initializing mobile room for ipad");
  var touchDiv = $("div#touchHandler")[0];
  //touchDiv.addEventListener("touchstart", touchStart, false);
  //touchDiv.addEventListener("touchmove", touchMove, false);
  //touchDiv.addEventListener("touchend", touchEnd, false);
  $(window).scroll(function(e) {
    $("p#message").html("scrolled!");
    handleScrollEvent(e);
  });
  
  //set up socket handler
  //initiate web socket handler
  initSocket(_url, _websocketId);
  
  //draw current map data
  //background, shadows, annotations, map objects
  loadCanvasImages(_listenId);
  
  //need translation from other mouse-event based functions
  //drag elements to map
  //chat ?
  //room info?
  //tools?
  // all in canvas?
  
  _players = {"fiyin" : "/res/img/Tokens4.png", 
              "oscar" : "/res/img/Tokens5.png", 
              "joe" : "/res/img/Tokens6.png", 
              "jen" : "/res/img/creatures/monster9.png", 
              "tim" : "/res/img/Tokens.png"}
  _menuImages = {"creatures" : "/res/img/creatures/creatures.png",
            "tools" : "/res/img/palette.png"}
  _images = {};
  
  var fiyinImg = new Image;
  fiyinImg.src = _players["fiyin"];
  _images.fiyin = fiyinImg;
  
  var oscarImg = new Image;
  oscarImg.src = _players["oscar"];
  _images.oscar = oscarImg;
  
  var joeImg = new Image;
  joeImg.src = _players["joe"];
  _images.oscar = joeImg;
  
  var jenImg = new Image;
  jenImg.src = _players["jen"];
  _images.jen = jenImg;
  
  var timImg = new Image;
  timImg.src = _players["tim"];
  _images.tim = timImg;  
  
  var creatureImg = new Image,
      toolImg = new Image;
      
  creatureImg.src = _menuImages.creatures;
  toolImg.src = _menuImages.tools;
  _images.creatures = creatureImg;
  _images.tools = toolImg;
}

function initDrawer() {  
  //in a separate canvas layer, do the following
  /*
    create a drawer-looking area
    add a up/down control
    add a list of controls we will support initially
      - room info / players
      - tools
    make text on drawer open / close
      *could use touch in / touch out state on drawer menu items
    add touch handlers for player icons
    *later* add touch handlers for toolbar
    *even later* add touch handlers for tools on canvas
  */
  var $tools = $("canvas#tools"),
      toolContext = $tools[0].getContext("2d"),
      $menu = $("canvas#toolContent"),
      menuContext = $menu[0].getContext("2d");
      windowHeight = $(window).height(),
      winWidth = $(window).width();
      //scrollOffset = $(window).scrollTop(),
      //canvasOffset = $('canvas#background').offset.top;
  
  //setup menu and menu content
  $tools.css("top", windowHeight + 100).css("left", winWidth - 0);
  drawDrawerAtLocation(0, 0, toolContext);
  
  _open = false;
  _doubleTap = false;
  _doubleTapTimeoutId = 0;
  _touchAction = false;
  _menuToucher = {x: 0};
  _menuState = null;
  
  $tools[0].addEventListener("touchstart", function(e) {
    e.preventDefault();
    _menuToucher.x = e.touches[0].screenX;
    _menuToucher.y = e.touches[0].screenY;
  }, false);
  
  $tools[0].addEventListener("touchmove", function(e) {
    e.preventDefault();
    _menuToucher.x = e.touches[0].screenX;
    _menuToucher.y = e.touches[0].screenY;    
  }, false);
  
  $tools[0].addEventListener("touchend", function(e) {
    e.preventDefault();
    $("p#message").html("Touch x:" + _menuToucher.x + ", y:" + _menuToucher.y);
    
    if (_menuToucher.x >= 800 && _menuToucher < 890) { return openMenu("room"); }
    else if (_menuToucher.x >= 890 && _menuToucher.x < 950) { return openMenu("players"); }
    else if (_menuToucher.x >= 950) { return openMenu("tools"); }
  }, false);
  
  $menu.css("top", windowHeight + 40).css("left", winWidth - 550);
  $("canvas#toolHighlight").css("top", windowHeight + 40).css("left", winWidth - 550);
}

function touchStart(e) {
  e.preventDefault();
  $("p#message").html("touch start");
  
  var touches = e.touches;
}

function touchMove(e) {
  e.preventDefault();
  $("p#message").html("touch move");
  
}

function touchEnd(e) {
  e.preventDefault();
  $("p#message").html("touch ended");
}

function resetDoubleTap() {
  _doubleTap = false;
}

function resizeCanvas() {
  //resize handler for canvas
  //should empty canvas, draw grid alone
  //redraw elements on resize end + window.setTimeout? seems fairly safe
}

function handleScrollEvent(event) {
  //remove any existing timeouts that will redraw the canvas
  //clear canvas, set timeout to redraw it
  var windowHeight = $(window).height(),
      scrollTop = $(window).scrollTop(),
      newHeight = windowHeight + scrollTop + 100;
  
  $("canvas#tools").css("top", newHeight);
  $("canvas#toolContent").css("top", newHeight + 160);
  $("canvas#toolHighlight").css("top", windowHeight + 160);
}

function drawDrawerAtLocation(x, y, context) {
  if (!validArgs(x,y)) { throw Exception; }//will fail on x or y == 0, which is acceptable
  
  context.fillStyle = "grey";
  context.fillRect(x, y, 600, 90);
  
  context.fillStyle = "brown";
  context.fillRect(x + 15, y + 15, 570, 60);
  
  context.font = "bold 15px sans-serif";
  context.fillStyle = "black";
  context.fillText("room info", x + 25, y + 50);
  context.fillText("players", x + 125, y + 50);
  context.fillText("tools", x + 225, y + 50);
}

/*$("canvas").click(function(e) {
  openMenu("tools"); //tools, players, room
});*/

function openMenu(menuItem) {  
  var context = $("canvas#toolContent")[0].getContext("2d");
  context.clearRect(0, 0, 950, 300);
  
  //close when the same menu is touched twice
  if (menuItem == _menuState) { $("p#message").html("close menu"); _menuState = null; return; }
  
  _menuState = menuItem;
  context.fillStyle = "grey";
  context.fillRect(0, 0, 950, 300);
  context.font = "bold 15px sans-serif";
  context.fillStyle = "black";
  
  $("p#message").html(menuItem + ":" + _menuState + "\n");
  
  switch(menuItem) {
    case "room":
      $("p#message").append(":room info");
      context.fillText("nothing to report.", 150, 50);
      //draw any relevant messages here
      //remove ontouch handler
      return;
    case "players":
      $("p#message").html("");
      
      x = 5;
      $.each(_players, function(name, src) {
        $("p#message").append(":" + name);
        context.drawImage(_images[name], x, 5);
        context.fillText(name, x + 5, 65);
        x += 75;
      });
      
      //update on touch handler
      _toolBarListener.setPlayerListener();
      
      return;
    case "tools":
      $("p#message").append(":tools");
      context.drawImage(_images.creatures, 10, 90);
      context.drawImage(_images.tools, 10, 10);
      
      _toolBarListener.setToolListener();
      return;
    default:
      return $("p#messages").html("touched unknown menu item");
  }
}

_playerToucher = {
  dispatch: function(touch) {
    var context = $("canvas#toolContent")[0].getContext("2d"),
        nodeX = touch.x - $("canvas#toolContent").offset().left,
        outLineX = Math.floor(nodeX / 50);
      
    context.fillStyle = "red";
  
    context.fillRect(outLineX, 5, 50, 50);
    context.clearRect(outLineX + 10, 15, 40, 40);
  },
}

_toolToucher = {
  dispatch: function(touch) {
    var context = $("canvas#toolContent")[0].getContext("2d"),
        nodeX = touch.x - $("canvas#toolContent").offset().left,
        outLineX = Math.floor(nodeX / 30);
  
    context.fillStyle = "red";
  
    if (touch.y > 40) {
      //creatures
      context.fillRect(outLineX, 5, 30, 30);
      context.clearRect(outLineX + 5, 10, 25, 25);
      
      _tools.selectCreature(outLineX);
    }
    else {
      switch (outLineX) {
        case 0: 
          _tools.touch();
        case 1:
          _tools.annotate();
        case 2:
          _tools.erase();
        case 3:
          _tools.shadow();
        case 4:
          _tools.wipe();
        case 5:
          _tools._delete();
      }
    
    }
  },
}

_toolBarListener = {
  _currentListeners : {"touchstart" : null, "touchmove" : null, "touchend" : null},
  _currentTouch : {x: 0, y: 0},
  removeCurrentListener: function() {
    var canvas = $("canvas#toolContent")[0];
    
    canvas.removeEventListener("touchstart", this._currentListeners.touchstart, false);
    canvas.removeEventListener("touchmove", this._currentListeners.touchmove, false);
    canvas.removeEventListener("touchend", this._currentListeners.touchend, false);
    
    return canvas;
  },
  setCoordsFromTouch : function(touch) {
    this._currentTouch.x = touch.screenX;
    this._currentTouch.y = touch.screenY;
  },
  setPlayerListener: function() {
    var canvas = this.removeCurrentListener(),
        touchstart = function(e) {
          e.preventDefault();
          this.setCoordsFromTouch(e.touches[0]);
        },
        touchmove = function(e) {
          e.preventDefault();
          this.setCoordsFromTouch(e.touches[0]);
        },
        touchend = function(e) {
          e.preventDefault();
          _
          _playerToucher.dispatch(this._currentTouch);
        }
    
    canvas.addEventListener("touchstart", touchstart, false);
    canvas.addEventListener("touchmove", touchmove, false);
    canvas.addEventListener("touchend", touchend, false);
  },
  setToolListener: function() {
    var canvas = this.removeCurrentListener(),
        touchstart = function(e) {
          e.preventDefault();
        },
        touchmove = function(e) {
          e.preventDefault();
        },
        touchend = function(e) {
          e.preventDefault();
        }  

    canvas.addEventListener("touchstart", touchstart, false);
    canvas.addEventListener("touchmove", touchmove, false);
    canvas.addEventListener("touchend", touchend, false);
  }
}

_tools = {
  _currentListeners: {
    background: {canvas: $("canvas#background")}, 
    shadow: {canvas: $("canvas#shadow")}, 
    shadowDrag: {canvas: $("canvas#shadowDrag")}, 
    map: {canvas: $("canvas#map")},
    top: {canvas: $("canvas#top")},
    annotations: {canvas: $("canvas#annotations")},
    touch: {}
  },
  board: {},
  resetListeners: function() { //TODO: all of the current listeners need to have touchstart, touchmove, touchend properties
    $.each(this._currentListeners, function(index, listener) {
      listener.canvas[0].removeEventListener("touchstart", listener.touchstart, false);
      listener.canvas[0].removeEventListener("touchmove", listener.touchmove, false);
      listener.canvas[0].removeEventListener("touchend", listener.touchend, false);
    });
  },
  selectCreature : function(which) {
    //event listeners for tap on the board
    var canvas = this._currentListeners.map.canvas,
        top = this._currentListeners.top.canvas[0].getContext("2d");
        context = canvas[0].getContext("2d"),
        touchstart = function(e) {
          //draw object on that square on the top layer
        },
        touchmove = function(e) {
          //clear, update object position
        },
        touchend = function(e) {
          //clear top layer, push down to map layer and add to objects
        };
    
    _tools._currentListeners.map.touchstart = touchstart;
    _tools._currentListeners.map.touchmove = touchmove;
    _tools._currentListeners.map.touchend = touchend;
    
    canvas.addEventListener("touchstart", touchstart, "false");
    canvas.addEventListener("touchmove", touchmove, "false");
    canvas.addEventListener("touchend", touchend, "false");
  },
  touch: function() {
    this._currentListeners.background.canvas[0].addEventListener("touchstart", function(e) {
      //start dragging image
      var position = {x: e.touches[0].clientX, y: e.touches[0].clientY},
          key = position.x + "_" + position.y,
          maybeBoardObject = _tools.touch.board[key];
          
      if (maybeBoardObject && maybeBoardObject.owner && maybeBoardObject.image) {
        _tools._currentListeners.touch.image = maybeBoardObject;
        _tools._currentListeners.touch.coords = position;
      }
      
    });
    this._currentListeners.background.canvas[0].addEventListener("touchmove", function(e) {
      //update dragged image location
      var canvas = _tools._currentListeners.top.context;
    });
    this._currentListeners.background.canvas[0].addEventListener("touchend", function(e) {
      //set down dragged image
    });
  },
  annotate: function() {
    this._currentListeners.annotations.canvas[0].addEventListener("touchstart", function(e) {
      var context = _tools._currentListeners.annotations.canvas[0].getContext("2d"),
          touchStart = e.touches[0],
          position = {x: touchStart.clientX, y: touchStart.clientY},
          currentHexValue = "black";
      
      context.fillStyle = "#" + currentHexValue;
      context.strokeStyle = "#" + currentHexValue;
      _tools._currentListeners.annotations.context = context;
      _tools._currentListeners.annotations.lastPosition = {x: position.clientX, y: position.clientY};
    });
    this._currentListeners.annotations.canvas[0].addEventListener("touchmove", function(e) {
      var context = _tools._currentListeners.annotations.context,
          position = _tools._currentListeners.annotations.lastPosition;
      
      context.moveTo(lastPosition.x, lastPosition.y);
      context.lineTo(position.x, position.y);
      context.stroke();
      context.fill();
      
      _tools.annotations.lastPosition = {x: position.clientX, y: position.clientY}
    });
    this._currentListeners.annotations.canvas[0].addEventListener("touchend", function(e) {
      _tools._currentListeners.annotations.position = {};
    });
  },
  erase: function() {
    this._currentListeners.annotations.canvas[0].addEventListener("touchstart", function(e) {
      //set up context for erase
      if (!_tools._currentListeners.annotations.context) {
        _tools._currentListeners.annotations.context = _tools._currentListeners.annotations.canvas[0].getContext("2d");
      }
    }, false);
    this._currentListeners.annotations.canvas[0].addEventListener("touchmove", function(e) {
      
    }, false);
    this._currentListeners.annotations.canvas[0].addEventListener("touchend", function(e) {
      
    }, false);
  },
  shadow: function() {
    this._currentListeners.shadowDrag.canvas[0].addEventListener("touchstart", function(e) {
      //set up context for shadow drag
      _tools._currentListeners.shadowDrag.context = _tools._currentListeners.shadowDrag.canvas[0].getContext("2d");
    }, false);
    this._currentListeners.shadowDrag.canvas[0].addEventListener("touchmove", function(e) {
      //update shadow
      
      var updatedPoint = findTouchPosition(e);
      var shadowedArea = getShadowArea(_shadowStartPt, updatedPoint);
      var shadowContext = _tools._currentListeners.shadowDrag.context;
      
      //clear the canvas context
      shadowContext.clearRect(0, 0, 1250, 1250);
      
      var origX = Math.abs(shadowedArea.ul.xComponent.closestX);
      var origY = shadowedArea.ul.yComponent.closestY ;
      var width = Math.abs(origX - shadowedArea.br.xComponent.closestX) + 50;
      var height = Math.abs(origY - shadowedArea.br.yComponent.closestY) + 50;
      
      //debug
      console.log("drawing a new shadow from: " + origX + ", " + origY + " to: " + shadowedArea.br.xComponent.closestX + ", " + shadowedArea.br.yComponent.closestY);
      console.log(origX + ", " + origY + " / " + width + " x " + height);
      
      //find teh current spot, draw a new (relatively) clear rect
      shadowContext.fillStyle = "rgba(0, 0, 0, 0.75)";
      shadowContext.fillRect(origX, origY, width, height);
    }, false);
    this._currentListeners.shadowDrag.canvas[0].addEventListener("touchend", function(e) {
      //set up context for drawing real shadow
      var lastPoint = findTouchPosition(e),
          shadowedArea = getShadowArea(_shadowStartPt, lastPoint)
          finalShadowContext = $("canvas#shadow")[0].getContext("2d");
      
      //clear off the last image we had
      _tools._currentListeners.shadowDrag.context.clearRect(0, 0, 1250, 1250);
      
      //draw a new top level image
      finalShadowContext.fillStyle = "rgb(0, 0, 0)";
      var origX = shadowedArea.ul.xComponent.closestX;
      var origY = shadowedArea.ul.yComponent.closestY;
      var width = Math.abs(origX - shadowedArea.br.xComponent.closestX) + 50;
      var height = Math.abs(origY - shadowedArea.br.yComponent.closestY) + 50;
      
      //get number of squares from width, origin
      var drawXSquares = width / 50;
      var drawYSquares = height / 50;
      
      //we can probably pre-load these images along with other images
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
    }, false);
  },
  wipe: function() { //wiping shadow
    this._currentListeners.shadow.canvas[0].addEventListener("touchstart", function(e) {
      //set up context for shadow drag
    }, false);
    this._currentListeners.shadow.canvas[0].addEventListener("touchmove", function(e) {
      //update shadow
      var shadowContext = $("canvas#shadow")[0].getContext("2d");
      var position = findMousePosition(e);
      
      //suspect we'll actually want to draw a semi-opaque white rectangle instead
      shadowContext.clearRect(position.closestX, position.closestY, 50, 50);
    }, false);
    this._currentListeners.shadow.canvas[0].addEventListener("touchend", function(e) {
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
    }, false);    
  },
  _delete: function() {
    this._currentListeners.map.canvas[0].addEventListener("touchstart", function(e) {
      //set up context drawing touch indicator
      //draw first indicator on board
    }, false);
    this._currentListeners.map.canvas[0].addEventListener("touchmove", function(e) {
      //update touch indicator
    }, false);
    this._currentListeners.map.canvas[0].addEventListener("touchend", function(e) {
      var position = findTouchPosition(e),
          key = position.x + "_" + position.y;
      
      if (_positions[key]) {
        delete _positions[key];
        sendHandler("_delete:" + key, false);
        renderAll(false);
      }
    }, false);
  }
}