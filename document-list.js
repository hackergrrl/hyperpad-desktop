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
    return html`<div class="docitem-special">
      <div class="docitem-contents">Add pad from hash</div>
        <div>
          <input type="text" onkeydown=${onKeyDown}></input>
        </div>
      </div>`
    function onKeyDown (e) {
      if (e.keyCode === 13) {
        var hash = this.value
        this.value = ''
        emit('addDocument', hash)
      }
    }
  }

  function renderListDoc (elm, i, selected, mouseover) {
    var clazz = 'docitem'
    if (selected) clazz = 'docitem-selected'
    return html`<div class="${clazz}" onclick=${onClick} onmouseover=${onEnter} onmouseleave=${onExit}>
      ${mouseover ? renderCloseButton(i) : html``}
      <div class="docitem-contents">
        <div class="docitem-contents-top">${elm.title}</div>
        <div class="docitem-contents-bottom">${state.documents[i].hash}</div>
      </div>
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
