'use strict';

var CONST = require('./constants');
var main = require('./main');
var Grid = require('./Grid');
var Goban = require('./Goban');
var SgfReader = require('./SgfReader');
var HandicapSetter = require('./HandicapSetter');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var CH_RULES = CONST.CH_RULES, JP_RULES = CONST.JP_RULES;


/** @class GameLogic enforces the game logic.
 * NB: it makes sense for GameLogic to keep the komi, e.g. in case AI want to evaluate 
 * the score in mid-game.
 * public read-only attribute: goban, komi, curColor, gameEnded, gameEnding, whoResigned
 */
function GameLogic(src) {
    this.history = [];
    this.errors = [];
    this.infos = {};
    this.playerNames = [];
    this.rules = JP_RULES;

    this.goban = null;
    this.handicap = this.komi = this.numPass = 0;
    this.curColor = this.whoStarts = BLACK;
    this.gameEnding = this.gameEnded = null;
    this.whoResigned = this.resignReason = null;

    if (src) this.copy(src);
}
module.exports = GameLogic;


// Note that player info remains until this method is called again (i.e. for several games)
GameLogic.prototype.setPlayer = function (color, name) {
    this.playerNames[color] = name;
};

GameLogic.prototype.setRules = function (rules) {
    this.rules = rules;
};

GameLogic.prototype.copy = function (src) {
    this.setWhoStarts(src.whoStarts);
    this.setPlayer(BLACK, src.playerNames[BLACK]);
    this.setPlayer(WHITE, src.playerNames[WHITE]);
    this.rules = src.rules;

    this.newGame(src.goban.gsize, src.handicap, src.komi);

    this.loadMoves(src.history.join(','));
};

// handicap and komi are optional
// Returns true if size and handicap could be set to given values
GameLogic.prototype.newGame = function (gsize, handicap, komi) {
    this.history.clear();
    this.errors.clear();
    this.numPass = 0;
    this.gameEnded = this.gameEnding = false;
    this.whoResigned = this.resignReason = null;

    if (!this.goban || gsize !== this.goban.gsize) {
        this.goban = new Goban(gsize);
    } else {
        this.goban.clear();
    }
    this.goban.setRules({ positionalSuperko: this.rules === CH_RULES });

    handicap = handicap !== undefined ? handicap : 0;
    this.setHandicapAndWhoStarts(handicap);

    this.komi = komi !== undefined ? komi : (handicap ? 0.5 : 6.5);

    if (this.goban.gsize !== gsize) return this._errorMsg('Size could not be set: ' + gsize);
    if (this.handicap !== handicap) return this._errorMsg('Handicap could not be set: ' + handicap);
    return true;
};

GameLogic.prototype.setWhoStarts = function (color) {
    this.curColor = this.whoStarts = color;
};

// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
GameLogic.prototype.setHandicapAndWhoStarts = function (h) {
    if (this.history.length > 0) {
        throw new Error('Handicap cannot be changed during a game');
    }
    this.handicap = HandicapSetter.setHandicap(this.goban, h);

    // White first when handicap > 0
    this.setWhoStarts(this.handicap > 0 ? WHITE : BLACK);
    return true;
};

GameLogic.prototype._failLoad = function (msg, errors) {
    main.log.error(msg);
    if (!errors) throw new Error(msg);
    errors.push(msg);
    return false;
};

// @param {string} game - moves, e.g. "c2,b2,pass,b4,b3,undo,b4,pass,b3"
// @param {string[]} [errors] - errors will be added to this or thrown
GameLogic.prototype.loadMoves = function (game, errors) {
    if (!game) return true;
    var moves = game.split(',');
    for (var i = 0; i < moves.length; i++) {
        if (!this.playOneMove(moves[i])) {
            return this._failLoad('Failed playing loaded move #' + (i + 1) + ':\n' +
                this.getErrors().join(', '), errors);
        }
    }
    return true;
};

/**
 + Loads an SGF format game
 * @param {string} game - SGF game text
 * @param {string[]} [errors] - errors will be added to this or thrown
 * @param {number} [upToMoveNumber] - loads moves up to the position before this - SGF only
 * @return {boolean} - true if succeeded
 */
