var argv = require('minimist')(process.argv)
var path = require('path')
var electron = require('electron')

module.exports = function () {
  if (argv.dir) return path.join(argv.dir, 'hyperpad')
  else return path.join(electron.app.getPath('userData'), 'hyperpad')
}
