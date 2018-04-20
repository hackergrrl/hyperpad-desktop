var hstring = require('hyper-string')
var level = require('level')
var path = require('path')
var hindex = require('hyperlog-index')
var sublevel = require('subleveldown')
var dswarm = require('./swarm')

module.exports = function (docPath, hash, editor, emitter) {
  editor.focus()

  var db = level(docPath)
  var str = hstring(db)
  this.str = str

  var swarm = dswarm(hash, str)

  var title = docPath
  var titleIndex = hindex({
    log: str.log,
    db: sublevel(db, 'doc'),
    map: function (node, next) {
      if (node.value.type === 'title') {
        titleIndex.db.put('title', node.value.title, function (err) {
          emitter.emit('gotDocumentTitle', node.value.title)
        })
      }
      next()
    }
  })
  var index
  var chars
  var localOpQueue = []
  var remoteOpQueue = []

  titleIndex.ready(function () {
    titleIndex.db.get('title', function (err, title) {
      console.log('res', err, title)
      if (title) emitter.emit('gotDocumentTitle', title)
    })
  })

  // Receive remote edits
  str.log.on('add', function (node) {
    if (Buffer.isBuffer(node.value)) {
      var data = JSON.parse(node.value.toString())
      data.key = node.key
      // console.log('remote add', data)
      remoteOpQueue.push(data)
      processQueue()
    }
  })

  str.snapshot(function (err, res) {
    if (err) throw err

    console.log('ready!')
    index = res
    chars = index.chars()

    editor.insertText(0, index.text())

    listenForEdits()
  })

  var queueLocked = false
  function processQueue () {
    // console.log('processQueue', localOpQueue.length)
    if (!localOpQueue.length) {
      if (remoteOpQueue.length) {
        processRemoteOps()
        return
      }
      // console.log('bail: empty')
      queueLocked = false
      return
    }
    if (queueLocked) {
      // console.log('bail: locked')
      return
    }
    // console.log('gonna process')
    queueLocked = true

    var ops = localOpQueue.shift()

    var pos = 0
    var opIdx = 0
    ;(function next (err) {
      if (err) throw err
      var op = ops[opIdx]
      if (!op) {
        // console.log('done processing op')
        queueLocked = false
        processQueue()
        return
      }
      opIdx++

      if (op.retain) {
        pos += op.retain
        next()
      } else if (op.insert) {
        console.log('op.insert', pos, chars.length)
        var after = pos > 0 ? chars[pos - 1].pos : null
        var before = pos < chars.length ? chars[pos].pos : null
        str.insert(after, before, op.insert, function (err, res) {
          if (err) throw err
          var key = res[0].pos.substring(0, res[0].pos.lastIndexOf('@'))
          index.insert(after, before, op.insert, key)
          chars = index.chars()
          console.log('insert', after, before, op.insert, key)
          next()
        })
      } else if (op.delete) {
        var from = chars[pos].pos
        var to = chars[pos + op.delete - 1].pos
        console.log('delete', from, to, op.delete)
        str.delete(from, to, function (err, res) {
          if (err) throw err
          index.delete(from, to)
          chars = index.chars()
          next()
        })
      }
    })()
  }

  // XXX(sww): remember, this function MUST stay synchronous. if it becomes async, ALL CONCURRENT HELL BREAKS LOOSE
  function processRemoteOps () {
    remoteOpQueue.forEach(function (op) {
      console.log('remote op', op)
      if (op.op === 'insert') {
        // Update index
        var res = index.insert(op.prev, op.next, op.txt, op.key)
        var prev = index.pos(res[0])
        chars = index.chars()

        // Update editor
        editor.insertText(prev, op.txt, 'silent')
      } else if (op.op === 'delete') {
        // Update index
        var from = index.pos(op.from)
        var to = index.pos(op.to) + 1
        index.delete(op.from, op.to)
        var numToDelete = to - from
        chars.splice(from, numToDelete)

        // Update editor
        editor.deleteText(from, numToDelete, 'silent')
      }
    })
    remoteOpQueue = []
  }

  function listenForEdits () {
    editor.on('text-change', onTextChange)
  }

  function onTextChange (delta, oldDelta, source) {
    console.log('got op', delta.ops, source)
    localOpQueue.push(delta.ops)
    processQueue()
  }

  function unregister (cb) {
    console.log('unreg editor', editor)
    editor.deleteText(0, 99999999999, 'silent')
    editor.off('text-change', onTextChange)
    str.log.removeAllListeners()  // TODO: we can do better!
    db.close(function () {
      swarm.swarm.destroy(cb)
    })
  }

  function setTitle (name, cb) {
    str.log.append({ type: 'title', title: name }, function (err) {
      if (err) return cb(err)
      titleIndex.ready(cb)
    })
  }

  return {
    unregister: unregister,
    setTitle: setTitle
  }
}

