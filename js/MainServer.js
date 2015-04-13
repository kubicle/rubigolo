//Translated from main_server.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
// Exemple of URL to start a new game:
// http://localhost:8080/newGame?size=9&players=2&ai=1&handicap=5
// Or a1=0 for 2 human players
//require 'socket';
//require 'uri';
var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');
var Ai1Player = require('./Ai1Player');

/** @class Very simple server that can be used to play a single *local* game
 *  using a web browser as GUI.
 */
function MainServer() {
    this.game = null;
    this.scorer = new ScoreAnalyser();
    this.players = [];
    this.webserver = null;
    this.session = null;
    this.messages = [];
}
module.exports = MainServer;

MainServer.PORT = 8080;
MainServer.INDEX_PAGE = './help-index.html';
MainServer.INDEX_LINK = '<a href=\'index\'>Back to index</a>';
MainServer.prototype.start = function () {
    main.log.info('Starting the server...');
    console.log('Please open a web browser on http://localhost:' + MainServer.PORT + '/index');
    this.webserver = new main.TCPServer('localhost', MainServer.PORT);
    for (;;) {
        var req = this.getSessionAndRequest();
        var reply = this.handleRequest(req);
        this.sendResponse(reply);
    }
};

MainServer.prototype.addMessage = function (msg) {
    return this.messages.push(msg);
};

MainServer.prototype.getSessionAndRequest = function () {
    try {
        if (this.session === null) {
            this.session = this.webserver.accept();
            // With IE, the first request is empty so we will raise, rescue, close and reopen. Not sure why...
            this.session.recvNonblock(5, main.Socket.MSG_PEEK); // raises Errno::EWOULDBLOCK if no data
            main.log.info('Got session: ' + this.session);
        }
        var req;
        if (!(req = this.session.gets())) {
            throw new Error('Connection dropped');
        }
        req = main.URI.decode(req.chop!());
    } catch (err) {
        if (err.constructor.name === 'Errno::EWOULDBLOCK' || err.constructor.name === 'Errno::EAGAIN') {
            main.log.debug('Closing and reopening the session...'); // see comment above about IE
        } else if (err.constructor.name === 'Errno::ECONNRESET' || err.message === 'Connection dropped') { // connection dropped or closed by the remote host
            main.log.info('Connection dropped or timed-out; we will create a new session (no issue)');
        } else {
            main.log.error('Unexpected error: ' + err.constructor + ', msg:' + err.message);
        }
        this.closeSession();
        error_unhandled_exp('(retry ...)');
    }
    if (main.debug) {
        main.log.debug('Request received: "' + req + '"');
    }
    this.keepAlive = false;
    var r;
    while (('' !== (r = this.session.gets().chop()))) {
        if (main.debug) {
            main.log.debug('..."' + r + '"');
        }
        if (/Connection:[ ]*Keep-Alive/.test(r)) {
            this.keepAlive = true;
        }
    }
    return req;
};

MainServer.prototype.closeSession = function () {
    this.session.close();
    this.session = null;
};

MainServer.prototype.sendResponse = function (reply) {
    var header = this.responseHeader(reply);
    try {
        this.session.print(header);
        this.session.print(reply); // can throw Broken pipe (Errno::EPIPE)
        if (!this.keepAlive) {
            this.closeSession();
        }
    } catch (err) {
        main.log.error('Unexpected error: ' + err.constructor + ', msg:' + err.message);
        this.closeSession(); // always close after error here
    }
};

MainServer.prototype.responseHeader = function (reply) {
    var header = 'HTTP/1.1 200 OK\r\n';
    header += 'Date: ' + Date.now().ctime() + '\r\n';
    header += ( this.keepAlive ? 'Connection: Keep-Alive\r\n' : 'Connection: close\r\n' );
    header += 'Server: local Ruby\r\n';
    header += 'Content-Type: text/html; charset=UTF-8\r\nContent-Length: ' + reply.length + '\r\n\r\n';
    if (main.debug) {
        main.log.debug('Header returned:\r\n' + header);
    }
    return header;
};

MainServer.prototype.letAiPlay = function () {
    if (this.game.gameEnding || this.game.gameEnded) {
        return null;
    }
    var player = this.players[this.game.curColor];
    if (!player) { // human
        return null;
    }
    var move = player.getMove();
    this.game.playOneMove(move);
    return move;
};

MainServer.prototype.command = function (cmd) {
    return this.game.playOneMove(cmd);
};

MainServer.prototype.showHistory = function () {
    return this.addMessage('Moves played: ' + this.game.historyString());
};

