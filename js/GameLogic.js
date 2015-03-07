//Translated from game_logic.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');
var Goban = require('./Goban');
var SgfReader = require('./SgfReader');
var HandicapSetter = require('./HandicapSetter');
// GameLogic enforces the game logic.
//public read-only attribute: goban, komi, cur_color, game_ended, game_ending, who_resigned;

/** @class */
function GameLogic() {
    this.console = false;
    this.history = [];
    this.errors = [];
    this.handicap = 0;
    this.who_resigned = null;
    this.goban = null;
}
module.exports = GameLogic;

GameLogic.prototype.new_game = function (size, handicap, komi) {
    if (size === undefined) size = null;
    if (handicap === undefined) handicap = this.handicap;
    if (komi === undefined) komi = null;
    this.history.clear();
    this.errors.clear();
    this.num_pass = 0;
    this.cur_color = main.BLACK;
    this.game_ended = this.game_ending = false;
    this.who_resigned = null;
    if (!this.goban || (size && size !== this.goban.size)) {
        this.goban = new Goban(size);
    } else {
        this.goban.clear();
    }
    this.komi = (( komi ? komi : (( handicap === 0 ? 6.5 : 0.5 )) ));
    return this.set_handicap(handicap);
};

// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
GameLogic.prototype.set_handicap = function (h) {
    if (this.history.size > 0) {
        throw new Error('Handicap cannot be changed during a game');
    }
    this.handicap = HandicapSetter.set_handicap(this.goban, h);
    // White first when handicap
    if (this.handicap !== 0) {
        this.cur_color = main.WHITE;
    }
    return true;
};

// game is a series of moves, e.g. "c2,b2,pass,b4,b3,undo,b4,pass,b3"
GameLogic.prototype.load_moves = function (game) {
    try {
        game = this.sgf_to_game(game);
        for (var move, move_array = game.split(','), move_ndx = 0; move=move_array[move_ndx], move_ndx < move_array.length; move_ndx++) {
            if (!this.play_one_move(move)) {
                throw new Error('Failed playing the loaded move: ' + move);
            }
        }
        return true;
    } catch (err) {
        this.error_msg('Failed loading moves. Please double check the format of your input.');
        this.error_msg('Error: ' + err.message() + ' (' + err.constructor.name + ')');
        main.log.error('Error while loading moves:\n' + err + '\n' + err.stack);
        return false;
    }
};

// Handles a regular move + the special commands (pass, resign, undo, load, hand, log)
// Returns false if a problem occured. In this case the error message is available.
GameLogic.prototype.play_one_move = function (move) {
    if (this.game_ended) {
        return this.error_msg('Game already ended');
    }
    // $log.debug("GameLogic playing #{Grid.color_name(@cur_color)}: #{move}") if $debug
    if (/'^[a-z][1-2]?[0-9]$'/.test(move)) {
        return this.play_a_stone(move);
    } else if (move === 'undo') {
        return this.request_undo();
    } else if (move.start_with('resi')) {
        return this.resign();
    } else if (move === 'pass') {
        return this.pass_one_move();
    } else if (move.start_with('hand')) {
        return this.set_handicap(move.split(':')[1]);
    } else if (move.start_with('load:')) {
        return this.load_moves(main.newRange(move, 5, -1));
    } else if (move.start_with('log')) {
        return this.set_log_level(move.split(':')[1]);
    } else {
        return this.error_msg('Invalid command: ' + move);
    }
};

// Handles a new stone move (not special commands like "pass")
GameLogic.prototype.play_a_stone = function (move) {
    var i, j;
    var _m = Grid.parse_move(move);
    i = _m[0];
    j = _m[1];
    
    if (!Stone.valid_move(this.goban, i, j, this.cur_color)) {
        return this.error_msg('Invalid move: ' + move);
    }
    Stone.play_at(this.goban, i, j, this.cur_color);
    this.store_move_in_history(move);
    this.next_player();
    this.num_pass = 0;
    return true;
};

// One player resigns.
GameLogic.prototype.resign = function () {
    this.store_move_in_history('resign');
    this.who_resigned = this.cur_color;
    this.game_ended = true;
    return true;
};

