exports.create = function(owner, name, max, key) {
	return {
		'owner' : owner,
		'name' : name,
		'maxUsers' : max,
		'key' : key
	}
}