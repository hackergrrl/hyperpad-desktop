var dswarm = require('discovery-swarm')
var getport = require('get-port')

module.exports = function (hash, str) {
  var swarm = dswarm()

  var res = {
    swarm: swarm,
    peers: 0
  }

  getport().then(function (port) {
    console.log('Listening on port', port)
    swarm.listen(port)

    swarm.join(hash)
    console.log('JOINED', hash)
  })

  swarm.on('connection', function (conn, info) {
    console.log('REPLICATE', info)
    var r = str.log.replicate({live:true})
    r.pipe(conn).pipe(r)
      .once('end', function () {
        res.peers--
      })
      .once('error', function () {
        res.peers--
      })
    res.peers++
  })

  return res
}