MainServer.prototype.showScoreInfo = function () {
    if (!this.haveScore) {
        this.scorer.startScoring(this.goban, this.game.komi, this.game.whoResigned);
        this.haveScore = true;
    }
    for (var line, line_array = this.scorer.getScore(), line_ndx = 0; line=line_array[line_ndx], line_ndx < line_array.length; line_ndx++) {
        this.addMessage(line);
    }
    return this.addMessage('');
};

MainServer.prototype.reqAcceptScore = function (args) {
    this.game.acceptEnding(this.getArg(args, 'value') === 'y');
    if (!this.game.gameEnding) {
        this.haveScore = false;
    }
};

// Show prisoner counts during the game  
MainServer.prototype.reqShowPrisoners = function () {
    var prisoners = this.game.prisoners();
    for (var c = 1; c <= prisoners.length; c++) {
        this.addMessage(prisoners[c] + ' ' + Grid.COLOR_NAMES[c] + ' (' + Grid.COLOR_CHARS[c] + ') are prisoners');
    }
    return this.addMessage('');
};

MainServer.prototype.reqShowDebugInfo = function () {
    this.goban.debugDisplay();
    return this.addMessage('Debug output generated on server console window.');
};

// http://localhost:8080/newGame?size=9&handicap=0&ai=0
MainServer.prototype.reqNewGame = function (args) {
    var gsize = this.getArgI(args, 'size', 19);
    var handicap = this.getArgI(args, 'handicap', 0);
    var numAi = this.getArgI(args, 'ai', 1);
    this.game = new GameLogic();
    this.game.newGame(gsize, handicap);
    this.goban = this.game.goban;
    this.haveScore = false;
    this.players.clear();
    for (var color = 1; color <= 2; color++) {
        this.players[color] = ( numAi > color ? new Ai1Player(this.goban, color) : null );
    }
};

// http://localhost:8080/move?at=b3
MainServer.prototype.reqNewMove = function (args) {
    var move = this.getArg(args, 'at');
    try {
        this.game.playOneMove(move);
    } catch (err) {
        // if err.message.start_with?("Invalid move")
        // add_message("Ignored move #{move} (game displayed was maybe not in synch)")
        this.addMessage(err.toString());
    }
};

MainServer.prototype.reqLoadMoves = function (args) {
    var moves = this.getArg(args, 'value');
    try {
        this.game.loadMoves(moves);
    } catch (err) {
        if (!err.message.startWith('Invalid move')) {
            throw err;
        }
        this.addMessage(err.message);
    }
};

MainServer.prototype.parseRequest = function (reqStr) {
    // GET /mainMenu?par1=val1 HTTP/1.1
    var reqs = reqStr.split();
    if (reqs.length < 3 || reqs[0] !== 'GET' || reqs[2] !== 'HTTP/1.1') {
        throw new Error('Unsupported request: ' + reqs);
    }
    var fullUrl = reqs[1];
    var url, argStr;
    var _m = fullUrl.split('?');
    url = _m[0];
    argStr = _m[1];
    
    if (argStr) {
        var args = argStr.split(/&|=/);
    }
    return [url, args];
};

MainServer.prototype.getArg = function (args, name, defVal) {
    if (defVal === undefined) defVal = null;
    var ndx = ( args ? args.index(name) : null );
    if (ndx) {
        return args[ndx + 1];
    }
    if (!defVal) {
        throw new Error('Missing argument ' + name);
    }
    return defVal;
};

MainServer.prototype.getArgI = function (args, name, defVal) {
    if (defVal === undefined) defVal = null;
    return parseInt(this.getArg(args, name, defVal));
};

MainServer.prototype.handleRequest = function (req) {
    try {
        var url, args;
        var _m = this.parseRequest(req);
        url = _m[0];
        args = _m[1];
        
        if (!this.game && url !== '/newGame' && url !== '/index') {
            return 'Invalid request before starting a game (' + req + ')<br><br>' + MainServer.INDEX_LINK;
        }
        var reply = '';
        var question = null;
        switch (url) {
        case '/newGame':
            this.reqNewGame(args);
            break;
        case '/move':
            this.reqNewMove(args);
            break;
        case '/undo':
            this.command('undo');
            break;
        case '/pass':
            this.command('pass');
            break;
        case '/resign':
            this.command('resign');
            break;
        case '/accept_score':
            this.reqAcceptScore(args);
            break;
        case '/load':
            question = {'action':'load_moves', 'label':'Load moves'};
            break;
        case '/continue':
            //NOP
            break;
        case '/prisoners':
            this.reqShowPrisoners();
            break;
        case '/history':
            this.showHistory();
            break;
        case '/load_moves':
            this.reqLoadMoves(args);
            break;
        case '/dbg':
            this.reqShowDebugInfo();
            break;
        case '/index':
            return main.File.read(MainServer.INDEX_PAGE);
            break;
        default: 
            reply += 'Unknown request: ' + req;
        }
        var aiPlayed = this.letAiPlay();
        reply += this.webDisplay(this.game.goban, aiPlayed, question);
        return reply;
    } catch (err) {
        console.log('*** Exception: ' + err);
        for (var s, s_array = err.stack.substr(0, 10), s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            console.log(s);
        }
        return 'Unexpected issue when handling request (' + req + ')<br>' + err + '<br><br>' + MainServer.INDEX_LINK;
    }
};