// Call this when the current player wants to pass.
// If all (remaining) players pass, we go into "ending mode".
// Caller is responsible of checking the GameLogic#game_ending flag:
// If the flag goes to true, the method accept_ending (below) should be called next.
GameLogic.prototype.pass_one_move = function () {
    this.store_move_in_history('pass');
    this.num_pass += 1;
    if (this.num_pass >= 2) {
        this.game_ending = true;
    }
    this.next_player();
    return true;
};

// Call this each time GameLogic#game_ending goes to true (ending mode).
// The score should be counted and proposed to players.
// "accept" parameter should be true if all players accept the proposed ending (score count).
// Only after this call will the game be really finished.
// If accept=false, this means a player refuses to end here
// => the game should continue until the next time all players pass.
GameLogic.prototype.accept_ending = function (accept) {
    if (!this.game_ending) {
        return this.error_msg('The game is not ending yet');
    }
    if (!accept) {
        this.game_ending = false; // exit ending mode; we will play some more...
    } else {
        this.game_ended = true; // ending accepted. Game is finished.
    }
    return true;
};

// Returns how many moves have been played so far
// (can be bigger than the stone count since "pass" or "resign" are also moves)
GameLogic.prototype.move_number = function () {
    return this.history.size;
};

// Returns a text representation of the list of moves played so far
GameLogic.prototype.history_string = function () {
    return (( this.handicap > 0 ? 'handicap:' + this.handicap + ',' : '' )) + this.history.join(',') + ' (' + this.history.size + ' moves)';
};

// Returns an array with the prisoner count per color
// e.g. [3,5] means 3 black stones are prisoners, 5 white stones
GameLogic.prototype.prisoners = function () {
    return Group.prisoners(this.goban);
};

// If called with on=true, error messages will be directly displayed on the console.
// If not called, the default behavior needs the caller to use get_errors method.
GameLogic.prototype.messages_to_console = function (on) {
    if (on === undefined) on = true;
    this.console = on;
};

// Returns the error messages noticed until now and clears the list.
GameLogic.prototype.get_errors = function () {
    var errors = this.errors.clone();
    this.errors.clear();
    return errors;
};

GameLogic.prototype.set_log_level = function (cmd) {
    try {
        var a = cmd.split('=');
        var flag = parseInt(a[1], 10) !== 0;
        if (!flag && a[1] !== '0') {
            throw new Error(0);
        }
        switch (a[0]) {
        case 'group':
            main.debug_group = flag;
            break;
        case 'ai':
            main.debug_ai = flag;
            break;
        case 'all':
            main.debug = main.debug_group = main.debug_ai = flag;
            break;
        default: 
            throw new Error(1);
        }
        return true;
    } catch (_exc) {
        return this.error_msg('Invalid log command: ' + cmd);
    }
};

// ===============================================================================
//private;
// ===============================================================================
GameLogic.prototype.next_player = function () {
    this.cur_color = (this.cur_color + 1) % 2;
};

// Always returns false
GameLogic.prototype.error_msg = function (msg) {
    if (!this.console) {
        this.errors.push(msg);
    } else {
        console.log(msg);
    }
    return false;
};

GameLogic.prototype.store_move_in_history = function (move) {
    return this.history.push(move);
};

// undo one full game turn (e.g. one black move and one white)
GameLogic.prototype.request_undo = function () {
    if (this.history.size < 2) {
        return this.error_msg('Nothing to undo');
    }
    for (var i = 1; i <= 2; i++) {
        if (!this.history[this.history.length-1].end_with('pass')) {
            Stone.undo(this.goban);
        } // no stone to remove for a pass
        this.history.pop();
    }
    this.num_pass = 0;
    return true;
};

// Converts a game (list of moves) from SGF format to our internal format.
// Returns the game unchanged if it is not an SGF one.
// Returns an empty move list if nothing should be played (a game is pending).
GameLogic.prototype.sgf_to_game = function (game) {
    if (!game.start_with('(;FF')) {
        return game;
    } // are they are always the 1st characters?
    var reader = new SgfReader(game);
    this.new_game(reader.board_size, reader.handicap);
    this.komi = reader.komi;
    return reader.to_move_list();
};
