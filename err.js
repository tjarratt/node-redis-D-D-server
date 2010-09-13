require("lib/underscore-min")

exports.err = function(code, message, res) {
	res.writeHead(code, {'Content-Type': 'text/plain'});
	res.end(message + '\n');
}

exports.defaultCode = 500;
exports.defaultError = "An unknown error occurred. Whoops.";

exports.respondDefault = function(response) {
	exports.err(exports.defaultCode, exports.defaultError, response);
}                                     

//assume these are strings for now
exports.isEmpty = function(fields) {
	var result = false;
	_.each(fields, function(value, key, list) {
		if (!value || value.length < 1) {
			result = true;
			_.breakLoop();
		}
	});
	return result;
}

/*
 * basic error handler object
 * provides same functionality as this module
*/ 

function errorHandler(responseObj) {
	this.response = responseObj;
}

exports.newHandler = function(response, code, message) {
	var handler = new errorHandler(response);
	
	var code = code? code : exports.defaultCode;
	var msg = message? message : exports.defaultMessage;
	
	handler.code = code;
	handler.message = msg;
	
	return handler;
}   

errorHandler.prototype.err = function(code, message) {
	var responseCode = code? code : this.code;
	var responseMsg = message ? message : this.message;
	
	this.response.writeHead(code, {'Content-Type': 'text/plain'});
	this.response.end(message + "\n");
	
	return;	
}