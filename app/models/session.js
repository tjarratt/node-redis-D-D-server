/*
  A session is a room, that users can join
  a session should have these properties
  
  name
  default image (bool?)
  list of users
  current displayed map
  set of maps
  ID
  
  a room should have some methods (all assumed to take callbacks)
  
  getUsers()
  addUser(info)
  isActive
  makeActive
  deActiveate
  addMap(info)
  getMap(id)

*/

var redis = require('../../lib/redis-client').createClient();