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
    str.text(function (err, text) {
      if (err) throw err
      editor.insertText(0, text)
      listenForEdits()
    })

  function listenForEdits () {
    // TODO: lock editor until changes are processed
    editor.on('text-change', function (delta, oldDelta, source) {
      var pos = 0
      var opIdx = 0
      ;(function next (err) {
        if (err) throw err
        var op = delta.ops[opIdx]
        if (!op) return
        opIdx++

        str.chars(function (err, chars) {
          if (err) throw err
          // console.log('chars', chars)

          if (op.retain) {
            pos += op.retain
            next()
          }
          if (op.insert) {
            var after = pos > 0 ? chars[pos - 1].pos : null
            var before = pos < chars.length ? chars[pos].pos : null
            // console.log('insert', after, before, op.insert)
            str.insert(after, before, op.insert, next)
          }
        })
      })()

      if (source == 'api') {
        console.log("An API call triggered this change.");
      } else if (source == 'user') {
        console.log("A user action triggered this change.");
      }
    })
  }
}

