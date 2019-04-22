import { initializePieces, initializeCells } from "../helpers/generic"

window.__INITIALSTATE__ = {
  pieces: initializePieces(),
  cells: initializeCells()
}

export default window.__INITIALSTATE__
