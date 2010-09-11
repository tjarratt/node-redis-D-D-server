exports.err = function(code, message, res) {
	res.writeHead(code, {'Content-Type': 'text/plain'});
	res.end(message + '\n');
}
                       
exports.defaultCode = 500;
exports.defaultError = "An unknown error occurred. Whoops.";

exports.respondDefault = function() {
	exports.err(exports.defaultCode, exports.defaultError);
}