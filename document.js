var Quill = require('quill')

module.exports = function () {
  var editor = new Quill('#editor', {
    modules: { toolbar: '' },
    theme: 'snow'
  });
  var editor = document.getElementById('editor')
  editor.style.height = window.innerHeight + 'px';
  editor.style['font-family'] = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace'
}
