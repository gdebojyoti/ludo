export function fetchItemFromArrayWithKey (array = [], key = '', value) {
  let itemToBeFetched = null
  array.forEach(item => {
    if (item && item[key] && item[key] === value) {
      itemToBeFetched = item
    }
  })

  return itemToBeFetched
}
