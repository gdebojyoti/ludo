import initialState from './initialState'

export default function (state = initialState.home, action) {
  switch (action.type) {
    case 'TEST_ACTION':
      // const home = Object.assign({}, state)
      return action.home
    default:
      return state
  }
}
