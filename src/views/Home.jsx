import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import autoBind from 'auto-bind'

import Grid from '../components/Grid'
import { getRollByNumber, getNextPosition, initializePieces } from '../helpers/generic'
import homeActions from '../actions/homeActions'

import '../styles/views/home'

class HomeView extends PureComponent {
  constructor () {
    super()
    this.state = {
      currentPosition: 0
    }

    autoBind(this)
    window.testFunc = this.movePieceToPosition

    this.isTurnInProgress = false
    this.spacesLeft = 0 // number of spaces left for the selected piece to move by
    this.interval = null // variable for setting & clearing interval
  }

  componentDidMount () {
    this.setState({
      currentPosition: 134
    }, () => console.log(this.state))
  }
  
  // trigger dice roll; fetch random number from dice; move selected piece to appropriate position
  rollDice () {
    // exit if turn is in progress
    if (this.isTurnInProgress) {
      return
    }
    const rollByNumber = getRollByNumber()
    this.movePieceBy(rollByNumber)
    console.log("rollin' by", rollByNumber)
  }

  // logic using which a selected piece moves by a given number of spaces
  movePieceBy (spaces) {
    const { homeActions } = this.props

    this.isTurnInProgress = true
    this.spacesLeft = spaces
    homeActions.startToMove(this.state.currentPosition)

    this.interval = setInterval(() => {
      const { currentPosition } = this.state
      this.movePieceToPosition(getNextPosition(currentPosition))

      this.spacesLeft--
      
      if (this.spacesLeft <= 0 && this.interval) {
        this.isTurnInProgress = false
        clearInterval(this.interval)
        this.interval = null
        
        homeActions.movedToPosition(this.state.currentPosition)
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

const Player = ({ position }) => {
  const elm = document.getElementById(position)
  const style = {}
  if (elm) {
    const rect = elm.getBoundingClientRect()
    style.transform = `translate(${rect.x + 20}px, ${rect.y + 15}px)`
  }

  return <div className='player' id='player' style={style}></div>
}

const mapDispatchToProps = dispatch => ({
  dispatch,
  homeActions: bindActionCreators(homeActions, dispatch)
})

export default connect(null, mapDispatchToProps)(HomeView)