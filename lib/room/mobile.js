// assume head.js has loaded jquery, socket.io, etc
function initMobileRoom() {
  if (!console || !console.log) {
    console = new Object();
    console.prototype.log = function(text) {
      console.log("\n" + text);
    }
  }
  _positions = {};
  console.log("initializing mobile room for ipad");
  
  //handle future scroll events
  $(window).scroll(function(e) {
    handleScrollEvent(e);
  });
  
  //initiate web socket handler
  initSocket(_url, _websocketId);
  
  //draw current map data
  //background, shadows, annotations, map objects
  loadCanvasImages(_listenId);
  initDrawer();
  
  //now that the drawer has been initialized, move drawer to current location
  handleScrollEvent();
  
  _oldListeners = {};
  
  //init tools
  var $tools = $("div#menuContentTools").children(".tools");
  
  $tools.children("img#tool_annotate")[0].addEventListener("touchend", function(e) {
    //set annotation listener on the canvas
  }, false);
  $tools.children("img#tool_shadow")[0].addEventListener("touchend", function(e) {
    //set shadowy listener on the canvas
  }, false);
  $tools.children("img#tool_erase")[0].addEventListener("touchend", function(e) {
    //set erase listener on the canvas
  }, false);
  $tools.children("img#tool_wipe")[0].addEventListener("touchend", function(e) {
    //set wipe listener on the canvas 
  }, false);
  $tools.children("img#tool_move")[0].addEventListener("touchend", function(e) {
    //set move handler on the canvas
  }, false);
  $tools.children("img#tool_delete")[0].addEventListener("touchend", function(e) {
    //set delete handler on the canvas
  }, false);
  
  //handle touch event for DM monster tool
  $("img.monsterItem").each(function(index, playerEle) {
    playerEle.addEventListener("touchend", function(e) {
      handleTouchForCanvas(playerEle);
    }, false);
  });
  
  //actual players
  $("div.playerBlock").each(function(index, playerEle) {
    var playerImage = $(playerEle).children("img")[0];
    
    playerEle.addEventListener("touchend", function(e) {
      handleTouchForCanvas(playerImage);
    }, false);
  });
  
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
  var $menu = $("canvas#menu"),
      $menuContent = $("canvas#toolContent"),
      windowHeight = $(window).height(),
      winWidth = $(window).width();
  
  //setup menu and menu content
  $menu.css("top", 0).css("left", winWidth - 0);
  
  _open = true;
  _menu = "tools";
  
  $menuContent.css("top",-10).css("left", winWidth - 550);
  $menu.css("-webkit-transform", "translate3d(0, -530px, 0)");
  $menu.css("-webkit-transition-duration", "1.5s");
  $menuContent.css("-webkit-transform", "translate3d(0, -620px, 0)");
  $menuContent.css("-webkit-transition-duration", "1.5s");
  
  //these functions can be improved with underscore.js ' debounce -- wait for execution to end before calling again
  var touchendForMenuItem = function(activeElement) {
    var $menu = $("div#menuContent");
    
    if (_menu == "room" && _open) {
      _open = false;
      _menu = false;
      
      $menu.children().css("display", "none");
      $menu.css("width", "0px");
      return window.setTimeout(function() {
        if (!_open) {
          $menu.children().css("display", "none");
        }
      }, 1000);
    }
    _open = true;
    _menu = "room";
    
    $menu.children().css("display", "none");
    $menu.css("width", "250px");
    window.setTimeout(function() {
      if (_open) {
        $(activeElement).css("display", "block");
      }
    }, 500);
  }
    
  $("div#menuRoom")[0].addEventListener("touchend", function(e) {
    touchendForMenuItem($("div#menuContentStatus"));
  }, false);
  
  $("div#menuPlayers")[0].addEventListener("touchend", function(e) {
    touchendForMenuItem($("div#menuContentPlayers"));
  }, false);
  
  $("div#menuTools")[0].addEventListener("touchend", function(e) {
    touchendForMenuItem($("div#menuContentTools"));
  }, false);
}

function resizeCanvas() {
  //resize handler for canvas
  //should empty canvas, draw grid alone
  //redraw elements on resize end + window.setTimeout? seems fairly safe
  console.log("resize canvas not implemented yet.");
}

function handleScrollEvent(event) {
  //remove any existing timeouts that will redraw the canvas
  //clear canvas, set timeout to redraw it
  var windowHeight = $(window).height(),
      scrollTop = $(window).scrollTop(),
      menu = $("div#menu"),
      menuContent = $("div#menuContent"),
      oldHeight = menu.scrollTop(),
      newHeight = windowHeight + scrollTop + 100;
  
  menu.css("-webkit-transform", "translate3d(0, " + (newHeight - oldHeight - 1275) + "px, 0)");
  menu.css("-webkit-transition-duration", "0.5s");
  menuContent.css("-webkit-transform", "translate3d(0, " + (newHeight - oldHeight - 1385) + "px, 0)");
  menuContent.css("-webkit-transition-duration", "0.5s");
}

function handleTouchForCanvas(element) {
  console.log("in touch end for element: " + element);
  console.log("class:" + $(element).attr("class"));
  console.log("id: " + element.id);
  
  var canvas = $("canvas#annotations")[0],
      topContext = $("canvas#top")[0].getContext("2d"),
      _canvasTouch = {};
      
  //one of these should manage to draw the image with the desired transparency
  topContext.fillStyle = "rgba(0, 0, 0, 0.75)";
  topContext.globalCompositeOperation = "lighter";
  topContext.globalAlpha = 0.75;
      
  var touchstart = function(e) {
    e.preventDefault();
    console.log("touchstart for touchHandler");
    var here = findTouchPosition(e);
    _canvasTouch = here;
    
    console.log("drawing to board image with id:" + element.id);
    
    //don't need to clear the entire board, just the area around the touch
    topContext.clearRect(here.closestX - 50, here.closestY - 50, 100, 100);
    topContext.drawImage(element, here.closestX, here.closestY);
    console.log("finished drawing image");
  }
  var touchend = function(e) {
    e.preventDefault();
    console.log("touchend in canvas");
    var here = _canvasTouch,
        key = here.closestX + "_" + here.closestY,
        finalImage = {source: element.src,
                coords: here,
                user: _userName};
    
    console.log("omgz");
    _positions[key] = finalImage;
    renderAll(true);
    console.log("end of touch end, renderall is done");
  }
  
  addListener(canvas, "touchstart", touchstart, touchstart, _oldListeners.start);
  addListener(canvas, "touchmove", touchstart, touchstart, _oldListeners.move);
  addListener(canvas, "touchend", touchend, touchend, _oldListeners.end);
  
  _oldListeners.start = touchstart;
  _oldListeners.move = touchstart;
  _oldListeners.end = touchend;
}

function addListener(element, eventType, listener, oldListener) {
  console.log("adding listener for event:" + eventType + " for element: " + element);
  if (oldListener) { element.removeEventListener(eventType, oldListener, false); }
  
  element.addEventListener(eventType, function(e) {
    listener(e);
  }, false);
}