var Quill = require('quill')
var hstring = require('hyper-string')
var memdb = require('memdb')  // TODO(noffle): use real level storage

module.exports = function () {
  var editor = new Quill('#editor', {
    modules: { toolbar: '' },
    theme: 'snow'
  });
  var editorElement = document.getElementById('editor')
  editorElement.style.height = window.innerHeight + 'px';
  editorElement.style['font-family'] = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace'

  editor.focus()

  var str = hstring(memdb())
  str.insert(null, null, 'Hello world', function () {
    str.text(function (err, text) {
      if (err) throw err
      editor.insertText(0, text)
    })
  })
}

