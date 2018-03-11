var html = require('choo/html')

module.exports = function (state, emit) {
  var extra = [renderCreateDocRow(), renderAddDocRow()]
  return html`
    <div class="doclist">
      ${extra.concat(state.documents.map(function (elm, i) {
        return renderListDoc(elm, i, state.selectedDocumentIdx === i, state.mouseoverDocIdx === i)
      }))}
    </div>
  `

  function renderCreateDocRow () {
    return html`<div class="docitem-special" onclick=${onClickCreate}>
      <div class="docitem-contents">Create new pad</div>
      </div>`
    function onClickCreate () {
      emit('createDocument')
    }
  }

  function renderAddDocRow () {
    return html`<div class="docitem-special" onclick=${onClickAdd}>
      <div class="docitem-contents">Add pad from hash</div>
      </div>`
    function onClickAdd () {
      emit('addDocument')
    }
  }

  function renderListDoc (elm, i, selected, mouseover) {
    var clazz = 'docitem'
    if (selected) clazz = 'docitem-selected'
    return html`<div class="${clazz}" onclick=${onClick} onmouseover=${onEnter} onmouseleave=${onExit}>
      <div class="docitem-contents">${elm.title}</div>
      ${mouseover ? renderCloseButton(i) : html``}
    </div>`
    function onClick () {
      emit('selectDocument', i)
    }
    function onEnter () {
      emit('mouseEnterDocument', i)
    }
    function onExit () {
      emit('mouseExitDocument', i)
    }
  }

  function renderCloseButton (i) {
    return html`<div class="closeButton" onclick=${onClick}>X</div>`

    function onClick () {
      emit('deleteDocument', i)
    }
  }
}
