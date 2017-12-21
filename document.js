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
  str.insert(null, null, 'Hello world', function () {
    str.text(function (err, text) {
      if (err) throw err
      editor.insertText(0, text)
    })
  })
}

