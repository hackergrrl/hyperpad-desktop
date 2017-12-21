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
  var chars
  var localOpQueue = []
  var remoteOpQueue = []

  // HACK: a random 'remote user' that writes random text
  var rando = hstring(require('memdb')())
  var r = rando.log.replicate({live: true})
  r.pipe(str.log.replicate({live: true})).pipe(r)
  setInterval(function () {
    rando.chars(function (err, chars) {
      var pos = Math.floor(Math.random() * (chars.length-2) + 1)
      var text = (new Array(Math.floor(Math.random() * 10))).fill(0).map(function () { return String(Math.floor(Math.random() * 10)) }).join('')
      rando.insert(chars[pos].pos, chars[pos+1].pos, text)
    })
  }, 4000)

  // Receive remote edits
  str.log.on('add', function (node) {
    if (Buffer.isBuffer(node.value)) {
      var data = JSON.parse(node.value.toString())
      data.key = node.key
      console.log('remote add', data)
      remoteOpQueue.push(data)
      processQueue()
    }
  })

  str.chars(function (err, res) {
    if (err) throw err
    chars = res

    var text = chars.map(function (c) { return c.chr }).join('')
    editor.insertText(0, text)

    listenForEdits()
  })

  var queueLocked = false
  function processQueue () {
    // console.log('processQueue', localOpQueue.length)
    if (!localOpQueue.length) {
      if (remoteOpQueue.length) {
        processRemoteOps()
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
        console.log('insert', after, before, op.insert)
        str.insert(after, before, op.insert, function (err, res) {
          if (err) throw err
          // console.log('insert res', res)
          chars.splice.apply(chars, [pos, 0].concat(res))
          // console.log('chars', chars)
          next()
        })
      } else if (op.delete) {
        var from = chars[pos].pos
        var to = chars[pos + op.delete - 1].pos
        console.log('delete', from, to, op.delete)
        str.delete(from, to, function (err, res) {
          if (err) throw err
          // console.log('delete', op.delete)
          chars.splice(pos, op.delete)
          // console.log('chars', chars)
          next()
        })
      }
    })()
  }

  // XXX(sww): remember, this function MUST stay synchronous. if it becomes async, ALL CONCURRENT HELL BREAKS LOOSE
  function processRemoteOps () {
    remoteOpQueue.forEach(function (op) {
      if (op.op === 'insert') {
        // Update 'chars'
        var prev = getPosOfKey(op.prev)
        // var next = getPosOfKey(op.next)
        var newChars = op.txt.split('').map(function (chr, idx) {
          return {
            chr: chr,
            pos: op.key + '@' + idx
          }
        })
        chars.splice(prev + 1, 0, newChars)
        console.log('post-remote chars', chars)

        // Update editor
        editor.insertText(prev + 1, op.txt)
      } else if (op.op === 'delete') {
        // Update 'chars'
        var from = getPosOfKey(op.from)
        var to = getPosOfKey(op.to)
        var numToDelete = from - to
        chars.splice(from, numToDelete)
        console.log('post-remote chars', chars)

        // Update editor
        editor.deleteText(from, numToDelete)
      }
    })
    remoteOpQueue = []
  }

  function getPosOfKey (key) {
    if (!key) return 0
    for (var i = 0; i < chars.length; i++) {
      if (chars[i].pos === key) return i
    }
    throw new Error('this should not happen')
  }

  function listenForEdits () {
    editor.on('text-change', function (delta, oldDelta, source) {
      console.log('got op', delta.ops)
      localOpQueue.push(delta.ops)
      processQueue()
    })
  }
}

