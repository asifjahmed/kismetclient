var Kismet = require('../lib/kismet.js')
express = require('express.io')
var fs = require('fs')
app = express().http().io()

var k = new Kismet('192.168.1.238',2501)
var ssids = []
var clients = []
var owners = []
var clisrc = []
var source = []
var packetrates = []
var rightnow = Number(new Date().valueOf()/1000)

k.on('connect',function(){
    console.log('connected!')
})

k.on('ready',function(){
    console.log('ready!')

    this.subscribe('bssid'
        , ['bssid','manuf','channel','signal_dbm']
        , function(had_error,message){
            console.log('bssid - '+ message)
    })
    this.subscribe('ssid'
        , ['ssid','mac','type','lasttime']
        , function(had_error,message){
            console.log('ssid - '+ message)
    })
    this.subscribe('client'
        , ['bssid','mac','manuf','type','lasttime','datasize','signal_dbm']
        , function(had_error,message){
            console.log('client - '+ message)
    })
	this.subscribe('clisrc'
        , ['uuid','mac','lasttime','signal_dbm']
        , function(had_error,message){
            console.log('clisrc - '+ message)
    })
	this.subscribe('source'
        , ['username','channel','uuid']
        , function(had_error,message){
            console.log('source - '+ message)
    })

    /*
    // output all known sentences & fields
    console.log('protocols:')
    console.log(k.protocols)
    for( var i=0; i<k.protocols.length; i++){
        k.command('CAPABILITY '+ k.protocols[i])
    }
    */
})

/*
k.on('rawData',function(rawData){
    console.log('raw:'+rawData)
})
*/

k.on('CAPABILITY',function(fields){
    console.log('capability:' + fields.protocol)
    console.log(fields.fields.split(','))
})

k.on('BSSID',function(fields){
    /*console.log(
        'Kismet sees bssid : ' + fields.bssid
        + ' type: ' + k.types.lookup('network',fields.type)
        + ' manuf: ' + fields.manuf
        + ' channel: ' + fields.channel
    )*/
    if(ssids[fields.bssid] != undefined){
      ssids[fields.bssid].manuf = fields.manuf
      ssids[fields.bssid].channel = fields.channel
      ssids[fields.bssid].signal_dbm = fields.signal_dbm
    }

	//app.io.broadcast('bssid', {bssid: fields.bssid, manuf: fields.manuf, channel: fields.channel, signal_dbm: fields.signal_dbm})
})

k.on('SSID',function(fields){
	/*console.log(
		'Kismet sees ssid  : ' + fields.mac
		+ ' type: ' + k.types.lookup('ssid',fields.type)
		+ ' ssid: ' + fields.ssid
	)*/
  if(ssids[fields.mac] == undefined){
      ssids[fields.mac] = {ssid: '', type: 0, lasttime: 0, manuf: '', channel: 0, signal_dbm: 0}
  }
  ssids[fields.mac].ssid = fields.ssid
  ssids[fields.mac].type = fields.type
  ssids[fields.mac].lasttime = fields.lasttime

	app.io.broadcast('ssid', {mac: fields.mac, ssid: ssids[fields.mac].ssid, type: ssids[fields.mac].type, lasttime: ssids[fields.mac].lasttime, manuf: ssids[fields.mac].manuf, channel: ssids[fields.mac].channel, signal_dbm: ssids[fields.mac].signal_dbm})
})

