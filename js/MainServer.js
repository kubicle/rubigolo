//Translated from main_server.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var MainServer = require('./MainServer');
// Exemple of URL to start a new game:
// http://localhost:8080/newGame?size=9&players=2&ai=1&handicap=5
// Or a1=0 for 2 human players
//require 'socket';
//require 'uri';

var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');
var Ai1Player = require('./Ai1Player');
// Very simple server that can be used to play a single *local* game
// using a web browser as GUI.
MainServer.PORT = 8080;
MainServer.INDEX_PAGE = './help-index.html';
MainServer.INDEX_LINK = '<a href=\'index\'>Back to index</a>';

/** @class */
function MainServer() {
    this.game = null;
    this.scorer = new ScoreAnalyser();
    this.players = [];
    this.webserver = null;
    this.session = null;
    this.messages = [];
}
module.exports = MainServer;

MainServer.prototype.start = function () {
    main.log.info('Starting the server...');
    console.log('Please open a web browser on http://localhost:' + MainServer.PORT + '/index');
    this.webserver = new main.TCPServer('localhost', MainServer.PORT);
    for (;;) {
        var req = this.get_session_and_request();
        var reply = this.handle_request(req);
        this.send_response(reply);
    }
};

MainServer.prototype.add_message = function (msg) {
    return this.messages.push(msg);
};

MainServer.prototype.get_session_and_request = function () {
    try {
        if (this.session === null) {
            this.session = this.webserver.accept();
            // With IE, the first request is empty so we will raise, rescue, close and reopen. Not sure why...
            this.session.recv_nonblock(5, main.Socket.MSG_PEEK); // raises Errno::EWOULDBLOCK if no data
            main.log.info('Got session: ' + this.session);
        }
        var req;
        if (!(req = this.session.gets())) {
            throw new Error('Connection dropped');
        }
        req = main.URI.decode(req.chop());
    } catch (err) {
        if (err.constructor.name === 'Errno::EWOULDBLOCK' || err.constructor.name === 'Errno::EAGAIN') {
            main.log.debug('Closing and reopening the session...'); // see comment above about IE
        } else if (err.constructor.name === 'Errno::ECONNRESET' || err.message() === 'Connection dropped') {
            main.log.info('Connection dropped or timed-out; we will create a new session (no issue)');
        } else {
            main.log.error('Unexpected error: ' + err.constructor + ', msg:' + err.message());
        } // connection dropped or closed by the remote host
        this.close_session();
        error_unhandled_exp('(retry ...)');
    }
    if (main.debug) {
        main.log.debug('Request received: "' + req + '"');
    }
    this.keep_alive = false;
    var r;
    while (('' !== (r = main.strChop(this.session.gets())))) {
        if (main.debug) {
            main.log.debug('..."' + r + '"');
        }
        if (/'Connection:[ ]*Keep-Alive'/.test(r)) {
            this.keep_alive = true;
        }
    }
    return req;
};

MainServer.prototype.close_session = function () {
    this.session.close();
    this.session = null;
};

MainServer.prototype.send_response = function (reply) {
    var header = this.response_header(reply);
    try {
        console.log(header);
        console.log(reply); // can throw Broken pipe (Errno::EPIPE)
        if (!this.keep_alive) {
            this.close_session();
        }
    } catch (err) {
        main.log.error('Unexpected error: ' + err.constructor + ', msg:' + err.message());
        this.close_session(); // always close after error here
    }
};

MainServer.prototype.response_header = function (reply) {
    var header = 'HTTP/1.1 200 OK\r\n';
    header += 'Date: ' + Date.now().ctime() + '\r\n';
    header += ( this.keep_alive ? 'Connection: Keep-Alive\r\n' : 'Connection: close\r\n' );
    header += 'Server: local Ruby\r\n';
    header += 'Content-Type: text/html; charset=UTF-8\r\nContent-Length: ' + reply.length + '\r\n\r\n';
    if (main.debug) {
        main.log.debug('Header returned:\r\n' + header);
    }
    return header;
};

