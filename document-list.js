var bel = require('bel')
var morph = require('morphdom')

module.exports = function (onSelected) {

  return renderList

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
      selectDoc(elm, i)
    }
  }

  function onClickCreate () {
    console.log('create new pad')
    onSelected('create')
  }

  function onClickAdd () {
    console.log('add pad from hash')
    onSelected('add')
  }

  function selectDoc (elm, i) {
    console.log('got select', elm, i)
    morph(lst, renderList(theDocs, i))
    onSelected(elm)
  }
}
