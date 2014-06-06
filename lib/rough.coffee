###
PUT SOME COMMENTS HERE
###

###
module dependencies
###
Kismet  = require './kismet.js'
express = require 'express.io'
fs      = require 'fs'
path    = require 'path'
app     = express().http().io()


###
initialization functions
###
k = new Kismet '192.168.1.238', 2501
rightnow = Math.round(new Date().valueOf() / 1000)
owners = []
ssids = []
clients = []
packetrates = []
source = []

k.on 'connect', ->
  console.log "connected!"

k.on 'ready', ->
  console.log "ready"

  ###
  subscribe to kismet server data
  ###
  @subscribe 'bssid', ['bssid','manuf','channel','signal_dbm'], (had_error, message)->
    console.log "bssid #{message}"

  @subscribe 'ssid', ['ssid','mac','type','lasttime'], (had_error, message)->
    console.log "ssid #{message}"

  @subscribe 'client', ['bssid','mac','manuf','type','lasttime','datasize','signal_dbm'], (had_error, message)->
    console.log "client #{message}"

  @subscribe 'clisrc', ['uuid','mac','lasttime','signal_dbm'], (had_error, message)->
    console.log "clisrc #{message}"

  @subscribe 'source', ['username','channel','uuid'], (had_error, message)->
    console.log "source #{message}"


###
kismet data handlers
###
k.on 'CAPABILITY', (fields)->
  console.log 'capability: #{fields.protocol}'
  console.log fields.fields.split ','

k.on 'BSSID', (fields)->
  unless ssids[fields.bssid] is undefined
    ssids[fields.bssid].manuf = fields.manuf
    ssids[fields.bssid].channel = fields.channel
    ssids[fields.bssid].signal_dbm = fields.signal_dbm

k.on 'SSID', (fields)->
  if ssids[fields.mac] is undefined
    ssids[fields.mac] =
      ssid: ''
      type: 0
      lasttime: 0
      manuf: ''
      channel: 0
      signal_dbm: 0

  ssids[fields.mac].ssid = fields.ssid
  ssids[fields.mac].type = fields.type
  ssids[fields.mac].lasttime = fields.lasttime

  app.io.broadcast 'ssid',
    mac: fields.mac
    ssid: ssids[fields.mac].ssid
    type: ssids[fields.mac].type
    lasttime: ssids[fields.mac].lasttime
    manuf: ssids[fields.mac].manuf
    channel: ssids[fields.mac].channel
    signal_dbm: ssids[fields.mac].signal_dbm

k.on 'CLIENT', (fields)->
  if clients[fields.mac] is undefined
    clients[fields.mac] =
      name: ''
      manuf: ''
      bssid: ''
      type: 0
      lasttime: 0
      datasize: 0
      signal_dbm: 0
      ppm: 1
      username: ''
      channel: 0

  clients[fields.mac].name = owners[fields.mac]
  clients[fields.mac].manuf = fields.manuf
  clients[fields.mac].bssid = fields.bssid
  clients[fields.mac].type = fields.type
  clients[fields.mac].lasttime = fields.lasttime
  clients[fields.mac].datasize = fields.datasize
  clients[fields.mac].signal_dbm = fields.signal_dbm
  clients[fields.mac].ppm = if packetrates[fields.mac] is undefined then 0 else packetrates[fields.mac].ppm

  updatePacketRate fields.mac, fields.lasttime

  app.io.broadcast 'client',
    mac: fields.mac
    name: owners[fields.mac]
    manuf: clients[fields.mac].manuf
    bssid: clients[fields.mac].bssid
    type: clients[fields.mac].type
    lasttime: clients[fields.mac].lasttime
    datasize: clients[fields.mac].datasize
    signal_dbm: clients[fields.mac].signal_dbm
    ppm: if packetrates[fields.mac] is undefined then 0 else packetrates[fields.mac].ppm
    username: clients[fields.mac].username
    channel: clients[fields.mac].channel

k.on 'CLISRC', (fields)->
  unless source[fields.uuid] is undefined
    if clients[fields.mac].lasttime is fields.lasttime
      clients[fields.mac].username = source[fields.uuid].username
      clients[fields.mac].channel = source[fields.uuid].channel

k.on 'SOURCE', (fields)->
  source[fields.uuid] =
    username: fields.username
    channel: fields.channel

k.on 'TIME', (fields)->
  rightnow = Number fields.time
  updatePacketRates()
  app.io.broadcast 'time',
    timesec: fields.time

k.on 'error', (error)->
  console.log "kismet had an error: #{error.code}"

k.on 'end', ->
  console.log "kismet disconnected"


###
helper functions
###
getOwners = ->
  console.log "reading owners file"
  fs.readFile './owner.txt', (err, data)->
    for ln of String(data).split("\n")
      owners[String(data).split("\n")[ln].substring(0, 17)] = String(data).split("\n")[ln].substring(18)
  console.log "done reading owners file"

updatePacketRate = (mac, lasttime) ->
  x = 0
  if packetrates[mac] is undefined
    packetrates[mac] =
      packets: []
      ppm: 0
  packetrates[mac].packets.push Number(lasttime)
  for i of packetrates[mac].packets
    if packetrates[mac].packets[i] >= (rightnow - 60)
      x++
    else
      packetrates[mac].packets.splice i, 1
  packetrates[mac].ppm = x
  clients[mac].ppm = x

updatePacketRates = ->
  for i of packetrates
    changed = false
    packetrate = packetrates[i].ppm
    for j of packetrates[i].packets
      if packetrates[i].packets[j] < (rightnow - 60)
        changed = true
        packetrates[i].packets.splice j, 1
        packetrate-- if packetrate >= 0
    if changed
      packetrates[i].ppm = packetrate
      clients[i].ppm = packetrate
      app.io.broadcast "packetrate",
        mac: i
        ppm: packetrate


###
initialize express.io
###
app.get '/', (req, res)->
  console.log "tcp client #{req.connection.remoteAddress} connected."
  if not k.connected then k.connect()
  res.sendfile path.join(__dirname,'..','web','deepscan.html')

app.use '/js', express.static(path.join(__dirname,'..','web','js'))
app.use '/css', express.static(path.join(__dirname,'..','web','css'))
app.use '/sounds', express.static(path.join(__dirname,'..','web','sounds'))

app.listen 7076
getOwners()