MainServer.prototype.let_ai_play = function () {
    if (this.game.game_ending || this.game.game_ended) {
        return null;
    }
    var player = this.players[this.game.cur_color];
    if (!player) {
        return null;
    } // human
    var move = player.get_move();
    this.game.play_one_move(move);
    return move;
};

MainServer.prototype.command = function (cmd) {
    return this.game.play_one_move(cmd);
};

MainServer.prototype.show_history = function () {
    return this.add_message('Moves played: ' + this.game.history_string());
};

MainServer.prototype.show_score_info = function () {
    if (!this.have_score) {
        this.scorer.start_scoring(this.goban, this.game.komi, this.game.who_resigned);
        this.have_score = true;
    }
    for (var line, line_array = this.scorer.get_score(), line_ndx = 0; line=line_array[line_ndx], line_ndx < line_array.length; line_ndx++) {
        this.add_message(line);
    }
    return this.add_message('');
};

MainServer.prototype.req_accept_score = function (args) {
    this.game.accept_ending(this.get_arg(args, 'value') === 'y');
    if (!this.game.game_ending) {
        this.have_score = false;
    }
};

// Show prisoner counts during the game  
MainServer.prototype.req_show_prisoners = function () {
    var prisoners = this.game.prisoners();
    for (var c = 1; c <= prisoners.size; c++) {
        this.add_message(prisoners[c] + ' ' + Grid.COLOR_NAMES[c] + ' (' + Grid.COLOR_CHARS[c] + ') are prisoners');
    }
    return this.add_message('');
};

MainServer.prototype.req_show_debug_info = function () {
    this.goban.debug_display();
    return this.add_message('Debug output generated on server console window.');
};

// http://localhost:8080/newGame?size=9&handicap=0&ai=0
MainServer.prototype.req_new_game = function (args) {
    var size = this.get_arg_i(args, 'size', 19);
    var handicap = this.get_arg_i(args, 'handicap', 0);
    var num_ai = this.get_arg_i(args, 'ai', 1);
    this.game = new GameLogic();
    this.game.new_game(size, handicap);
    this.goban = this.game.goban;
    this.have_score = false;
    this.players.clear();
    for (var color = 1; color <= 2; color++) {
        this.players[color] = ( num_ai > color ? new Ai1Player(this.goban, color) : null );
    }
};

// http://localhost:8080/move?at=b3
MainServer.prototype.req_new_move = function (args) {
    var move = this.get_arg(args, 'at');
    try {
        this.game.play_one_move(move);
    } catch (err) {
        // if err.message.start_with?("Invalid move")
        // add_message("Ignored move #{move} (game displayed was maybe not in synch)")
        this.add_message(err.to_s());
    }
};

MainServer.prototype.req_load_moves = function (args) {
    var moves = this.get_arg(args, 'value');
    try {
        this.game.load_moves(moves);
    } catch (err) {
        if (!err.message().start_with('Invalid move')) {
            throw err;
        }
        this.add_message(err.message());
    }
};

MainServer.prototype.parse_request = function (req_str) {
    // GET /mainMenu?par1=val1 HTTP/1.1
    var reqs = req_str.split();
    if (reqs.size < 3 || reqs[0] !== 'GET' || reqs[2] !== 'HTTP/1.1') {
        throw new Error('Unsupported request: ' + reqs);
    }
    var full_url = reqs[1];
    var url, arg_str;
    var _m = full_url.split('?');
    url = _m[0];
    arg_str = _m[1];
    
    if (arg_str) {
        var args = arg_str.split(/'&|='/);
    }
    return [url, args];
};

MainServer.prototype.get_arg = function (args, name, def_val) {
    if (def_val === undefined) def_val = null;
    var ndx = ( args ? args.index(name) : null );
    if (ndx) {
        return args[ndx + 1];
    }
    if (!def_val) {
        throw new Error('Missing argument ' + name);
    }
    return def_val;
};

MainServer.prototype.get_arg_i = function (args, name, def_val) {
    if (def_val === undefined) def_val = null;
    return parseInt(this.get_arg(args, name, def_val), 10);
};

