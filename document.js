var Quill = require('quill')

module.exports = function () {
  var editor = new Quill('#editor', {
    modules: { toolbar: '' },
    theme: 'snow'
  });
  var editorElement = document.getElementById('editor')
  editorElement.style.height = window.innerHeight + 'px';
  editorElement.style['font-family'] = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace'

  editor.focus()
}

