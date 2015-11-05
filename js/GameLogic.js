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
    this.inConsole = false;
    this.history = [];
    this.errors = [];

    this.goban = null;
    this.handicap = this.komi = this.numPass = this.curColor = 0;
    this.whoResigned = this.gameEnding = this.gameEnded = null;

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

GameLogic.prototype._failLoad = function (msg, errors) {
    main.log.error(msg);
    if (!errors) throw new Error(msg);
    errors.push(msg);
    return false;
};

// game is a series of moves, e.g. "c2,b2,pass,b4,b3,undo,b4,pass,b3"
GameLogic.prototype.loadMoves = function (game, errors) {
    if (!game) return true;
    try {
        game = this._sgfToGame(game);
    } catch (err) {
        return this._failLoad('Failed loading SGF moves:\n' + err, errors);
    }

    var moves = game.split(',');
    for (var i = 0; i < moves.length; i++) {
        if (!this.playOneMove(moves[i])) {
            return this._failLoad('Failed playing loaded move #' + (i + 1) + ':\n' + this.getErrors(), errors);
        }
    }
    return true;
};

// Handles a regular move + the special commands (pass, resign, undo, load, hand, log)
// Returns false if a problem occured. In this case the error message is available.
GameLogic.prototype.playOneMove = function (move) {
    if (this.gameEnded) return this._errorMsg('Game already ended');

    if (/^[a-z][1-2]?[0-9]$/.test(move)) {
        return this.playAStone(move);
    } else if (move === 'undo') {
        return this._requestUndo();
    } else if (move === 'half_undo') {
        return this._requestUndo(true);
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
        return this._errorMsg('Invalid command: ' + move);
    }
};

// Handles a new stone move (not special commands like "pass")
GameLogic.prototype.playAStone = function (move) {
    var coords = Grid.move2xy(move);
    var i = coords[0], j = coords[1];
    if (!Stone.validMove(this.goban, i, j, this.curColor)) {
        return this._errorMsg('Invalid move: ' + move);
    }
    Stone.playAt(this.goban, i, j, this.curColor);
    this._storeMoveInHistory(move);
    this._nextPlayer();
    this.numPass = 0;
    return true;
};

// One player resigns.
GameLogic.prototype.resign = function () {
    this._storeMoveInHistory('resign');
    this.whoResigned = this.curColor;
    this.gameEnded = true;
    return true;
};

// Call this when the current player wants to pass.
// If all (remaining) players pass, we go into "ending mode".
// Caller is responsible of checking the GameLogic#game_ending flag:
// If the flag goes to true, the method accept_ending (below) should be called next.
GameLogic.prototype.passOneMove = function () {
    this._storeMoveInHistory('pass');
    this.numPass += 1;
    if (this.numPass >= 2) {
        this.gameEnding = true;
    }
    this._nextPlayer();
    return true;
};

// Call this each time GameLogic#game_ending goes to true (ending mode).
// The score should be counted and proposed to players.
// "accept" parameter should be true if all players accept the proposed ending (score count).
// Only after this call will the game be really finished.
// If accept=false, this means a player refuses to end here
// => the game should continue until the next time all players pass.
GameLogic.prototype.acceptEnding = function (accept, whoRefused) {
    if (!this.gameEnding) return this._errorMsg('The game is not ending yet');
    this.gameEnding = false;
    if (accept) {
        this.gameEnded = true; // ending accepted. Game is finished.
        return true;
    }
    // Score refused (in dispute)
    // if the player who refused just played, we give the turn back to him
    if (whoRefused !== this.curColor) {
        this.history.pop(); // remove last "pass"
        this._nextPlayer();
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

// If not called, getErrors() has to be called to retrieve recent errors.
// If called with on=true (or no param), error messages will logged directly.
GameLogic.prototype.switchConsoleMode = function (on) {
    if (on === undefined) on = true;
    this.inConsole = on;
};

// Stores or log a new error message (see also switchConsoleMode).
// Always returns false.
GameLogic.prototype._errorMsg = function (msg) {
    if (this.inConsole) {
        main.log.error(msg);
    } else {
        this.errors.push(msg);
    }
    return false;
};

// Returns the error messages noticed until now and clears the list.
GameLogic.prototype.getErrors = function () {
    var errors = this.errors;
    this.errors = [];
    return errors;
};

GameLogic.prototype.setLogLevel = function (cmd) {
    var args = cmd.split('=');
    var flag = parseInt(args[1]) !== 0;
    switch (args[0]) {
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
        return this._errorMsg('Invalid log command: ' + cmd);
    }
    return true;
};

GameLogic.prototype._nextPlayer = function () {
    this.curColor = 1 - this.curColor;
};

GameLogic.prototype._storeMoveInHistory = function (move) {
    return this.history.push(move);
};

// undo one full game turn (e.g. one black move and one white)
GameLogic.prototype._requestUndo = function (halfMove) {
    var count = halfMove ? 1 : 2;
    if (this.history.length < count) {
        return this._errorMsg('Nothing to undo');
    }
    for (var i = count; i >= 1; i--) {
        if (!this.history[this.history.length-1].endWith('pass')) { // no stone to remove for a pass
            Stone.undo(this.goban);
        }
        this.history.pop();
    }
    if (halfMove) this._nextPlayer();
    this.numPass = 0;
    return true;
};

// Converts a game (list of moves) from SGF format to our internal format.
// Returns the game unchanged if it is not an SGF one.
// Returns an empty move list if nothing should be played (a game is pending).
GameLogic.prototype._sgfToGame = function (game) {
    if (!game.startWith('(;FF')) { // are they always the fist characters?
        return game;
    }
    var reader = new SgfReader(game);
    this.newGame(reader.boardSize);
    this.komi = reader.komi;
    return reader.toMoveList();
};
