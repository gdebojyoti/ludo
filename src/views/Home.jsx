import React, { Fragment, PureComponent } from 'react'

import '../styles/views/home'

const HomeView = () => {
  return <div>
    <h1>Ludo - a PWA.</h1>
    <Grid />
  </div>
}

const Grid = () => {
  return <div className='grid'>
    <Quadrant className='quadrant--red' />
    <Quadrant className='quadrant--blue' />
    <Quadrant className='quadrant--yellow' />
    <Quadrant className='quadrant--green' />

    <Center />
  </div>
}

const Quadrant = props => {
  const { className } = props
  const divClass = 'quadrant' + (className ? ' ' + className : '')
  return <div className={divClass}>
    <div className='quadrant__home'></div>
    <div className='quadrant__rows'>
      <Row />
      <Row />
      <Row />
    </div>
  </div>
}

const Row = () => {
  const cells = []
  for (let i = 0; i < 6; i++) {
    cells.push(<Cell key={i} />)
  }
  return <div className='quadrant__row'>
    { cells }
  </div>
}

const Cell = () => {
  return <div className='quadrant__cell'></div>
}

const Center = () => {
  return <div className='grid__center'></div>
}

export default HomeView