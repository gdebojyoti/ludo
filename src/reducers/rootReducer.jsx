import {combineReducers} from 'redux'
import pieces from './piecesReducer'
import cells from './cellsReducer'

const rootReducer = combineReducers({
  pieces,
  cells
})

export default rootReducer
