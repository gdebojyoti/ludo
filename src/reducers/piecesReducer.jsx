import initialState from './initialState'

export default function (state = initialState.pieces, action) {
  switch (action.type) {
    case 'REACHED_POSITION':
      // const home = Object.assign({}, state)
      const { position } = action.payload
      console.log("reached", position)
      return state
    default:
      return state
  }
}
