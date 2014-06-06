var ssidexists;
var clientexists;
var recentonly = $('#enablerecentonly').prop('checked');
App = {};

$(document).ready(function() {
  App.socket = io.connect();
  App.socket.on('ssid', App.ssid);
  App.socket.on('client', App.client);
  App.socket.on('time', App.time);
  App.socket.on('packetrate', App.packetrate);

  renderGrids();
});

function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp*1000);
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = hour+':'+doubleDigit(min)+':'+doubleDigit(sec) ;
  return time;
}

function doubleDigit(n){
  return n > 9 ? "" + n: "0" + n;
}

function padtext(text,padsize){
  var padded = '';

  if(text.length<padsize){
    for(x=0;x<=padsize-text.length-1;x++){
      padded += ' ';
    }
    return text + padded;
  }else if(text.length>padsize){
    return text.substring(0,padsize);
  }else{
    return text;
  }
}

App.ssid = function(data){
   if($('#ssidalert').val() == data.mac){ if($('#enablessidsound').prop('checked')){ PlaySound('sound1'); } $("#ssidalertflasher").fadeIn(50).fadeOut(50); }

  ssidexists = $('#ssidgrid').getCell(data.mac,'mac');

  if(ssidexists){
    $('#ssidgrid').setRowData(data.mac,{ssid: data.ssid.trim() == '' ? '- hidden ssid -' : data.ssid, mac: data.mac, type: data.type, lasttime: timeConverter(data.lasttime), manuf: data.manuf, channel: data.channel, signal_dbm: data.signal_dbm});
  }else{
    $('#ssidgrid').addRowData(data.mac,{ssid: data.ssid.trim() == '' ? '- hidden ssid -' : data.ssid, mac: data.mac, type: data.type, lasttime: timeConverter(data.lasttime), manuf: data.manuf, channel: data.channel, signal_dbm: data.signal_dbm});
  }
}

App.client = function(data){
  if($('#clientalert').val() == data.mac){ if($('#enableclientsound').prop('checked')){ PlaySound('sound1'); } $("#clientalertflasher").fadeIn(50).fadeOut(50); }

  clientexists = $('#clientgrid').getCell(data.mac,'mac');

  if(clientexists){
    $('#clientgrid').setRowData(data.mac,{name: data.name, bssid: data.bssid == data.mac ? '- self -' : data.bssid, bssidsrc:     $('#ssidgrid').getRowData(data.bssid).ssid == undefined ? '' : $('#ssidgrid').getRowData(data.bssid).ssid, manuf: data.manuf, mac: data.mac, type: data.type, lasttime: timeConverter(data.lasttime), signal_dbm: data.signal_dbm, datasize: data.datasize, ppm: data.ppm, username: data.username, channel: data.channel});
  }else{
    $('#clientgrid').addRowData(data.mac,{name: data.name, bssid: data.bssid == data.mac ? '- self -' : data.bssid, bssidsrc: $('#ssidgrid').getRowData(data.bssid).ssid == undefined ? '' : $('#ssidgrid').getRowData(data.bssid).ssid, manuf: data.manuf, mac: data.mac, type: data.type, lasttime: timeConverter(data.lasttime), signal_dbm: data.signal_dbm, datasize: data.datasize, ppm: data.ppm, username: data.username, channel: data.channel});
  }
}

App.time = function(data){
   $('#txtTime').val(timeConverter(data.timesec));
}

App.packetrate = function(data){
  if($('#clientgrid').getRowData(data.mac).mac != undefined){
    if(data.ppm == 0 && recentonly){
        $('#clientgrid').delRowData(data.mac);
    }else{
      $('#clientgrid').setCell(data.mac,'ppm',data.ppm);
    }
  }
}


