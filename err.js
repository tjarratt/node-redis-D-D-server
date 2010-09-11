exports.err = function(code, message) {
	res.writeHead(code, {'Content-Type': 'text/plain'});
	res.end(message + '\n');
}