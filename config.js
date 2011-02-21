exports.config = 
{
	production: {url: "illegaltoaster.com", port: 8000},
	debug: {url: "butter3.local", port: 8000}
}

exports.debug = function() {
  return this.config.debug;
}

exports.prod = function() {
  return this.config.production;
}
