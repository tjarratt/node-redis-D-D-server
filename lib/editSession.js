var sessid = $("div.editId").attr("id");
sessid = sessid? sessid : 0;

$("input#newMapSubmit").click(function(e) {
	$.ajax({
		async: true,
		url: "/maps/new",
		type: "POST",
		contentType: "application/json",
		dataType: "html",
		data: {name: $("input#mapName").val(), 
					width: $("input#mapWidth").val(), 
					height: $("input#mapHeight").val(),
					id: sessid,
					aid: $("input#aid").val()},
		success: function(response) {
			if (!response || response == "false") {
				return alert("bad response ajax map creation: " + response);
			}
			$("div#mapsList").append(response);
		},
		error: function(e) {
			alert("error in ajax map creation");
		},
	});
});
var errorCallback = function(err) {
	$("p#mapLoading").html("Hmm, that wasn't quite a success. Perhaps, there is no spoon?");
	$("p#mapLoading").parent().append("<p>Details: " + err.toString() + "</p>");
}

function ajaxFileUpload(context) {
	var fileInput = $(context).parent().children(":first")[0];
	
	$.ajaxFileUpload({
    url: "/maps/" + $(fileInput).parent().attr("id") + "/upload",
    secureuri: false,
    fileElementId: $(fileInput).attr("id"),
    dataType: "text",
	  type: "POST",
		beforeSend: function() {
			$("#loading").show();
    },
		complete: function() {
			$("#loading").hide();
		},              
		success: function(result, status) {
			if(typeof(result.error) != "undefined") {
				if(result.error != "") {
					alert(result.error);
				}
				else {
					alert(result.msg);
				}
			}
			//result should be a uid
			$(context).parent().parent().children("img").attr("src", "/res/img/maps/" + result).show(); 
		},
		error: function (data, status, e) {
			alert(e);
		} 
  });
  return false;
}

function deleteThis(mapContext) {
	var mapId = mapContext.id;
	$.ajax({
		async: true,
		url: "/maps/" + mapId + "/delete",
		type: "POST",
		dataType: "json",
		success: function() {
			$("a#" + mapId).parent().remove();
		},
		error: function() {
			alert("could not delete this map.");
		}
	});
}

//get existing maps
$.ajax({
	async: true,
	url: "/maps/" + sessid,
	success: function(response) {
		response = JSON.parse(response);
		if (!response || response == "false") {
			errorCallback("I found no maps. Oh my god. What does this mean?");
		}
		
		var $list = $("div#mapsList");
		var mapHTML = $list.html();
		$list.html("");
		
		$.each(response, function(index, mapObj) {
			$list.append(mapHTML);
			var $newMapItem = $list.children("div:last");

			$newMapItem.children("a.detail").attr("href", "/maps/" + mapObj.id);
			$newMapItem.find("span.mapName").html(mapObj.name);
			$newMapItem.children("span.mapWidth").html(mapObj.width);
			$newMapItem.children("span.mapHeight").html(mapObj.height);
			$newMapItem.children("a.rm").attr("id", mapObj.id);
			$newMapItem.children("img").attr("src", mapObj.image? mapObj.image : "");
			
			//need to actually retrieve a list of maps as well
			if (!mapObj.image || mapObj.image == "null") {						
				var uploadHTML = "<input id=\'upload" + index + "\' type=\'file\' name=\'file\'/> <div class=\'clear\'></div>";
				uploadHTML += "<input type=\'submit\' onclick=\'return ajaxFileUpload(this);\' value=\'Send\'>";
				
				$newMapItem.children("div.file-uploader").attr("id", mapObj.id);
				$newMapItem.children("div.file-uploader").html(uploadHTML);
			}
			else {
				//need an interface here to delete files
				//probably just an a tag with an X img next to it
				$newMapItem.children("img").show();
				$newMapItem.children("div.file-uploader").html(mapObj.file);
			}
			
		});
		$("div#mapListHeader").show();
		$list.show();
		$("p#mapLoading").hide();
	},
	error: function(err) {
		errorCallback(err);
	}
});