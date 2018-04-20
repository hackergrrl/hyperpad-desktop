var dswarm = require('discovery-swarm')
var getport = require('get-port')

module.exports = function (hash, str) {
  var swarm = dswarm()

  var res = {
    swarm: swarm,
    peers: 0
  }

  getport().then(function (port) {
    console.log('listening on swarm port', port)
    swarm.listen(port)

    swarm.join(hash)
    console.log('joined swarm for', hash)
  })

  swarm.on('connection', function (conn, info) {
    console.log('new peer', info)
    var r = str.log.replicate({live:true})
    r.pipe(conn).pipe(r)
      .once('end', function () {
        console.log('lost peer')
        res.peers--
      })
      .once('error', function (err) {
        console.log('lost peer', err)
        res.peers--
      })
    res.peers++
  })

  return res
}
