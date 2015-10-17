//Translated from game_logic.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');
var Goban = require('./Goban');
var SgfReader = require('./SgfReader');
var HandicapSetter = require('./HandicapSetter');

/** @class GameLogic enforces the game logic.
 *  public read-only attribute: goban, komi, curColor, gameEnded, gameEnding, whoResigned
 */
function GameLogic(src) {
    this.console = false;
    this.history = [];
    this.errors = [];
    this.handicap = 0;
    this.whoResigned = null;
    this.goban = null;
    if (src) this.copy(src);
}
module.exports = GameLogic;


GameLogic.prototype.copy = function (src) {
    this.newGame(src.goban.gsize, src.handicap, src.komi);
    this.loadMoves(src.history.join(','));
};

// handicap and komi are optional (default is 0)
// Returns true if size and handicap could be set to given values
GameLogic.prototype.newGame = function (gsize, handicap, komi) {
    this.history.clear();
    this.errors.clear();
    this.numPass = 0;
    this.curColor = main.BLACK;
    this.gameEnded = this.gameEnding = false;
    this.whoResigned = null;

    if (!this.goban || gsize !== this.goban.gsize) {
        this.goban = new Goban(gsize);
    } else {
        this.goban.clear();
    }

    handicap = handicap !== undefined ? handicap : 0;
    this.setHandicap(handicap);

    this.komi = komi !== undefined ? komi : (handicap ? 0.5 : 6.5);

    return this.goban.gsize === gsize && this.handicap === handicap;
};

// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
GameLogic.prototype.setHandicap = function (h) {
    if (this.history.length > 0) {
        throw new Error('Handicap cannot be changed during a game');
    }
    this.handicap = HandicapSetter.setHandicap(this.goban, h);
    // White first when handicap
    if (this.handicap !== 0) {
        this.curColor = main.WHITE;
    }
    return true;
};

// game is a series of moves, e.g. "c2,b2,pass,b4,b3,undo,b4,pass,b3"
GameLogic.prototype.loadMoves = function (game) {
    try {
        if (!game) return true;
        game = this.sgfToGame(game);
        for (var move, move_array = game.split(','), move_ndx = 0; move=move_array[move_ndx], move_ndx < move_array.length; move_ndx++) {
            if (!this.playOneMove(move)) {
                throw new Error('Failed playing the loaded move: ' + move);
            }
        }
        return true;
    } catch (err) {
        this.errorMsg('Failed loading moves. Please double check the format of your input.');
        this.errorMsg('Error: ' + err.message + ' (' + err.constructor.name + ')');
        main.log.error('Error while loading moves:\n' + err + '\n' + err.stack);
        return false;
    }
};

// Handles a regular move + the special commands (pass, resign, undo, load, hand, log)
// Returns false if a problem occured. In this case the error message is available.
GameLogic.prototype.playOneMove = function (move) {
    if (this.gameEnded) {
        return this.errorMsg('Game already ended');
    }
    // $log.debug("GameLogic playing #{Grid.color_name(@cur_color)}: #{move}") if $debug
    if (/^[a-z][1-2]?[0-9]$/.test(move)) {
        return this.playAStone(move);
    } else if (move === 'undo') {
        return this.requestUndo();
    } else if (move === 'half_undo') {
        return this.requestUndo(true);
    } else if (move.startWith('resi')) {
        return this.resign();
    } else if (move === 'pass') {
        return this.passOneMove();
    } else if (move.startWith('hand')) {
        return this.setHandicap(move.split(':')[1]);
    } else if (move.startWith('load:')) {
        return this.loadMoves(move.slice(5));
    } else if (move.startWith('log')) {
        return this.setLogLevel(move.split(':')[1]);
    } else {
        return this.errorMsg('Invalid command: ' + move);
    }
};

// Handles a new stone move (not special commands like "pass")
GameLogic.prototype.playAStone = function (move) {
    var coords = Grid.move2xy(move);
    var i = coords[0], j = coords[1];
    if (!Stone.validMove(this.goban, i, j, this.curColor)) {
        return this.errorMsg('Invalid move: ' + move);
    }
    Stone.playAt(this.goban, i, j, this.curColor);
    this.storeMoveInHistory(move);
    this.nextPlayer();
    this.numPass = 0;
    return true;
};

// One player resigns.
GameLogic.prototype.resign = function () {
    this.storeMoveInHistory('resign');
    this.whoResigned = this.curColor;
    this.gameEnded = true;
    return true;
};

