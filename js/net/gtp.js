'use strict';


function Gtp() {
    this.engine = null;
    this.commands = {};
}

var gtp = new Gtp();
module.exports = gtp;


Gtp.prototype.init = function (engine) {
    this.engine = engine;
};

Gtp.prototype._parseRawLine = function (rawline) {
    var line = '';
    for (var i = 0; i < rawline.length; i++) {
        var c = rawline[i];
        if (c === '#') break;
        switch (c) {
        case '\t':
            line += ' ';
            break;
        default:
            if (c < ' ' || c.codePointAt() === 127) break;
            line += c;
        }
    }
    return line;
};

Gtp.prototype._parseCommand = function (rawline) {
    var cmd = {};
    var w = this._parseRawLine(rawline).split(' ');
    var i = 0;

    if (~~w[i] || w[i][0] === '0') {
        cmd.id = w[i++];
    } else {
        cmd.id = '';
    }
    cmd.command = w[i++];
    cmd.args = w.slice(i);
    return cmd;
};

Gtp.prototype.runCommand = function (line) {
    var cmd = this._parseCommand(line);
    var fn = gtp.commands[cmd.command];
    if (!fn) return this.fail('unknown command');

    this.cmd = cmd;
    fn.call(this, cmd);
};

Gtp.prototype._send = function (msg) {
    console.info('GTP sends: [' + msg + ']');
};

Gtp.prototype.success = function (response) {
    var msg = '=' + this.cmd.id;
    if (response) msg += ' ' + response;
    msg += '\n\n';
    this._send(msg);
};

Gtp.prototype.fail = function (errorMsg) {
    var msg = '?' + this.cmd.id + ' ' + errorMsg + '\n\n';
    this._send(msg);
};

function commandHandler(cmdName, fn) {
    gtp.commands[cmdName] = fn;
}

commandHandler('protocol_version', function () {
    return this.success('2');
});

commandHandler('name', function () {
    return this.success(this.engine.name());
});

commandHandler('version', function () {
    return this.success(this.engine.version());
});

commandHandler('known_command', function (cmd) {
    return this.success(this.commands[cmd.args[0]] ? 'true' : 'false');
});

commandHandler('list_commands', function () {
    var cmds = '';
    for (var command in this.commands) {
        cmds += command + '\n';
    }
    return this.success(cmds + '\n');
});

commandHandler('quit', function () {
    //TODO: doc says full response must be processed (Sent) before we close the connection. how?
    return this.success('');
});

commandHandler('boardsize', function (cmd) {
    var size = ~~cmd.args[0];
    if (!this.engine.initBoardSize(size)) return this.fail('unacceptable size');
    return this.success();
});

commandHandler('clear_board', function () {
    this.engine.clearBoard();
    return this.success();
});

commandHandler('komi', function (cmd) {
    var new_komi = parseFloat(cmd.args[0]);
    if (isNaN(new_komi)) return this.fail('syntax error');
    this.engine.setKomi(new_komi);
    return this.success();
});

function parseColor(color) {
    if (typeof color !== 'string') return null;
    switch (color.toLowerCase()) {
    case 'b': case 'black': return 'b';
    case 'w': case 'white': return 'w';
    default: return null;
    }
}

function parseMove(color, vertex) {
    color = parseColor(color);
    if (!color) return null;

    if (typeof vertex !== 'string' || vertex.length < 2) return null;
    vertex = vertex.toLowerCase();
    if (vertex !== 'pass') {
        var col = vertex[0];
        if (col < 'a' || col > 'z' || col === 'i') return null;
        var row = parseInt(vertex.substr(1));
        if (row < 1 || row > 25) return null;
        vertex = col + row;
    }
    return { color: color, vertex: vertex };
}

commandHandler('play', function (cmd) {
    var move = parseMove(cmd.args[0], cmd.args[1]);
    if (!move) return this.fail('syntax error');

    if (!this.engine.playMove(move.color, move.vertex)) {
        return this.fail('illegal move');
    }
    return this.success();
});

commandHandler('genmove', function (cmd) {
    var color = parseColor(cmd.args[0]);
    if (!color) return this.fail('syntax error');

    var vertex = this.engine.genMove(color);
    return this.success(vertex);
});

// Tournament command
commandHandler('final_score', function () {
    var diff = this.engine.computeScore(); // diff is Black - White
    if (diff === null) return this.fail('cannot score');

    var score;
    if (diff === 0) {
        score = '0';
    } else if(diff < 0) {
        score = 'W+' + (-diff);
    } else {
        score = 'B+' + diff;
    }
    return this.success(score); // e.g. W+2.5 or B+31 or 0
});

// TODO: final_status_list