k.on('CLIENT',function(fields){
	/*console.log(
		'Kismet sees client: ' + fields.bssid
		+ ' type: ' + k.types.lookup('client',fields.type)
		+ ' mac: ' + fields.mac
	)*/
  if(clients[fields.mac] == undefined){
    clients[fields.mac] = {name: '', manuf: '', bssid: '', type: 0, lasttime: 0, datasize: 0, signal_dbm: 0, ppm: 1, interface: '', channel: 0}
  }
  clients[fields.mac].name = owners[fields.mac]
  clients[fields.mac].manuf = fields.manuf
  clients[fields.mac].bssid = fields.bssid
  clients[fields.mac].type = fields.type
  clients[fields.mac].lasttime = fields.lasttime
  clients[fields.mac].datasize = fields.datasize
  clients[fields.mac].signal_dbm = fields.signal_dbm
  clients[fields.mac].ppm = packetrates[fields.mac] == undefined ? 0 : packetrates[fields.mac].ppm

	updatePacketRate(fields.mac, fields.lasttime)

	app.io.broadcast('client', {mac: fields.mac, name: owners[fields.mac], manuf: clients[fields.mac].manuf, bssid: clients[fields.mac].bssid, type: clients[fields.mac].type, lasttime: clients[fields.mac].lasttime, datasize: clients[fields.mac].datasize, signal_dbm: clients[fields.mac].signal_dbm, ppm: packetrates[fields.mac].ppm, interface: clients[fields.mac].interface, channel: clients[fields.mac].channel})
})

k.on('CLISRC',function(fields){
	//clisrc[fields.mac] = {uuid: fields.uuid, lasttime: fields.lasttime, signal_dbm: fields.signal_dbm}
	if(source[fields.uuid] != undefined){
    if(clients[fields.mac].lasttime == fields.lasttime){
        clients[fields.mac].interface = source[fields.uuid].username
        clients[fields.mac].channel = source[fields.uuid].channel
    }

		//app.io.broadcast('clisrc', {mac: fields.mac, username: source[fields.uuid].username, channel: source[fields.uuid].channel, lasttime: fields.lasttime, signal_dbm: fields.signal_dbm})
	}
})

k.on('SOURCE',function(fields){
	source[fields.uuid] = {username: fields.username, channel: fields.channel}
})

k.on('TIME',function(fields){
    //console.log(new Date(fields.time*1000))
	rightnow = Number(fields.time)
	updatePacketRates()
	app.io.broadcast('time', {timesec: fields.time})
})

k.on('error',function(error){
    console.log('kismet had an error: '+ error.code)
})

k.on('end', function(){
    console.log('kismet disconnected')
})

app.get('/', function(req, res) {
	console.log("tcp client "+req.connection.remoteAddress+" connected.");
	if(!k.connected) { k.connect() }
    res.sendfile(__dirname + '/deepscan2.html')
})

app.use('/js', express.static(__dirname + '/js'))
app.use('/css', express.static(__dirname + '/css'))
app.use('/sounds', express.static(__dirname + '/sounds'))

app.listen(7076)
getOwners()

function getOwners(){
	console.log("reading owners file")
	fs.readFile('./owner.txt', function(err,data){
		for(var ln in String(data).split('\n')){
			owners[String(data).split('\n')[ln].substring(0,17)] = String(data).split('\n')[ln].substring(18)
		}
		console.log("done reading owners file")
	});
}

function updatePacketRate(mac, lasttime){
	var x = 0
	if(packetrates[mac] == undefined){
		packetrates[mac] = {packets: [], ppm: 0}
		packetrates[mac].packets.push(Number(lasttime))
	}else{
		packetrates[mac].packets.push(Number(lasttime))
	}
	for(var i in packetrates[mac].packets){
		if(packetrates[mac].packets[i] >= (rightnow - 60)){
			x++
		}else{
			packetrates[mac].packets.splice(i,1)
		}
	}
	packetrates[mac].ppm = x
  clients[mac].ppm = x
}

function updatePacketRates(){
	var changed
	var packetrate
	for(var i in packetrates){
		changed = false
		packetrate = packetrates[i].ppm
		for(var j in packetrates[i].packets){
			if(packetrates[i].packets[j] < (rightnow - 60)){
				changed = true
				packetrates[i].packets.splice(j,1)
				if(packetrate >= 0){ packetrate-- }
			}
		}
		if(changed){
			packetrates[i].ppm = packetrate
      clients[i].ppm = packetrate
      app.io.broadcast('packetrate', {mac: i, ppm: packetrate})
		}
	}
}
