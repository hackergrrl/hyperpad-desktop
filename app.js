#!/usr/bin/env electron

var path = require('path')
var electron = require('electron')
var app = electron.app  // Module to control application life.
var BrowserWindow = electron.BrowserWindow  // Module to create native browser window.

var APP_NAME = 'Hyperpad'

var win = null

// Listen for app-ready event
var appIsReady = false
app.once('ready', function () {
  appIsReady = true
})

// Set up global node exception handler
handleUncaughtExceptions()

createMainWindow()


function createMainWindow () {
  var win

  if (!appIsReady) {
    app.once('ready', ready)
  } else {
    ready()
  }

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    app.quit()
  })

  function ready () {
    var INDEX = 'file://' + path.resolve(__dirname, './index.html')
    if (!win) {
      win = new BrowserWindow({title: APP_NAME, show: false})
      win.once('ready-to-show', () => win.show())
      win.maximize()
    }
    // if (argv.debug) win.webContents.openDevTools()
    win.loadURL(INDEX)

    win.on('closed', function () {
      win = null
      app.quit()
    })
  }

  return win
}

function handleUncaughtExceptions () {
  process.on('uncaughtException', function (error) {
    console.log('uncaughtException in Node:', error)

    // Show a vaguely informative dialog.
    if (app && win) {
      var opts = {
        type: 'error',
        buttons: [ 'OK' ],
        title: 'Error Fatal',
        message: error.message
      }
      electron.dialog.showMessageBox(win, opts, function () {
        process.exit(1)
      })
    }
  })
}
