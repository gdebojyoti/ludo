import React, { Component } from 'react'
import { BrowserRouter, Switch, Route } from 'react-router-dom'

import HomeView from '../views/Home'

class App extends Component {
  render () {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path='/' component={HomeView} />
        </Switch>
      </BrowserRouter>
    )
  }
}

export default App
