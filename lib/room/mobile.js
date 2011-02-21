// assume head.js has loaded jquery, socket.io, etc
function initMobileRoom() {
  if (!console || !console.log) {
    console = new Object();
    console.prototype.log = function(text) {
      $("p#debug").html(text);
    }
  }
  _positions = {};
  console.log("initializing mobile room for ipad");
  var touchDiv = $("div#touchHandler")[0];
  //touchDiv.addEventListener("touchstart", touchStart, false);
  //touchDiv.addEventListener("touchmove", touchMove, false);
  //touchDiv.addEventListener("touchend", touchEnd, false);
  $(window).scroll(function(e) {
    handleScrollEvent(e);
  });
  
  //set up socket handler
  //initiate web socket handler
  initSocket(_url, _websocketId);
  
  //draw current map data
  //background, shadows, annotations, map objects
  loadCanvasImages(_listenId);
  initDrawer();
  
  //need translation from other mouse-event based functions
  //chat ?
  //room info?
  //tools?
  $("img#tool_annotate")[0].addEventListener("touchend", function(e) {
    //set annotation listener on the canvas
  }, false);
  $("img#tool_shadow")[0].addEventListener("touchend", function(e) {
    //set shadowy listener on the canvas
  }, false);
  $("img#tool_erase")[0].addEventListener("touchend", function(e) {
    //set erase listener on the canvas
  }, false);
  $("img#tool_wipe")[0].addEventListener("touchend", function(e) {
    //set wipe listener on the canvas 
  }, false);
  $("img#tool_move")[0].addEventListener("touchend", function(e) {
    //set move handler on the canvas
  }, false);
  $("img#tool_delete")[0].addEventListener("touchend", function(e) {
    //set delete handler on the canvas
  }, false);
  
  $("img.playerImg").each(function(index, playerEle) {
    playerEle.addEventListener("touchend", function() {
      $("p#debug").html("touch end for playerEle")
      var touchListener = $("div#touchHandler"),
          topContext = $("canvas#top")[0].getContext("2d");
          
      function touchstart(e) {
        $("p#debug").html("touchstart for touchHandler");
        var here = findTouchPosition(e);
        $("p#message").html("hurf durf");
        $("p#message").html(playerEle.attr("id"));
        $("p#message").append("hurf durf");
      
        topContext.clearRect(0, 0, 1250, 1250);
        topContext.fillStyle = "rgba(0, 0, 0, 0.50)",
        topContext.drawImage(playerEle, here.closestX, here.closestY);
      };
          
      touchListener[0].addEventListener("touchstart", touchstart, false);
      touchListener[0].addEventListener("touchmove", touchstart, false);
      touchListener[0].addEventListener("touchend", function(e) {
        var here = findTouchPosition(e),
            key = here.closestX + "_" + here.closestY;
            image = {source: playerEle.attr("src"),
                    coords: here,
                    user: _userName};
          
        _positions[key] = image;
      }, false);
    });
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
      //scrollOffset = $(window).scrollTop(),
      //canvasOffset = $('canvas#background').offset.top;
  
  //setup menu and menu content
  $menu.css("top", 0).css("left", winWidth - 0);
  
  _open = true;
  _menu = "tools";
  
  $menuContent.css("top",-10).css("left", winWidth - 550);
  $menu.css("-webkit-transform", "translate3d(0, -530px, 0)");
  $menu.css("-webkit-transition-duration", "1.5s");
  $menuContent.css("-webkit-transform", "translate3d(0, -620px, 0)");
  $menuContent.css("-webkit-transition-duration", "1.5s");
  /*window.setTimeout(function() {
    $menu.css("-webkit-transform", "translate3d(0, -530px, 0)");
    $menu.css("-webkit-transition-duration", "1.5s");
    $menuContent.css("-webkit-transform", "translate3d(0, -620px, 0)");
    $menuContent.css("-webkit-transition-duration", "1.5s");
  }, 5500);*/
    
  $("div#menuRoom")[0].addEventListener("touchend", function(e) {
    var $menu = $("div#menuContent");
    
    if (_menu == "room" && _open) {
      _open = false;
      _menu = false;
      
      $menu.children().css("display", "none");
      $menu.css("width", "0px");
      return window.setTimeout(function() {
        $menu.children().css("display", "none");
      }, 1000);
    }
    _open = true;
    _menu = "room";
    
    $menu.children().css("display", "none");
    $menu.css("width", "250px");
    window.setTimeout(function() {
      $("div#menuContentStatus").css("display", "block");
    }, 500);
  }, false);
  
  $("div#menuPlayers")[0].addEventListener("touchend", function(e) {
    var $menu = $("div#menuContent");
    
    if (_menu == "players" && _open) {
      _open = false;
      _menu = false;
      
      $menu.children().css("display", "none");
      $menu.css("width", "0px");
      return window.setTimeout(function() {
        $menu.children().css("display", "none");
      }, 1000);
    }
    _open = true;
    _menu = "players";
    
    $menu.children().css("display", "none");
    $menu.css("width", "350px");
    window.setTimeout(function() {
      $("div#menuContentPlayers").css("display", "block");
    }, 500);
  });
  
  $("div#menuTools")[0].addEventListener("touchend", function(e) {
    var $menu = $("div#menuContent");
    
    if (_menu == "tools" && _open) {
      _open = false;
      _menu = false;
      
      $menu.children().css("display", "none");
      $menu.css("width", "0px");
      return window.setTimeout(function() {
        $menu.children().css("display", "none");
      }, 1000);
    }
    _open = true;
    _menu = "tools";
    
    $menu.children().css("display", "none");
    $menu.css("width", "500px");
    window.setTimeout(function() {
      $("div#menuContentTools").css("display", "block");
    }, 500);
  })
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
      menu = $("div#menu"),
      menuContent = $("div#menuContent"),
      oldHeight = menu.scrollTop(),
      newHeight = windowHeight + scrollTop + 100;
  
  menu.css("-webkit-transform", "translate3d(0, " + (newHeight - oldHeight - 1275) + "px, 0)");
  menu.css("-webkit-transition-duration", "0.5s");
  menuContent.css("-webkit-transform", "translate3d(0, " + (newHeight - oldHeight - 1385) + "px, 0)");
  menuContent.css("-webkit-transition-duration", "0.5s");
}

