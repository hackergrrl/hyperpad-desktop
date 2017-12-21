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
  var opQueue = []

  str.chars(function (err, res) {
    if (err) throw err
    chars = res

    var text = chars.map(function (c) { return c.chr }).join('')
    editor.insertText(0, text)

    listenForEdits()
  })

  var queueLocked = false
  function processQueue () {
    // console.log('processQueue', opQueue.length)
    if (!opQueue.length) {
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

    var ops = opQueue.shift()

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
      }
      if (op.insert) {
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
      }
    })()
  }

  function listenForEdits () {
    editor.on('text-change', function (delta, oldDelta, source) {
      console.log('got op', delta.ops)
      opQueue.push(delta.ops)
      processQueue()
    })
  }
}

