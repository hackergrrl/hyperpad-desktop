var bel = require('bel')
var morph = require('morphdom')

module.exports = function (onSelected) {

  var docs = []
  var selectedIdx = -1
  var element = renderList(docs, selectedIdx)

  element.updateDocs = function (items) {
    docs = items
    update()
  }

  element.updateSelection = function (idx) {
    selectDoc(docs[idx], idx)
  }

  return element

  function update () {
    morph(element, renderList(docs, selectedIdx))
  }

  function renderList (elms, selected) {
    var extra = [renderCreateDocRow(), renderAddDocRow()]
    return bel`<div class="doclist">
      ${extra.concat(elms.map(function (elm, i) {
        return renderListDoc(elm, i, selected === i)
      }))}
      </div>`
  }

  function renderCreateDocRow () {
    return bel`<div class="docitem-special" onclick=${onClickCreate}>
      <div class="docitem-contents">Create new pad</div>
      </div>`
  }

  function renderAddDocRow () {
    return bel`<div class="docitem-special" onclick=${onClickAdd}>
      <div class="docitem-contents">Add pad from hash</div>
      </div>`
  }

  function renderListDoc (elm, i, selected) {
    var clazz = 'docitem'
    if (selected) clazz = 'docitem-selected'
    return bel`<div class="${clazz}" onclick=${onClick}>
      <div class="docitem-contents">${elm}</div>
    </div>`
    function onClick () {
      selectDoc(docs[i], i)
    }
  }

  function onClickCreate () {
    onSelected('&create')
  }

  function onClickAdd () {
    onSelected('&add')
  }

  function selectDoc (elm, i) {
    selectedIdx = i
    update()
    onSelected(elm)
  }
}
