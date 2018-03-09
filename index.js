var Quill = require('quill')
var Doc = require('./document')
var renderDocumentList = require('./document-list')
var getLocalDocs = require('./get-local-docs')
var randomBytes = require('randombytes')
var hstring = require('hyper-string')
var level = require('level')
var path = require('path')
var ipc = require('electron').ipcRenderer

var choo = require('choo')
var html = require('choo/html')

var editor
var currentDoc

var app = choo()
app.use(function (state, emitter) {
  state.documents = []
  state.selectedDocumentIdx = -1

  setTimeout(function () {
    state.editor = new Quill('#editor', {
      modules: { toolbar: '' },
      theme: 'snow'
    })
  }, 500)

  getLocalDocs(function (err, docs) {
    if (err) throw err
    state.documents = docs
    emitter.emit('render')
  })

  emitter.on('createDocument', function () {
    console.log('event: createDocument')
    createDocument()
  })

  emitter.on('addDocument', function (hash) {
    console.log('event: addDocument')
    addDocument(hash)
  })

  emitter.on('selectDocument', function (i) {
    console.log('event: selectDocument', i)
    state.selectedDocumentIdx = i
    emitter.emit('render')
    selectDocument(state.documents[i], state.editor)
  })
})
app.route('/', mainView)
app.mount('body')

function mainView (state, emit) {
  return html`
    <body>
      <div id="left" class="left-side">
        ${renderDocumentList(state, emit)}
      </div>
      <div id="right" class="right-side">
        <h1 id="doc-title">Untitled hyperpad document</h1>
        ${renderEditor()}
      </div>
    </body>
  `
}

function renderEditor () {
  var editorElement = document.createElement("div")
  editorElement.id = 'editor'
  editorElement.style.height = (window.innerHeight - 100) + 'px'
  editorElement.style.width = (window.innerWidth - 0) + 'px'
  editorElement.classList.add('editor')
  editorElement.style['font-family'] = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace'
  return editorElement
}

function createDocument () {
  var name = randomBytes(20).toString('hex')
  var userDataPath = ipc.sendSync('get-user-data-path')
  var docPath = path.join(userDataPath, name)
  var db = level(docPath)
  var str = hstring(db)
  // TODO: break this out into hyper-doc module (named document)
  str.log.append({'doc-id': name, 'doc-name': name}, function (err) {
    db.close(function () {
      getLocalDocs(function (err, docs) {
        if (err) throw err
        docSidebar.updateDocs(docs)
        docSidebar.updateSelection(docs.indexOf(name))
      })
    })
  })
}

function addDocument () {
  alert('TODO: implement me')
}

function selectDocument (name, editor) {
  document.getElementById('doc-title').innerText = name
  if (currentDoc) {
    currentDoc.unregister(function () {
      var userDataPath = ipc.sendSync('get-user-data-path')
      currentDoc = Doc(path.join(userDataPath, name), editor)
    })
  } else {
    var userDataPath = ipc.sendSync('get-user-data-path')
    currentDoc = Doc(path.join(userDataPath, name), editor)
  }
}

