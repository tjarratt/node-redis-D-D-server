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
             
  var canvas = $("canvas#map")[0]
  var ctx = canvas.getContext("2d");
  var img = new Image();
  img.src = "/res/img/" + _listenId + ".jpg";
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
  
  //map1 = new CanvasTextArea('map', {width: 700, height: 700});
  _$textArea = $("textarea#textArea");
  _$canvas = $("canvas#map");
  _images = [];
     
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
    
    var parentNode = (e.srcElement) ? e.srcElement.parentNode : e.target.parentNode;
    var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    
    //also need to take into account the size of the image, since we want to center the image
    //hard coding their size as 50px for now
    var x = e.clientX + scrollLeft - parentNode.offsetLeft;
    var y = e.clientY + scrollTop - parentNode.offsetTop;
    createNewImage(newImg, x, y);   
    
    return false;
  });
                       
  //prevent users from typing in this field
  _$textArea.keydown(function(e) {
    e.stopPropagation();
    return false;
  });
  
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
  
  _$canvas.handleMouseDown = function(e) {
    console.log("in mousedown within canvas");
    
    //find image
    var position = findMousePosition(e);
    
    var oImg = findTargetImage(position);
    if (!oImg) {
      return false;
    }
    
    //handle drag action
    onDragMove(e);
    
    //push it to the top canvas
    renderAll(false);
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
    
    var coords = setImageCoords(img, closestX, closestY);
    var newImage = {
      source: imgSrc,
      coords: coords,
    };
    
    //add this to the array of images
    _images.push(newImage);
  }
  
  function findMousePosition(e) {
      // srcElement = IE
      var parentNode = (e.srcElement) ? e.srcElement.parentNode : e.target.parentNode;
      var isSafari2 = ($.browser.webkit && $.browser.version < 420);
      var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
      var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      var safariOffsetLeft = (isSafari2) ? e.target.ownerDocument.body.offsetLeft + scrollLeft : 0;
      var safariOffsetTop = (isSafari2) ? e.target.ownerDocument.body.offsetTop + scrollTop : 0;
      return {
          ex: e.clientX + scrollLeft - parentNode.offsetLeft - safariOffsetLeft,
          ey: e.clientY + scrollTop - parentNode.offsetTop - safariOffsetTop,
          screenX: e.screenX,
          screenY: e.screenY
      };
  }
  
  function findTargetImage(mp, hovering) {
    hovering = hovering? hovering : false;
    // http://www.geog.ubc.ca/courses/klink/gis.notes/ncgia/u32.html
    // http://idav.ucdavis.edu/~okreylos/TAship/Spring2000/PointInPolygon.html
    
    var target = false;
    $.each(_images, function(index, image) {
        // we iterate through each image. If target found then return target
        var iLines = getImageLines(image.coords);
        var xpoints = findCrossPoints(mp, iLines);
        
        // if xcount is odd then we clicked inside the image
        // For the specific case of square images xcount == 1 in all true cases
        if (xpoints % 2 == 1 && xpoints != 0) {
            target = image;
            //reorder array
            if (!hovering) {
                images.splice(i, 1);
                images.push(target);
            }
            
            //break out of this loop
            return false;
        }
    });
    
    return target;
  }
  
  function getImageLines(coords) {
    return {
        topline: { 
            o: coords.tl,
            d: coords.tr 
        },
        rightline: { 
            o: coords.tr,
            d: coords.br 
        },
        bottomline: { 
            o: coords.br,
            d: coords.bl 
        },
        leftline: { 
            o: coords.bl,
            d: coords.tl 
        }
    }
  }
  
  function findCrossPoints(position, lines) {
    var b1, b2, a1, a2, xi, yi;
    var xcount = 0;
    var iLine = null;
    $.each(lines, function(index, iLine) {
        //iLine = oCoords[lineKey];
        // optimization 1: line below dot. no cross
        if ((iLine.o.y < position.ey) && (iLine.d.y < position.ey)) {
            return true;
        }
        // optimization 2: line above dot. no cross
        if ((iLine.o.y >= position.ey) && (iLine.d.y >= position.ey)) {
            return true;
        }
        // optimization 3: vertical line case
        if ((iLine.o.x == iLine.d.x) && (iLine.o.x >= position.ex)) { 
            xi = iLine.o.x;
            yi = mp.ey;
        }
        // calculate the intersection point
        else {
            b1 = 0; //(y2-mp.ey)/(x2-mp.ex); 
            b2 = (iLine.d.y-iLine.o.y)/(iLine.d.x-iLine.o.x); 
            a1 = position.ey-b1*position.ex;
            a2 = iLine.o.y-b2*iLine.o.x;

            xi = - (a1-a2)/(b1-b2); 
            yi = a1+b1*xi; 
        }
    
        // dont count xi < mp.ex cases
        if (xi >= position.ex) { 
            xcount += 1;
        }
        // optimisation 4: specific for square images
        if (xcount == 2) {
            return false;
        }
    });
    return xcount;
  }
  
  function onDragMove(e) {
    return false;
  }
  
  function renderAll(allOnTop) {
    if (!allOnTop) {allOnTop = false;}
    
    return false;
  }
  
  function setImageCoords(image, left, top) {
    var scalex = 1;
    
    var currentWidth = parseInt(image.width) * scalex;
    var currentHeight = parseInt(image.height) * scalex;
    var hypotenuse = Math.sqrt(Math.pow(currentWidth / 2, 2) + Math.pow(currentHeight / 2, 2));
    var angle = Math.atan(currentHeight / currentWidth);
    var theta = angle * (Math.PI/180);
    
    // offset added for rotate and scale actions
    var offsetX = Math.cos(angle + theta) * hypotenuse;
    var offsetY = Math.sin(angle + theta) * hypotenuse;

    var sinTh = Math.sin(theta);
    var cosTh = Math.cos(theta);
    
    var tl = {
        x: left - offsetX,
        y: top - offsetY
    };
    var tr = {
        x: tl.x + (currentWidth * cosTh),
        y: tl.y + (currentWidth * sinTh)
    };
    var br = {
        x: tr.x - (currentHeight * sinTh),
        y: tr.y + (currentHeight * cosTh)
    };
    var bl = {
        x: tl.x - (currentHeight * sinTh),
        y: tl.y + (currentHeight * cosTh)
    };
    // clockwise
    return { tl: tl, tr: tr, br: br, bl: bl };  
  }
  
}