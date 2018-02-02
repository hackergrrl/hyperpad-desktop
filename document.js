var Quill = require('quill')
var hstring = require('hyper-string')

var level = require('level')
var path = require('path')

var ipc = require('electron').ipcRenderer

module.exports = function () {
  var editor = new Quill('#editor', {
    modules: { toolbar: '' },
    theme: 'snow'
  });
  var editorElement = document.getElementById('editor')
  editorElement.style.height = window.innerHeight + 'px';
  editorElement.style['font-family'] = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace'

  editor.focus()

  var userDataPath = ipc.sendSync('get-user-data-path')
  console.log('udp', userDataPath)
  var docId = Math.random().toString().substring(2)
  docId = 'test-doc'
  var docPath = path.join(userDataPath, docId)

  var str = hstring(level(docPath))
  var index
  var chars
  var localOpQueue = []
  var remoteOpQueue = []

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
        var res = index.delete(op.from, op.to)
        var from = index.pos(op.from)
        var to = index.pos(op.to)
        var numToDelete = from - to
        chars.splice(from, numToDelete)

        // Update editor
        editor.deleteText(from, numToDelete, 'silent')
      }
    })
    remoteOpQueue = []
  }

  function listenForEdits () {
    editor.on('text-change', function (delta, oldDelta, source) {
      console.log('got op', delta.ops)
      localOpQueue.push(delta.ops)
      processQueue()
    })
  }
}