MainServer.prototype.handle_request = function (req) {
    try {
        var url, args;
        var _m = this.parse_request(req);
        url = _m[0];
        args = _m[1];
        
        if (!this.game && url !== '/newGame' && url !== '/index') {
            return 'Invalid request before starting a game (' + req + ')<br><br>' + MainServer.INDEX_LINK;
        }
        var reply = '';
        var question = null;
        switch (url) {
        case '/newGame':
            this.req_new_game(args);
            break;
        case '/move':
            this.req_new_move(args);
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
            this.req_accept_score(args);
            break;
        case '/load':
            question = {'action':'load_moves', 'label':'Load moves'};
            break;
        case '/continue':
            //NOP
            break;
        case '/prisoners':
            this.req_show_prisoners();
            break;
        case '/history':
            this.show_history();
            break;
        case '/load_moves':
            this.req_load_moves(args);
            break;
        case '/dbg':
            this.req_show_debug_info();
            break;
        case '/index':
            return main.File.read(MainServer.INDEX_PAGE);
            break;
        default: 
            reply += 'Unknown request: ' + req;
        }
        var ai_played = this.let_ai_play();
        reply += this.web_display(this.game.goban, ai_played, question);
        return reply;
    } catch (err) {
        console.log('*** Exception: ' + err);
        for (var s, s_array = err.stack[0], s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            console.log(s);
        }
        return 'Unexpected issue when handling request (' + req + ')<br>' + err + '<br><br>' + MainServer.INDEX_LINK;
    }
};

MainServer.prototype.web_display = function (goban, ai_played, question) {
    var ended = this.game.game_ended;
    var ending = (!ended && this.game.game_ending);
    var player = this.players[this.game.cur_color];
    var human_move = (!ended && !ending && !player);
    var size = this.goban.size;
    if (ending) {
        this.show_score_info();
    }
    var s = '<html><head>';
    s += '<style>body {background-color:#f0f0f0; font-family: tahoma, sans serif; font-size:90%} ';
    s += 'a:link {text-decoration:none; color:#0000FF} a:visited {color:#0000FF} ';
    s += 'a:hover {color:#00D000} a:active {color:#FFFF00} \n';
    s += 'table {border: 1px solid black;} td {width: 15px;}</style>';
    s += '</head><body><table>';
    for (var j = size; j >= 1; j--) {
        s += '<tr><th>' + j.to_s() + '</th>';
        for (var i = 1; i <= size; i++) {
            if (this.have_score) {
                var color = goban.scoring_grid.yx[j][i];
            } else {
                color = goban.stone_at(i, j).color;
            }
            if (color === main.EMPTY) {
                if (human_move && Stone.valid_move(goban, i, j, this.game.cur_color)) {
                    s += '<td><a href=\'move?at=' + Grid.x_label(i) + j.to_s() + '\'>+</a></td>';
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
    for (var i = 1; i <= size; i++) {
        s += '<th>' + Grid.x_label(i) + '</th>';
    }
    s += '</tr></table>';
    if (ai_played) {
        s += 'AI played ' + ai_played + '<br>';
    }
    if (ended) {
        s += '<br>Game ended. ' + MainServer.INDEX_LINK + '<br><br>';
        this.show_score_info();
        this.show_history();
    } else if (ending) {
        question = {'action':'accept_score', 'label':'Do you accept this score? (y/n)'};
    } else if (human_move) {
        s += ' <a href=\'undo\'>undo</a> ';
        s += ' <a href=\'pass\'>pass</a> ';
        s += ' <a href=\'resign\'>resign</a> ';
        s += ' <a href=\'history\'>history</a> ';
        s += ' <a href=\'prisoners\'>prisoners</a> ';
        s += ' <a href=\'load\'>load</a> ';
        s += ' <a href=\'dbg\'>debug</a> ';
        s += ' <br>Who\'s turn: ' + Grid.COLOR_CHARS[this.game.cur_color] + '<br><br>';
    } else {
        s += ' <a href=\'continue\'>continue</a><br>';
    }
    var errors = this.game.get_errors();
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