GameLogic.prototype.loadSgf = function (game, errors, upToMoveNumber) {
    var reader = new SgfReader(), infos;
    try {
        this.infos = infos = reader.readGame(game, upToMoveNumber);
    } catch (err) {
        return this._failLoad('Failed loading SGF moves:\n' + err, errors);
    }

    this.newGame(infos.boardSize, 0, infos.komi); // handicap, if any, will be in move list
    this.setPlayer(BLACK, infos.playerBlack);
    this.setPlayer(WHITE, infos.playerWhite);
    this.rules = infos.rules;

    return this.loadMoves(reader.toMoveList(), errors);
};

// Call this when the format of game to load is unknown
GameLogic.prototype.loadAnyGame = function (game, errors) {
    if (SgfReader.isSgf(game)) {
        return this.loadSgf(game, errors);
    } else {
        return this.loadMoves(game, errors);
    }
}; 

// Handles a regular move + the special commands (pass, resign, undo, load, hand, log)
// Returns false if a problem occured. In this case the error message is available.
GameLogic.prototype.playOneMove = function (move) {
    if (this.gameEnded) return this._errorMsg('Game already ended');

    if (/^[B|W]?[a-z][1-2]?[0-9]$/.test(move)) {
        return this.playAStone(move);
    } else if (move === 'undo') {
        return this._requestUndo();
    } else if (move === 'half_undo') {
        return this._requestUndo(true);
    } else if (move.startsWith('resi')) {
        return this.resign();
    } else if (move === 'pass') {
        return this.passOneMove();
    } else if (move.startsWith('hand')) {
        return this.setHandicapAndWhoStarts(move.split(':')[1]);
    } else if (move.startsWith('load:')) {
        return this.loadMoves(move.slice(5));
    } else if (move.startsWith('log')) {
        return this.setLogLevel(move.split(':')[1]);
    } else {
        return this._errorMsg('Invalid command: ' + move);
    }
};

// Handles a new stone move (not special commands like "pass")
// e.g. "c3" or "Bc3" or "Wc3"
GameLogic.prototype.playAStone = function (move) {
    var coords = this.oneMove2xy(move);
    if (coords.length === 3) this.curColor = coords[2];
    var i = coords[0], j = coords[1];
    if (!this.goban.isValidMove(i, j, this.curColor)) {
        return this._errorMsg('Invalid move: ' + move);
    }
    this.goban.playAt(i, j, this.curColor);
    this._storeMoveInHistory(move);
    this._nextPlayer();
    this.numPass = 0;
    return true;
};

// Parses a move like "c12" into [3,12]; OR "Bc1" into [3,1,0]
// Returns null if move is "pass" or "resi(gn)"; throws if move is illegal
GameLogic.prototype.oneMove2xy = function (move) {
    var color = move[0];
    if (color === 'B' || color === 'W') {
        return Grid.move2xy(move.substr(1)).concat(color === 'B' ? BLACK : WHITE);
    }
    var coords = Grid.move2xy(move, /*dontThrow=*/true);
    if (!coords) {
        if (move === 'pass' || move.substr(0,4) === 'resi') return null;
        throw new Error('Illegal move parsed: ' + move);
    }
    return coords;
};

// One player resigns.
GameLogic.prototype.resign = function (color, reason) {
    color = color !== undefined ? color : this.curColor;
    this.whoResigned = color;
    this.resignReason = reason;
    var move = (color === BLACK ? 'B' : 'W') + 'resign' + (reason ? '-' + reason : '');
    this._storeMoveInHistory(move);
    this.gameEnded = true;
    this.gameEnding = false;
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
    var hand = this.handicap > 0 ? 'handicap:' + this.handicap + ',' : '';
    var h = this.history;
    var color1 = h.length && h[0].length === 2 ? (this.whoStarts === BLACK ? 'B' : 'W') : '';
    return hand + color1 + h.join(',') + ' (' + h.length + ' moves)';
};

// Returns an array with the prisoner count per color
// e.g. [3,5] means 3 black stones are prisoners, 5 white stones
GameLogic.prototype.countPrisoners = function () {
    return this.goban.countPrisoners();
};

// Stores a new error message
// Always returns false.
GameLogic.prototype._errorMsg = function (msg) {
    this.errors.push(msg);
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
        var move = this.history.pop();
        if (!move.endsWith('pass')) this.goban.undo();
    }
    if (halfMove) this._nextPlayer();
    this.numPass = 0;
    return true;
};
