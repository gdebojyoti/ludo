import React, { PureComponent } from 'react'
import autoBind from 'auto-bind'

import { getRollByNumber, getNextPosition } from '../helpers/generic'

import '../styles/views/home'

class HomeView extends PureComponent {
  constructor () {
    super()
    this.state = {
      currentPosition: 0
    }

    autoBind(this)
    window.testFunc = this.movePieceToPosition

    this.spacesLeft = 0 // number of spaces left for the selected piece to move by
    this.interval = null // variable for setting & clearing interval
  }

  componentDidMount () {
    this.setState({
      currentPosition: 110
    })
  }
  
  // trigger dice roll; fetch random number from dice; move selected piece to appropriate position
  rollDice () {
    // exit if turn is in progress
    if (this.spacesLeft > 0) {
      return
    }
    const rollByNumber = getRollByNumber()
    this.movePieceBy(rollByNumber)
    console.log("rollin' by", rollByNumber)
  }

  // logic using which a selected piece moves by a given number of spaces
  movePieceBy (spaces) {
    this.spacesLeft = spaces
    this.interval = setInterval(() => {
      const { currentPosition } = this.state
      this.movePieceToPosition(getNextPosition(currentPosition))

      this.spacesLeft--
      console.log(this.spacesLeft, this.interval)
      
      if (this.spacesLeft <= 0 && this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    }, 400)
  }

  // move selected piece to a certain position
  movePieceToPosition (id) {
    if (id !== undefined) {
      this.setState({
        currentPosition: id
      })
    }
  }

  render () {
    const { currentPosition } = this.state
    
    return <div>
      <h1>Ludo - a PWA.</h1>
      <Grid />

      <Player position={currentPosition} />

      <Dice onClick={this.rollDice} />
    </div>
  }
}

const Dice = ({ onClick }) => {
  return <button onClick={onClick}>Roll dice!</button>
}

const Grid = () => {
  return <div className='grid'>
    <Quadrant className='quadrant--red' id='1' />
    <Quadrant className='quadrant--blue' id='4' />
    <Quadrant className='quadrant--yellow' id='3' />
    <Quadrant className='quadrant--green' id='2' />

    <Center />
  </div>
}

const Quadrant = props => {
  const { className, id } = props
  const divClass = 'quadrant' + (className ? ' ' + className : '')
  return <div className={divClass}>
    <div className='quadrant__home'></div>
    <div className='quadrant__rows'>
      <Row id='3' quadrantId={id} />
      <Row id='2' quadrantId={id} />
      <Row id='1' quadrantId={id} />
    </div>
  </div>
}

const Row = props => {
  const { id, quadrantId } = props
  const cells = []
  for (let i = 0; i < 6; i++) {
    cells.push(<Cell key={i} id={`${quadrantId}${id}${i}`} />)
  }
  return <div className='quadrant__row'>
    { cells }
  </div>
}

const Cell = ({ id }) => {
  return <div className='quadrant__cell' id={id}>{id}</div>
}

const Center = () => {
  return <div className='grid__center'></div>
}

const Player = ({ position }) => {
  const elm = document.getElementById(position)
  const style = {}
  if (elm) {
    const rect = elm.getBoundingClientRect()
    style.transform = `translate(${rect.x + 20}px, ${rect.y + 15}px)`
  }

  return <div className='player' id='player' style={style}></div>
}

export default HomeView