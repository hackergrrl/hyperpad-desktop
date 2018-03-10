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
    createDocument(refreshDocList)
  })

  emitter.on('addDocument', function (hash) {
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
        ${renderEditor(state)}
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
    emit('clickDocumentTitle')
  }

  function onKeyPress (ev) {
    if (ev.keyCode === 27) {
      emit('setDocumentTitle', null)
    } else if (ev.keyCode === 13) {
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

// TODO: can I do this in a more choo-like way?
var editorElm
function renderEditor (state) {
  if (editorElm) {
    if (state.selectedDocumentIdx >= 0) {
      editorElm.style.display = 'block'
    }
    return editorElm
  }

  var editorElement = document.createElement("div")
  editorElement.id = 'editor'
  window.onresize = function () {
    editorElement.style.height = (window.innerHeight - 80) + 'px'
  }
  editorElement.classList.add('editor')
  editorElement.style['font-family'] = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace'
  editorElement.style.display = 'none'
  editorElement.isSameNode = function (target) {
      return (target && target.nodeName && target.nodeName === 'DIV')
  }
  editorElm = editorElement
  return editorElement
}

function createDocument (cb) {
  var name = randomBytes(20).toString('hex')
  var userDataPath = ipc.sendSync('get-user-data-path')
  var docPath = path.join(userDataPath, name)
  var db = level(docPath)
  var str = hstring(db)

  // TODO: break this out into hyper-doc module (named document; comments; members; etc)
  str.log.append({type: 'id', id: name}, function (err) {
    // TODO: emit a choo-event that will focus the newly created document
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

