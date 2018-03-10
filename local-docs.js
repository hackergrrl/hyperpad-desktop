var level = require('level')
var path = require('path')
var fs = require('fs')
var ipc = require('electron').ipcRenderer
var randomBytes = require('randombytes')
var hstring = require('hyper-string')

module.exports = {
  list: list,
  create: create
}

function create (cb) {
  var name = randomBytes(20).toString('hex')
  var userDataPath = ipc.sendSync('get-user-data-path')
  var docPath = path.join(userDataPath, name)
  var db = level(docPath)
  var str = hstring(db)

  // TODO: break this out into hyper-doc module (named document; comments; members; etc)
  str.log.append({type: 'id', id: name}, function (err) {
    db.close(function () {
      cb(null, name)
    })
  })
}

function list (cb) {
  var userDataPath = ipc.sendSync('get-user-data-path')
  fs.readdir(userDataPath, function (err, contents) {
    if (err) return cb(err)

    // get all titles
    var pending = contents.length
    contents.forEach(function (name, idx) {
      fs.stat(path.join(userDataPath, name), function (err, stats) {
        if (err) throw err
        console.log('ctime', name, stats.birthtime)
        var db = level(path.join(userDataPath, name))
        db.get('!doc!title', function (err, title) {
          db.close(function () {
            contents[idx] = { hash: name, title: title || name, ctime: stats.birthtime }
            if (!--pending) {
              // sort entries by local modification time
              contents.sort(function (a, b) {
                return b.ctime - a.ctime
              })
              cb(null, contents)
            }
          })
        })
      })
    })
  })
}
