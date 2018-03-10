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

var app = choo()
app.use(function (state, emitter) {
  state.documents = []
  state.selectedDocumentIdx = -1
  state.editingDocumentTitle = false

  setTimeout(function () {
    state.editor = new Quill('#editor', {
      modules: { toolbar: '' },
      theme: 'snow'
    })
  }, 500)

  refreshDocList()

  function refreshDocList () {
    getLocalDocs(function (err, docs) {
      if (err) throw err
      state.documents = docs
      emitter.emit('render')
    })
  }

  emitter.on('createDocument', function () {
    console.log('event: createDocument')
    createDocument(refreshDocList)
  })

  emitter.on('addDocument', function (hash) {
    console.log('event: addDocument')
    addDocument(hash)
  })

  emitter.on('selectDocument', function (i) {
    state.selectedDocumentIdx = i
    emitter.emit('render')
    selectDocument(state, emitter, state.documents[i].hash, state.editor)
  })

  emitter.on('gotDocumentTitle', function (title) {
    state.documents[state.selectedDocumentIdx].title = title
    emitter.emit('render')
  })

  emitter.on('clickDocumentTitle', function () {
    state.editingDocumentTitle = true
    emitter.emit('render')
    setTimeout(function () { document.getElementById('doc-title').focus() }, 150)
  })
  emitter.on('setDocumentTitle', function (title) {
    state.editingDocumentTitle = false
    if (!title) emitter.emit('render')
    else {
      state.currentDoc.setTitle(title, function () {
        emitter.emit('render')
      })
    }
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
        ${renderDocumentTitle(state, emit)}
        ${renderEditor()}
      </div>
    </body>
  `
}

function renderDocumentTitle (state, emit) {
  if (state.editingDocumentTitle) {
    return html`
      <input class="doc-title-input" type="text" id="doc-title" onkeyup=${onKeyPress} value="${getDocumentTitle(state)}" onblur=${onBlur}>
    `
  } else {
    return html`
      <h1 id="doc-title" onclick=${onClick}>${getDocumentTitle(state)}</h1>
    `
  }

  function onClick () {
    console.log('clicky')
    emit('clickDocumentTitle')
  }

  function onKeyPress (ev) {
    if (ev.keyCode === 27) {
      emit('setDocumentTitle', null)
    } else if (ev.keyCode === 13) {
      console.log('title', this.value)
      emit('setDocumentTitle', this.value)
    }
  }

  function onBlur () {
    emit('setDocumentTitle', null)
  }

  function getDocumentTitle (state) {
    if (state.selectedDocumentIdx >= 0) return state.documents[state.selectedDocumentIdx].title
    else return ''
  }
}

function renderEditor () {
  var editorElement = document.createElement("div")
  editorElement.id = 'editor'
  editorElement.style.height = (window.innerHeight - 100) + 'px'
  editorElement.style.width = (window.innerWidth - 0) + 'px'
  editorElement.classList.add('editor')
  editorElement.style['font-family'] = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace'
  editorElement.isSameNode = function (target) {
      return (target && target.nodeName && target.nodeName === 'DIV')
  }
  return editorElement
}

function createDocument (cb) {
  var name = randomBytes(20).toString('hex')
  var userDataPath = ipc.sendSync('get-user-data-path')
  var docPath = path.join(userDataPath, name)
  var db = level(docPath)
  var str = hstring(db)
  // TODO: break this out into hyper-doc module (named document)
  str.log.append({type: 'id', name}, function (err) {
    db.close(cb)
  })
}

function addDocument () {
  alert('TODO: implement me')
}

function selectDocument (state, emitter, name, editor) {
  document.getElementById('doc-title').innerText = name
  if (state.currentDoc) {
    state.currentDoc.unregister(function () {
      var userDataPath = ipc.sendSync('get-user-data-path')
      state.currentDoc = Doc(path.join(userDataPath, name), editor, emitter)
    })
  } else {
    var userDataPath = ipc.sendSync('get-user-data-path')
    state.currentDoc = Doc(path.join(userDataPath, name), editor, emitter)
  }
}

