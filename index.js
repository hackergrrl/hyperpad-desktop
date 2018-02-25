var Quill = require('quill')
var Doc = require('./document')
var createDocumentList = require('./document-list')
var getLocalDocs = require('./get-local-docs')
var randomBytes = require('randombytes')
var hstring = require('hyper-string')
var level = require('level')
var path = require('path')
var ipc = require('electron').ipcRenderer

// TODO: turn this source file into a choo-like/bel-like component

var editor
var currentDoc
var docSidebar = createDocumentList(onSelected)
document.getElementById('left').appendChild(docSidebar)

refreshDocList(start)

function refreshDocList (cb) {
  getLocalDocs(function (err, docs) {
    if (err) throw err
    docSidebar.updateDocs(docs)
    cb()
  })
}

function start () {
  var editorElement = document.createElement("div");
  editorElement.id = 'editor'
  document.getElementById('right').appendChild(editorElement);
  editor = new Quill('#editor', {
    modules: { toolbar: '' },
    theme: 'snow'
  });
  editorElement.style.height = (window.innerHeight - 100) + 'px';
  editorElement.style.width = (window.innerWidth - 0) + 'px';
  editorElement.classList.add('editor')
  editorElement.style['font-family'] = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace'
}

function onSelected (hash) {
  console.log('SELECTED', hash)

  if (hash === '&create') {
    var hash = randomBytes(20).toString('hex')
    var userDataPath = ipc.sendSync('get-user-data-path')
    var docPath = path.join(userDataPath, hash)
    var db = level(docPath)
    var str = hstring(db)
    // TODO: break this out into hyper-doc module (named document)
    str.log.append({'doc-id': hash, 'doc-name': hash}, function (err) {
      db.close(function () {
        getLocalDocs(function (err, docs) {
          if (err) throw err
          docSidebar.updateDocs(docs)
          docSidebar.updateSelection(docs.indexOf(hash))
        })
      })
    })
  } else if (hash === '&add') {
    alert('TODO: implement me')
  } else {
    document.getElementById('doc-title').innerText = hash
    if (currentDoc) {
      currentDoc.unregister(function () {
        var userDataPath = ipc.sendSync('get-user-data-path')
        currentDoc = Doc(path.join(userDataPath, hash), editor)
      })
    } else {
      var userDataPath = ipc.sendSync('get-user-data-path')
      currentDoc = Doc(path.join(userDataPath, hash), editor)
    }
  }
}