MainServer.prototype.webDisplay = function (goban, aiPlayed, question) {
    var ended = this.game.gameEnded;
    var ending = (!ended && this.game.gameEnding);
    var player = this.players[this.game.curColor];
    var humanMove = (!ended && !ending && !player);
    var gsize = this.goban.gsize;
    if (ending) {
        this.showScoreInfo();
    }
    var s = '<html><head>';
    s += '<style>body {background-color:#f0f0f0; font-family: tahoma, sans serif; font-size:90%} ';
    s += 'a:link {text-decoration:none; color:#0000FF} a:visited {color:#0000FF} ';
    s += 'a:hover {color:#00D000} a:active {color:#FFFF00} \n';
    s += 'table {border: 1px solid black;} td {width: 15px;}</style>';
    s += '</head><body><table>';
    for (var j = gsize; j >= 1; j--) {
        s += '<tr><th>' + j.toString() + '</th>';
        for (var i = 1; i <= gsize; i++) {
            if (this.haveScore) {
                var color = goban.scoringGrid.yx[j][i];
            } else {
                color = goban.stoneAt(i, j).color;
            }
            if (color === main.EMPTY) {
                if (humanMove && Stone.validMove(goban, i, j, this.game.curColor)) {
                    s += '<td><a href=\'move?at=' + Grid.xLabel(i) + j.toString() + '\'>+</a></td>';
                } else {
                    s += '<td>+</td>'; // empty intersection we cannot play on (ko or suicide)
                }
            } else {
                // TODO: temporary; use nicer than characters!
                s += '<td>' + Grid.COLOR_CHARS[color] + '</td>';
            }
        }
        s += '</tr>';
    }
    s += '<tr><td></td>';
    for (var i = 1; i <= gsize; i++) {
        s += '<th>' + Grid.xLabel(i) + '</th>';
    }
    s += '</tr></table>';
    if (aiPlayed) {
        s += 'AI played ' + aiPlayed + '<br>';
    }
    if (ended) {
        s += '<br>Game ended. ' + MainServer.INDEX_LINK + '<br><br>';
        this.showScoreInfo();
        this.showHistory();
    } else if (ending) {
        question = {'action':'accept_score', 'label':'Do you accept this score? (y/n)'};
    } else if (humanMove) {
        s += ' <a href=\'undo\'>undo</a> ';
        s += ' <a href=\'pass\'>pass</a> ';
        s += ' <a href=\'resign\'>resign</a> ';
        s += ' <a href=\'history\'>history</a> ';
        s += ' <a href=\'prisoners\'>prisoners</a> ';
        s += ' <a href=\'load\'>load</a> ';
        s += ' <a href=\'dbg\'>debug</a> ';
        s += ' <br>Who\'s turn: ' + Grid.COLOR_CHARS[this.game.curColor] + '<br><br>';
    } else {
        s += ' <a href=\'continue\'>continue</a><br>';
    }
    var errors = this.game.getErrors();
    var txt;
    while ((txt = errors.shift())) {
        s += txt + '<br>';
    }
    while ((txt = this.messages.shift())) {
        s += txt + '<br>';
    }
    if (question) {
        s += '<form name=\'my_form\' action=\'' + question['action'] + '\'><b>' + question['label'] + '</b><br>';
        s += '<input type=\'text\' name=\'value\' autofocus required> ';
        s += '<input type=\'submit\' value=\'Submit\'></form>';
    }
    s += '</body></html>';
    return s;
};

var server = new MainServer();
server.start();
// E02: unknown method info(...)
// W02: Unknown class supposed to be attached to main: TCPServer
// E02: unknown method accept()
// W02: Unknown class supposed to be attached to main: Socket
// E02: unknown method recv_nonblock(...)
// E02: unknown method gets()
// W02: Unknown constant supposed to be attached to main: URI
// E02: unknown method decode(...)
// E02: unknown method close()
// E02: unknown method print(...)
// E02: unknown method ctime()
// E02: unknown method index(...)
// W02: Unknown class supposed to be attached to main: File
// E02: unknown method read(...)