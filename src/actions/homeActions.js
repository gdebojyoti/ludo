export default {
  movedToPosition: position => dispatch => {
    dispatch({
      type: 'TEST_ACTION',
      payload: {
        position
      }
    })
    dispatch({
      type: 'ADD_PIECE',
      payload: {
        cellId: position,
        pieceId: 1
      }
    })
  },

  startToMove: position => dispatch => {
    dispatch({
      type: 'LEAVE_CELL',
      payload: {
        cellId: position,
        pieceId: 1
      }
    })
  }
}