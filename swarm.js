var dswarm = require('discovery-swarm')

module.exports = function (hash, str) {
  var swarm = dswarm()

  var res = {
    swarm: swarm,
    peers: 0
  }

  // TODO: pick free port
  swarm.listen(2839)

  swarm.join(hash)
  console.log('JOINED', hash)

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
