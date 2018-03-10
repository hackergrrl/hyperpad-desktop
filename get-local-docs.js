var level = require('level')
var path = require('path')
var fs = require('fs')
var ipc = require('electron').ipcRenderer

module.exports = function (cb) {
  var userDataPath = ipc.sendSync('get-user-data-path')
  fs.readdir(userDataPath, function (err, contents) {
    if (err) return cb(err)

    // get all titles
    var pending = contents.length
    contents.forEach(function (name, idx) {
      var db = level(path.join(userDataPath, name))
      db.get('!doc!title', function (err, title) {
        db.close(function () {
          contents[idx] = { hash: name, title: title || name }
          if (!--pending) cb(null, contents)
        })
      })
    })
  })
}
