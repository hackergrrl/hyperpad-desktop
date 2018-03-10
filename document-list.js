var html = require('choo/html')

module.exports = function (state, emit) {
  var extra = [renderCreateDocRow(), renderAddDocRow()]
  return html`
    <div class="doclist">
      ${extra.concat(state.documents.map(function (elm, i) {
        return renderListDoc(elm, i, state.selectedDocumentIdx === i)
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

  function renderListDoc (elm, i, selected) {
    var clazz = 'docitem'
    if (selected) clazz = 'docitem-selected'
    return html`<div class="${clazz}" onclick=${onClick}>
      <div class="docitem-contents">${elm.title}</div>
    </div>`
    function onClick () {
      emit('selectDocument', i)
    }
  }
}
