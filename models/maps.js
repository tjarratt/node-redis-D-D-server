var client = require('lib/redis-client');

exports.create = function(owner, name, id) {
	return {
		'owner' : owner,
		'filename' : name,
		'id' : id
	}
}

exports.find = function(owner) {
	client.llen(owner + "/maps", function(e, length) {
		client.lrange(owner + "/maps", 0, length, function(e, list) {
			return list;
		});
	});
}

exports.get = function(id) {
	client.lrange(owner + "/maps", 0, 100, function(e, list) {
		var found;
		_.each(list, function(value, key, list) {
			if (value.id == id) {
				found = value;
				_.loopBreak();
			}
		});
		return found;
	})	
}