'use strict';

var io = require('socket.io-client');

var cfg = require('../../config/ogs.json');

var PROD_URL = 'http://ggs.online-go.com:80';
var BETA_URL = 'http://ggsbeta.online-go.com:80';
var MOCK_URL = 'http://private-anon-01be17d5c-ogs.apiary-mock.com';

var ignorable_notifications = {
    'gameStarted': true,
    'gameEnded': true,
    'gameDeclined': true,
    'gameResumedFromStoneRemoval': true,
    'tournamentStarted': true,
    'tournamentEnded': true,
};


function Connection() {
    var url;
    switch (cfg.server) {
    case 'prod': url = PROD_URL; break;
    case 'beta': url = BETA_URL; break;
    case 'mock': url = MOCK_URL; break;
    default: throw new Error('Define entry "server" in your config to be prod, beta or mock');
    }
    var socket = this.socket = io(url, { timeout: 5000 });
    socket.io.skipReconnect = true;

    this.connected_games = {};
    this.connected_game_timeouts = {};
    this.connected = false;

    var self = this;
    socket.on('connect', function() {
        self.connected = true;
        console.debug('Connected to', url);

    socket.emit('bot/connect', self.auth({}), function (x) {
        console.debug(x);
    });
        socket.emit('bot/id', {'id': cfg.accountName}, function (id) {
            if (!id) {
                return self.disconnect('Error: unknown bot account: ' + cfg.accountName);
            }
            console.debug('Bot is user id:', id);
            self.botId = id;
            socket.emit('notification/connect', self.auth({}), function (x) {
                console.debug(x);
            });
            socket.emit('bot/connect', self.auth({}), function (x) {
                console.debug(x);
            });
        });
    });

    socket.on('error', function (err) {
        console.error('Socket closing after error:', err);
        self.disconnect(err);
    });

    socket.on('event', function(data) {
        self.log(data);
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
    var self = this;
    window.setTimeout(function () {
        self.conn.disconnect();
    }, 10000);
};
