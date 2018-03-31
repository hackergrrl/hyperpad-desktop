var level = require('level')
var path = require('path')
var fs = require('fs')
var ipc = require('electron').ipcRenderer
var randomBytes = require('randombytes')
var hstring = require('hyper-string')

module.exports = {
  list: list,
  create: create,
  add: add,
  del: del
}

function create (cb) {
  var id = randomBytes(20).toString('hex')
  var userDataPath = ipc.sendSync('get-user-data-path')
  var docPath = path.join(userDataPath, id)
  var db = level(docPath)
  var str = hstring(db)

  // update doc list
  var docListPath = path.join(userDataPath, 'docs.json')
  var docList
  if (fs.existsSync(docListPath)) {
    docList = JSON.parse(fs.readFileSync(docListPath, 'utf8'))
  } else {
    docList = { docs: [] }
  }
  docList.docs.unshift(id)
  fs.writeFileSync(docListPath, JSON.stringify(docList), 'utf8')

  // TODO: break this out into hyper-doc module (named document; comments; members; etc)
  str.log.append({type: 'id', id: id}, function (err) {
    db.close(function () {
      cb(null, id)
    })
  })
}

function add (hash) {
  // update doc list
  var userDataPath = ipc.sendSync('get-user-data-path')
  var docListPath = path.join(userDataPath, 'docs.json')
  var docList
  if (fs.existsSync(docListPath)) {
    docList = JSON.parse(fs.readFileSync(docListPath, 'utf8'))
  } else {
    docList = { docs: [] }
  }
  docList.docs.unshift(hash)
  fs.writeFileSync(docListPath, JSON.stringify(docList), 'utf8')
}

function list (cb) {
  var userDataPath = ipc.sendSync('get-user-data-path')

  // get doc list
  var docListPath = path.join(userDataPath, 'docs.json')
  var hashes = []
  if (fs.existsSync(docListPath)) {
    hashes = JSON.parse(fs.readFileSync(docListPath, 'utf8')).docs
  }

  // get all titles
  var pending = hashes.length
  hashes.forEach(function (name, idx) {
    fs.stat(path.join(userDataPath, name), function (err, stats) {
      if (err) throw err
      var db = level(path.join(userDataPath, name))
      db.get('!doc!title', function (err, title) {
        db.close(function () {
          hashes[idx] = { hash: name, title: title || name.substring(0, 15) }
          if (!--pending) cb(null, hashes)
        })
      })
    })
  })
}

function del (idx, cb) {
  var userDataPath = ipc.sendSync('get-user-data-path')
  var docListPath = path.join(userDataPath, 'docs.json')
  if (fs.existsSync(docListPath)) {
    var json = JSON.parse(fs.readFileSync(docListPath, 'utf8'))
    json.docs.splice(idx, 1)
    fs.writeFileSync(docListPath, JSON.stringify(json), 'utf8')
    cb()
  } else {
    cb(new Error('no such doc! this shouldnt happen! aah!'))
  }
}

