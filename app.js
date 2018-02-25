#!/usr/bin/env electron

var path = require('path')
var mkdirp = require('mkdirp')
var electron = require('electron')
var app = electron.app  // Module to control application life.
var BrowserWindow = electron.BrowserWindow  // Module to create native browser window.

var APP_NAME = 'Hyperpad'
var win = null

// Set up app storage dir
var userDataPath = path.join(app.getPath('userData'), 'hyperpad')
mkdirp.sync(userDataPath)
// console.log(userDataPath)

// Set up global node exception handler
handleUncaughtExceptions()

// Create app window
createMainWindow()

//---------------------------------------------------------------------------

function createMainWindow () {
  var win

  app.once('ready', ready)

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    app.quit()
  })

  function ready () {
    var INDEX = 'file://' + path.resolve(__dirname, './index.html')
    if (!win) {
      win = new BrowserWindow({title: APP_NAME, show: false})
      win.once('ready-to-show', function () {
        win.show()
        win.maximize()
      })
    }
    // if (argv.debug) win.webContents.openDevTools()
    win.loadURL(INDEX)

    win.on('closed', function () {
      win = null
      app.quit()
    })

    var ipc = electron.ipcMain

    ipc.on('get-user-data-path', function (ev) {
      ev.returnValue = userDataPath
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
