var level = require('level')
var path = require('path')
var fs = require('fs')
var ipc = require('electron').ipcRenderer

// TODO: create level & read hash & latest title(s)
module.exports = function (cb) {
  var userDataPath = ipc.sendSync('get-user-data-path')
  fs.readdir(userDataPath, function (err, contents) {
    if (err) return cb(err)
    cb(null, contents)
  })
}