function renderGrids(){
  $("#ssidgrid").jqGrid({
    datatype: 'local',
    width: 650,
    height: 600,
    colNames:['ssid','mac','manufacturer','type','last seen','channel','dBm'],
    colModel:[
    {name:'ssid', index:'ssid', sorttype:'text', width:90},
    {name:'mac', index:'mac', sorttype:'text', key:true, width:65},
    {name:'manuf', index:'manuf', sorttype:'text', width:60},
    {name:'type', index:'type', sorttype:'int', width:25},
    {name:'lasttime', index:'lasttime', sorttype:'time', width:40},
    {name:'channel', index:'channel', sorttype:'int', width:40},
    {name:'signal_dbm', index:'signal_dbm', sorttype:'int', width:20}
    ],
    pager: '#ssidpager',
    rowNum: 200,
    sortname: 'lasttime',
    viewrecords: true,
    sortorder: "desc",
    caption: "ssid",
    onSelectRow: ssidSelected,
    beforeSelectRow: function (rowid){
        if ($(this).jqGrid("getGridParam", "selrow") === rowid){
            $(this).jqGrid("resetSelection");
        $('#ssidalert').val("");
        return false;
        }else{
            return true;
        }
    }
  });

  $("#ssidgrid").jqGrid('navGrid','#ssidpager',{del:false,add:false,edit:false,search:false});
  $("#ssidgrid").jqGrid('filterToolbar',{stringResult: true,searchOnEnter : false});

  $("#clientgrid").jqGrid({
    datatype: 'local',
    width: 900,
    height: 600,
    colNames:['name','mac','manufacturer','bssid','bssid src','type','last seen','ppm','interface','channel','dBm','data size'],
    colModel:[
    {name:'name', index:'name', sorttype:'text', width:60},
    {name:'mac', index:'mac', sorttype:'text', key:true, width:60},
    {name:'manuf', index:'manuf', sorttype:'text', width:60},
    {name:'bssid', index:'bssid', sorttype:'text', width:60},
    {name:'bssidsrc', index:'bssidsrc', sorttype:'text', width:90},
    {name:'type', index:'type', sorttype:'int', width:20},
    {name:'lasttime', index:'lasttime', sorttype:'time', width:35},
    {name:'ppm', index:'ppm', sorttype:'int', width:25},
    {name:'username', index:'username', sorttype:'text', width:30},
    {name:'channel', index:'channel', sorttype:'int', width:30},
    {name:'signal_dbm', index:'signal_dbm', sorttype:'int', width:20},
    {name:'datasize', index:'datasize', sorttype:'int', width:30}
    ],
    pager: '#clientpager',
    rowNum: 200,
    sortname: 'lasttime',
    viewrecords: true,
    sortorder: "desc",
    caption: "client",
    onSelectRow: clientSelected,
    beforeSelectRow: function (rowid){
        if ($(this).jqGrid("getGridParam", "selrow") === rowid){
            $(this).jqGrid("resetSelection");
        $('#clientalert').val("");
        return false;
        }else{
            return true;
        }
    }
  });

  $("#clientgrid").jqGrid('navGrid','#clientpager',{del:false,add:false,edit:false,search:false});
  $("#clientgrid").jqGrid('filterToolbar',{stringResult: true,searchOnEnter : false});
}

function ssidSelected(obj) {
  $('#clientgrid').resetSelection();
  $('#ssidalert').val(obj);
}

function clientSelected(obj) {
  $('#ssidgrid').resetSelection();
  $('#clientalert').val(obj);
}

function PlaySound(soundObj) {
  $('#'+soundObj)[0].play();
}

function toggleRecentOnly(){
  var data
  var mac
  recentonly = $('#enablerecentonly').prop('checked');
  if(recentonly){
    data = $('#clientgrid').getDataIDs()
    for(x=0;x<data.length;x++){
      mac = data[x];
      if($('#clientgrid').getCell(mac,'ppm') == 0){
        $('#clientgrid').delRowData(mac);
      }
    }
    data.length = 0
  }
}