// Call this when the current player wants to pass.
// If all (remaining) players pass, we go into "ending mode".
// Caller is responsible of checking the GameLogic#game_ending flag:
// If the flag goes to true, the method accept_ending (below) should be called next.
GameLogic.prototype.passOneMove = function () {
    this.storeMoveInHistory('pass');
    this.numPass += 1;
    if (this.numPass >= 2) {
        this.gameEnding = true;
    }
    this.nextPlayer();
    return true;
};

// Call this each time GameLogic#game_ending goes to true (ending mode).
// The score should be counted and proposed to players.
// "accept" parameter should be true if all players accept the proposed ending (score count).
// Only after this call will the game be really finished.
// If accept=false, this means a player refuses to end here
// => the game should continue until the next time all players pass.
GameLogic.prototype.acceptEnding = function (accept, whoRefused) {
    if (!this.gameEnding) return this.errorMsg('The game is not ending yet');
    this.gameEnding = false;
    if (accept) {
        this.gameEnded = true; // ending accepted. Game is finished.
        return true;
    }
    // Score refused (in dispute)
    // if the player who refused just played, we give the turn back to him
    if (whoRefused !== this.curColor) {
        this.history.pop(); // remove last "pass"
        this.nextPlayer();
    }
    return true;
};

// Returns how many moves have been played so far
// (can be bigger than the stone count since "pass" or "resign" are also moves)
GameLogic.prototype.moveNumber = function () {
    return this.history.length;
};

// Returns a text representation of the list of moves played so far
GameLogic.prototype.historyString = function () {
    return (( this.handicap > 0 ? 'handicap:' + this.handicap + ',' : '' )) +
        this.history.join(',') +
        ' (' + this.history.length + ' moves)';
};

// Returns an array with the prisoner count per color
// e.g. [3,5] means 3 black stones are prisoners, 5 white stones
GameLogic.prototype.prisoners = function () {
    return Group.countPrisoners(this.goban);
};

// If called with on=true, error messages will be directly displayed on the console.
// If not called, the default behavior needs the caller to use get_errors method.
GameLogic.prototype.messagesToConsole = function (on) {
    if (on === undefined) on = true;
    this.console = on;
};

// Returns the error messages noticed until now and clears the list.
GameLogic.prototype.getErrors = function () {
    var errors = this.errors;
    this.errors = [];
    return errors;
};

GameLogic.prototype.setLogLevel = function (cmd) {
    try {
        var a = cmd.split('=');
        var flag = parseInt(a[1]) !== 0;
        if (!flag && a[1] !== '0') {
            throw new Error(0);
        }
        switch (a[0]) {
        case 'group':
            main.debugGroup = flag;
            break;
        case 'ai':
            main.debugAi = flag;
            break;
        case 'all':
            main.debug = main.debugGroup = main.debugAi = flag;
            break;
        default: 
            throw new Error(1);
        }
        return true;
    } catch (_exc) {
        return this.errorMsg('Invalid log command: ' + cmd);
    }
};

// ===============================================================================
//private;
// ===============================================================================
GameLogic.prototype.nextPlayer = function () {
    this.curColor = 1 - this.curColor;
};

// Always returns false
GameLogic.prototype.errorMsg = function (msg) {
    if (!this.console) {
        this.errors.push(msg);
    } else {
        console.log(msg);
    }
    return false;
};

GameLogic.prototype.storeMoveInHistory = function (move) {
    return this.history.push(move);
};

// undo one full game turn (e.g. one black move and one white)
GameLogic.prototype.requestUndo = function (halfMove) {
    var count = halfMove ? 1 : 2;
    if (this.history.length < count) {
        return this.errorMsg('Nothing to undo');
    }
    for (var i = count; i >= 1; i--) {
        if (!this.history[this.history.length-1].endWith('pass')) { // no stone to remove for a pass
            Stone.undo(this.goban);
        }
        this.history.pop();
    }
    if (halfMove) this.nextPlayer();
    this.numPass = 0;
    return true;
};

// Converts a game (list of moves) from SGF format to our internal format.
// Returns the game unchanged if it is not an SGF one.
// Returns an empty move list if nothing should be played (a game is pending).
GameLogic.prototype.sgfToGame = function (game) {
    if (!game.startWith('(;FF')) { // are they are always the 1st characters?
        return game;
    }
    var reader = new SgfReader(game);
    this.newGame(reader.boardSize);
    this.komi = reader.komi;
    return reader.toMoveList();
};
