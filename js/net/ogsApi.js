'use strict';

var io = require('socket.io-client');

var cfg = require('../../config/ogs.json');

var PROD_URL = 'ggs.online-go.com';
var BETA_URL = 'ggsbeta.online-go.com';

var ignorable_notifications = {
    'gameStarted': true,
    'gameEnded': true,
    'gameDeclined': true,
    'gameResumedFromStoneRemoval': true,
    'tournamentStarted': true,
    'tournamentEnded': true,
};


function Connection() {
    var protocol = cfg.useSsl ? 'https' : 'http';
    var host = cfg.server === 'prod' ? PROD_URL : BETA_URL;
    var port = cfg.useSsl ? 443 : 80;
    var url = protocol + '://' + host + ':' + port;

    var socket = this.socket = io(url, { timeout: 5000 });
    socket.io.skipReconnect = true;

    this.connected_games = {};
    this.connected_game_timeouts = {};
    this.connected = false;

    this.botId = cfg.accountName;

    var self = this;
    setTimeout(function () {
        self.disconnect();
    }, 60000);

    socket.on('connect', function() {
        self.connected = true;
        console.info('Connected to', url);

        socket.emit('bot/id', { 'id': cfg.accountName }, function (id) {
            // if (!id) {
            //     return self.disconnect('Error: unknown bot account: ' + cfg.accountName);
            // }
            console.info('Bot is user id:', id);
            //self.botId = id;
            socket.emit('notification/connect', self.auth({}), function (x) {
                console.info(x);
            });
            socket.emit('bot/connect', self.auth({}), function (x) {
                console.info(x);
            });
        });
    });

    socket.on('error', function (err) {
        console.error('Socket closing after error:', err);
        self.disconnect(err);
    });

    socket.on('event', function(data) {
        self.log('socket.on event:', data);
    });

    socket.on('disconnect', function() {
        self.connected = false;
        self.log('Disconnected');
        // for (var game_id in self.connected_games) {
        //     self.disconnectFromGame(game_id);
        // }
    });

    socket.on('notification', function(notification) {
        if (self['on_' + notification.type]) {
            self['on_' + notification.type](notification);
        }
        else if (!(notification.type in ignorable_notifications)) {
            console.log('Unhandled notification type: ', notification.type, notification);
        }
    });
}

Connection.prototype.log = function() {
    var arr = '';
    for (var i=0; i < arguments.length; ++i) {
        arr += arguments[i] + ' ';
    }
    console.log(arr);
};

Connection.prototype.auth = function (obj) {
    obj.apikey = cfg.apiKey;
    obj.bot_id = this.botId;
    return obj;
};

Connection.prototype.disconnect = function (reason) {
    reason = reason || 'VOLUNTARY DISCONNECT';
    console.info('Disconnecting. Reason: ', reason);
    this.socket.close();
    this.connected = false;
};

function OgsApi() {
    this.conn = null;
}
var ogsApi = new OgsApi();
module.exports = ogsApi;

OgsApi.prototype.init = function () {
    this.conn = new Connection();
};
