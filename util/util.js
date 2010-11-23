var sys = require('sys');

exports.inspect = function(obj) {
  sys.puts("inspecting : " + obj.toString());
  sys.puts(sys.inspect(obj));
}

exports.hashResultMaybe = function(hash, value) {
  //short circuit, but be becareful if value is a bool false value like zero
  if (!hash || (!value && typeof value != "number")) {return false;}
  sys.puts("hash: " + hash);
  sys.puts("value: " + value.toString());
  
  var maybeValue = hash[value];
  maybeValue = maybeValue? maybeValue.toString('utf8') : false;
  return maybeValue;
}