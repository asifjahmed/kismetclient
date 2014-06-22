// Generated by CoffeeScript 1.7.1

/*
deepscan
v0.12345
asifjahmed
 */


/*
module dependencies
 */

(function() {
  var Kismet, app, clients, express, fs, getOwners, k, owners, packetrates, path, rightnow, source, ssids, updatePacketRate, updatePacketRates;

  Kismet = require('./kismet.js');

  express = require('express.io');

  fs = require('fs');

  path = require('path');

  app = express().http().io();


  /*
  initialization functions
   */

  k = new Kismet('192.168.1.238', 2501);

  rightnow = Math.round(new Date().valueOf() / 1000);

  owners = [];

  ssids = [];

  clients = [];

  packetrates = [];

  source = [];

  k.on('connect', function() {
    return console.log("connected!");
  });

  k.on('ready', function() {
    console.log("ready");

    /*
    subscribe to kismet server data
     */
    this.subscribe('bssid', ['bssid', 'manuf', 'channel', 'signal_dbm'], function(had_error, message) {
      return console.log("bssid " + message);
    });
    this.subscribe('ssid', ['ssid', 'mac', 'type', 'lasttime'], function(had_error, message) {
      return console.log("ssid " + message);
    });
    this.subscribe('client', ['bssid', 'mac', 'manuf', 'type', 'lasttime', 'datasize', 'signal_dbm'], function(had_error, message) {
      return console.log("client " + message);
    });
    this.subscribe('clisrc', ['uuid', 'mac', 'lasttime', 'signal_dbm'], function(had_error, message) {
      return console.log("clisrc " + message);
    });
    return this.subscribe('source', ['username', 'channel', 'uuid'], function(had_error, message) {
      return console.log("source " + message);
    });
  });


  /*
  kismet data handlers
   */

  k.on('CAPABILITY', function(fields) {
    console.log('capability: #{fields.protocol}');
    return console.log(fields.fields.split(','));
  });

  k.on('BSSID', function(fields) {
    if (ssids[fields.bssid] !== void 0) {
      ssids[fields.bssid].manuf = fields.manuf;
      ssids[fields.bssid].channel = fields.channel;
      return ssids[fields.bssid].signal_dbm = fields.signal_dbm;
    }
  });

  k.on('SSID', function(fields) {
    if (Number(fields.type) === 0) {
      if (ssids[fields.mac] === void 0) {
        ssids[fields.mac] = {
          ssid: '',
          type: 0,
          lasttime: 0,
          manuf: '',
          channel: 0,
          signal_dbm: 0
        };
      }
      ssids[fields.mac].ssid = fields.ssid;
      ssids[fields.mac].type = fields.type;
      ssids[fields.mac].lasttime = fields.lasttime;
      return app.io.broadcast('ssid', {
        mac: fields.mac,
        ssid: ssids[fields.mac].ssid,
        type: k.types.lookup('ssid', ssids[fields.mac].type),
        lasttime: ssids[fields.mac].lasttime,
        manuf: ssids[fields.mac].manuf,
        channel: ssids[fields.mac].channel,
        signal_dbm: ssids[fields.mac].signal_dbm
      });
    }
  });

  k.on('CLIENT', function(fields) {
    if (ssids[fields.mac] === void 0) {
      if (clients[fields.mac] === void 0) {
        clients[fields.mac] = {
          name: '',
          manuf: '',
          bssid: '',
          type: 0,
          lasttime: 0,
          datasize: 0,
          signal_dbm: 0,
          ppm: 1,
          username: '',
          channel: 0
        };
      }
      clients[fields.mac].name = owners[fields.mac];
      clients[fields.mac].manuf = fields.manuf;
      clients[fields.mac].bssid = fields.bssid;
      clients[fields.mac].type = fields.type;
      clients[fields.mac].lasttime = fields.lasttime;
      clients[fields.mac].datasize = fields.datasize;
      clients[fields.mac].signal_dbm = fields.signal_dbm;
      clients[fields.mac].ppm = packetrates[fields.mac] === void 0 ? 0 : packetrates[fields.mac].ppm;
      updatePacketRate(fields.mac, fields.lasttime);
      return app.io.broadcast('client', {
        mac: fields.mac,
        name: owners[fields.mac],
        manuf: clients[fields.mac].manuf,
        bssid: clients[fields.mac].bssid,
        type: k.types.lookup('client', clients[fields.mac].type),
        lasttime: clients[fields.mac].lasttime,
        datasize: clients[fields.mac].datasize,
        signal_dbm: clients[fields.mac].signal_dbm,
        ppm: packetrates[fields.mac] === void 0 ? 0 : packetrates[fields.mac].ppm,
        username: clients[fields.mac].username,
        channel: clients[fields.mac].channel
      });
    }
  });

  k.on('CLISRC', function(fields) {
    if (!(source[fields.uuid] === void 0 || clients[fields.mac] === void 0)) {
      if (clients[fields.mac].lasttime === fields.lasttime) {
        clients[fields.mac].username = source[fields.uuid].username;
        clients[fields.mac].channel = source[fields.uuid].channel;
        return app.io.broadcast('clisrc', {
          mac: fields.mac,
          username: clients[fields.mac].username,
          channel: clients[fields.mac].channel
        });
      }
    }
  });

  k.on('SOURCE', function(fields) {
    return source[fields.uuid] = {
      username: fields.username,
      channel: fields.channel
    };
  });

  k.on('TIME', function(fields) {
    rightnow = Number(fields.time);
    updatePacketRates();
    return app.io.broadcast('time', {
      timesec: fields.time
    });
  });

  k.on('error', function(error) {
    return console.log("kismet had an error: " + error.code);
  });

  k.on('end', function() {
    return console.log("kismet disconnected");
  });


  /*
  helper functions
   */

  getOwners = function() {
    console.log("reading owners file");
    return fs.readFile(path.join(__dirname, '..', 'etc', 'owner.txt'), function(err, data) {
      var ln;
      if (err) {
        console.log(err);
      }
      for (ln in String(data).split("\n")) {
        owners[String(data).split("\n")[ln].substring(0, 17)] = String(data).split("\n")[ln].substring(18);
      }
      return console.log("done reading owners file");
    });
  };

  updatePacketRate = function(mac, lasttime) {
    var i, x;
    x = 0;
    if (packetrates[mac] === void 0) {
      packetrates[mac] = {
        packets: [],
        ppm: 0
      };
    }
    packetrates[mac].packets.push(Number(lasttime));
    for (i in packetrates[mac].packets) {
      if (packetrates[mac].packets[i] >= (rightnow - 60)) {
        x++;
      } else {
        packetrates[mac].packets.splice(i, 1);
      }
    }
    packetrates[mac].ppm = x;
    return clients[mac].ppm = x;
  };

  updatePacketRates = function() {
    var changed, i, j, packetrate, _results;
    _results = [];
    for (i in packetrates) {
      changed = false;
      packetrate = packetrates[i].ppm;
      for (j in packetrates[i].packets) {
        if (packetrates[i].packets[j] < (rightnow - 60)) {
          changed = true;
          packetrates[i].packets.splice(j, 1);
          if (packetrate > 0) {
            packetrate--;
          }
        }
      }
      if (changed) {
        packetrates[i].ppm = packetrate;
        clients[i].ppm = packetrate;
        _results.push(app.io.broadcast("packetrate", {
          mac: i,
          ppm: packetrate
        }));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };


  /*
  initialize express.io
   */

  app.get('/', function(req, res) {
    console.log("tcp client " + req.connection.remoteAddress + " connected.");
    if (!k.connected) {
      k.connect();
    }
    return res.sendfile(path.join(__dirname, '..', 'web', 'deepscan.html'));
  });

  app.use('/js', express["static"](path.join(__dirname, '..', 'web', 'js')));

  app.use('/css', express["static"](path.join(__dirname, '..', 'web', 'css')));

  app.use('/sounds', express["static"](path.join(__dirname, '..', 'web', 'sounds')));

  app.listen(7076);

  getOwners();

}).call(this);
