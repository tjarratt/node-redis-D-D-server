//create prototypical convastext area obj
function CanvasTextArea(id, oConfig) {
	Canvas.Element.prototype.init.call(this, id, oConfig);	
}
CanvasTextArea.prototype = new Canvas.Element("tmp", { width: 300, height: 100 });
CanvasTextArea.prototype.constructor = CanvasTextArea;

CanvasTextArea.prototype.draggedImages = 0;
CanvasTextArea.prototype.showcorners = false;

CanvasTextArea.prototype._initEvents = function() {
	$("textarea#textArea").value = "";
	var tArea = $("textarea#textArea");
	var self = this;
	tArea.onmousedown = function(e) { self.onMouseDown.call(self, e) };
	// FF2 (mac), SF2 (local)
	tArea.onmouseup = function(e) { self.onMouseUp.call(self, e) };
	tArea.onmousemove = function(e) { self.onMouseMove.call(self, e) };
	// SF3 (local), FF2 (win), FF3 (win)
	tArea.onmouseover = function(e) { self.onMouseOver.call(self, e); };
	// SF3 (remote)
	tArea.ondragover = function(e) { self.onDragOver.call(self, e); };

	// For safari 3 (remote). Keep track of the mouse position through the drag over event 
	// and insert the image as soon as the content of the text area changes
	var old_ta = $("textarea#textArea").value;
	var interval = setInterval(function() {
		if ($("textarea#textArea").value != old_ta) {
			if (dmp) { 
				var imgUrl = $("textarea#textArea").value;
				if (imgUrl != "") {

					var evt = document.createEvent("MouseEvents");
					evt.initMouseEvent("mouseup", true, true, window, 0, dmp.screenX, dmp.screenY, dmp.ex, dmp.ey, false, false, false, false, 0, null);				
					// tArea.dispatchEvent(evt);

				  var img = document.createElement("img");
				  img.src = imgUrl;
				  img.onload = (function() {
				    img.id = "dImg" + self.draggedImages;

				    $("div#content_div").appendChild(img);
				    self.addImage(new Canvas.Img(img, { top: dmp.ey, left: dmp.ex, angle: 0, cornersize: 3 }));   
				    self.draggedImages += 1;
					}).call(self);
					$("textarea#textArea").value = "";
				}
				dmp = "";
				Canvas.Element.prototype.onMouseUp.call(self, evt);
			}
			old_ta = $("textarea#textArea").value;
		}
	}, 100);
};

CanvasTextArea.prototype.setCursor = function(mp, targetImg) {
	var tArea = $("textarea#textArea");
	if (!targetImg) {
		tArea.style.cursor = "default";
	}
	else { 
		var corner = this.findTargetCorner(mp, targetImg);
		if (!corner) {
			tArea.style.cursor = "move";
		}
		else {
			if(corner == "tr") {
				tArea.style.cursor = "ne-resize";
			}
			else if(corner == "br") {
				tArea.style.cursor = "se-resize";
			}
			else if(corner == "bl") {
				tArea.style.cursor = "sw-resize";
			}
			else if(corner == "tl") {
				tArea.style.cursor = "nw-resize";
			}									
			else {
				tArea.style.cursor = "default";
			}
		}
	}
};


CanvasTextArea.prototype.onMouseDown = function(e) {
	e.stopPropagation();	
	Canvas.Element.prototype.onMouseDown.call(this, e);
};

CanvasTextArea.prototype.onMouseUp = function(e) {
	var imgUrl = $("textarea#textArea").value;
	if (imgUrl != "") {
		this.loadNewImg(e, imgUrl);
		$("textarea#textArea").value = "";
	}
	Canvas.Element.prototype.onMouseUp.call(this, e);
};

CanvasTextArea.prototype.onMouseOver = function(e) {
	var imgUrl = $("textarea#textArea").value;
	// URL is pasted twice in FF2 (win). Avoid it.
	if (imgUrl.indexOf("\n") !== 0) imgUrl = imgUrl.split("\n")[0];
	if (imgUrl != "") {
		this.loadNewImg(e, imgUrl);
		$("textarea#textArea").value = "";
	}
	dmp = "";
	Canvas.Element.prototype.onMouseUp.call(this, e);
};

CanvasTextArea.prototype.onDragOver = function(e) {
	dmp = this.findMousePosition(e);
};

CanvasTextArea.prototype.loadNewImg = function(e, imgUrl) {
	loadingImg = true;
	var mp = this.findMousePosition(e);
	var img = document.createElement("img");
	img.src = imgUrl;
	img.onload = (function() {
		img.id = "dImg" + this.draggedImages;
		$("div#content_div").appendChild(img);
		this.addImage(new Canvas.Img(img, { top: mp.ey, left: mp.ex, angle: 0, cornersize: 3 }));   
		this.draggedImages += 1;
		loadingImg = false;
	}).call(this);
};