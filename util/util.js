var sys = require('sys');

exports.inspect = function(obj) {
  sys.puts("inspecting : " + obj.toString());
  sys.puts(sys.inspect(obj));
}