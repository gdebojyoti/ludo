export function fetchItemFromArrayWithKey (array = [], key = '', value) {
  let itemToBeFetched = null
  array.forEach(item => {
    if (item && item[key] && item[key] === value) {
      itemToBeFetched = item
    }
  })

  return itemToBeFetched
}

// return a random number between 1 & 6
export function getRollByNumber () {
  return 2
}

export function getNextPosition (currentPosition) {
  // XYZ: quadrant ID = X; remaining: YZ
  // calculate quadrant ID & remaining
  const quadrantId = Math.floor(currentPosition / 100)
  const remaining = currentPosition % 100

  let nextPosition = 0
  
  if (remaining >= 10 && remaining < 15) {
    nextPosition = currentPosition + 1
  } else if (remaining === 15) {
    nextPosition = quadrantId * 100 + 25
  } else if (remaining === 25) {
    nextPosition = quadrantId * 100 + 35
  } else if (remaining > 30 && remaining <= 35) {
    nextPosition = currentPosition - 1
  } else if (remaining === 30) {
    nextPosition = (quadrantId + 1) * 100 + 10
    if (quadrantId === 4) {
      nextPosition -= 400
    }
  }

  return nextPosition
}