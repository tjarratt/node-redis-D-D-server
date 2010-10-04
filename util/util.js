var sys = require('sys');

exports.inspect = function(obj) {
  sys.puts("inspecting : obj");
  sys.puts(sys.inspect(obj));
}