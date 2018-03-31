var Quill = require('quill')
var Doc = require('./document')
var renderDocumentList = require('./document-list')
var localDocs = require('./local-docs')
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

  // Load up initial doc list
  localDocs.list(function (err, docs) {
    if (err) throw err
    state.documents = docs
    emitter.emit('render')
  })

  emitter.on('createDocument', function () {
    localDocs.create(function (err, hash) {
      state.documents.unshift({ hash: hash, title: hash })
      emitter.emit('selectDocument', 0)
    })
  })

  emitter.on('addDocument', function (hash) {
    state.documents.unshift({ hash: hash, title: hash })
    localDocs.add(hash)
    emitter.emit('selectDocument', 0)
  })

  emitter.on('deleteDocument', function (i) {
    localDocs.del(i, function () {
      state.documents.splice(i, 1)
      if (state.selectedDocumentIdx === i) {
        state.selectedDocumentIdx--
      }
      emitter.emit('render')
    })
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

  emitter.on('mouseEnterDocument', function (i) {
    state.mouseoverDocIdx = i
    emitter.emit('render')
  })
  emitter.on('mouseExitDocument', function (i) {
    state.mouseoverDocIdx = -1
    emitter.emit('render')
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
      <div>
        <h1 id="doc-title" onclick=${onClick}>${getDocumentTitle(state)}</h1>
        <p style="float:right; margin-top: -40px;">${(state.documents[state.selectedDocumentIdx] || {hash:''}).hash}</p>
      </div>
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

function selectDocument (state, emitter, hash, editor) {
  document.getElementById('doc-title').innerText = hash
  if (state.currentDoc) {
    state.currentDoc.unregister(start)
  } else {
    start()
  }

  function start () {
    var userDataPath = ipc.sendSync('get-user-data-path')
    state.currentDoc = Doc(path.join(userDataPath, hash), hash, editor, emitter)
  }
}
