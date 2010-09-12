exports.err = function(code, message, res) {
	res.writeHead(code, {'Content-Type': 'text/plain'});
	res.end(message + '\n');
}
                       
exports.defaultCode = 500;
exports.defaultError = "An unknown error occurred. Whoops.";

exports.respondDefault = function() {
	exports.err(exports.defaultCode, exports.defaultError);
}                                     

//assume these are strings for now
exports.isEmpty = function(fields) {
	var result = false;
	$.each(fields, function(obj) {
		if (!field || field.length < 1) {
			result = true;
			return false;
		}
	});
	return result;
}