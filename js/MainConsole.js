//Translated from main_console.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');
//require 'trollop';
var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');
var Ai1Player = require('./Ai1Player');
var ConsoleHumanPlayer = require('./ConsoleHumanPlayer');

/** @class Create game & players
 */
function ConsoleGame(opts) {
    this.game = new GameLogic();
    this.game.messagesToConsole(true);
    this.game.newGame(opts['size'], opts.handicap);
    this.goban = this.game.goban;
    this.players = [];
    for (var color = 1; color <= 2; color++) {
        this.players[color] = ( opts.ai() > color ? new Ai1Player(this.goban, color) : new ConsoleHumanPlayer(this.goban, color) );
    }
    if (opts.load()) {
        this.game.loadMoves(opts.load());
    }
    // if no human is playing we create one to allow human interaction
    this.spectator = ( opts.ai() >= 2 ? new ConsoleHumanPlayer(this.goban, -1) : null );
    this.scorer = new ScoreAnalyser();
}
module.exports = ConsoleGame;

// Show prisoner counts during the game  
ConsoleGame.prototype.showPrisoners = function () {
    var prisoners = this.game.prisoners();
    for (var c = 1; c <= prisoners.length; c++) {
        console.log(prisoners[c] + ' ' + Grid.COLOR_NAMES[c] + ' (' + Grid.COLOR_CHARS[c] + ') are prisoners');
    }
    console.log('');
};

ConsoleGame.prototype.proposeConsoleEnd = function () {
    var text = this.scorer.computeScore(this.goban, this.game.komi, this.game.whoResigned);
    console.log(this.goban.scoringGrid.toText(function (c) {
        return Grid.COLOR_CHARS[c];
    }));
    for (var line, line_array = text, line_ndx = 0; line=line_array[line_ndx], line_ndx < line_array.length; line_ndx++) {
        console.log(line);
    }
    // We ask human players; AI always accepts
    for (var player, player_array = this.players, player_ndx = 0; player=player_array[player_ndx], player_ndx < player_array.length; player_ndx++) {
        if (player.isHuman && !player.proposeScore()) {
            // Ending refused, we will keep on playing
            this.game.acceptEnding(false);
            return;
        }
    }
    return this.game.acceptEnding(true);
};

ConsoleGame.prototype.getMoveOrCmd = function () {
    if (!this.spectator || this.numAutoplay > 0) {
        this.numAutoplay -= 1;
        return this.players[this.game.curColor].getMove();
    } else {
        return this.spectator.getMove(this.game.curColor);
    }
};

ConsoleGame.prototype.playMoveOrCmd = function (move) {
    if (move.startWith('cont')) {
        this.numAutoplay = parseInt(move.split(':')[1]);
        if (this.numAutoplay === 0) { // no arg is equivalent to continue:1
            this.numAutoplay = 1;
        }
    } else if (move.startWith('pris')) {
        return this.showPrisoners();
    } else if (move.startWith('hist')) {
        console.log(this.game.historyString());
    } else if (move === 'dbg') {
        return this.goban.debugDisplay();
    } else if (move === 'help') { // this help is for console only
        console.log('Move (e.g. b3) or pass, undo, resign, history, dbg, log:(level)=(1/0), load:(moves), continue:(times)');
        console.log('Four letter abbreviations are accepted, e.g. "hist" is valid to mean "history"');
    } else {
        return this.game.playOneMove(move);
    }
};

ConsoleGame.prototype.playGame = function () {
    this.numAutoplay = 0;
    while (!this.game.gameEnded) {
        if (this.game.gameEnding) {
            this.proposeConsoleEnd();
            continue;
        }
        var move = this.getMoveOrCmd();
        this.playMoveOrCmd(move);
    }
    console.log('Game ended.');
    console.log(this.game.historyString());
};

opts = main.Trollop.options(function () {
    var opts;
    opt('size', 'Goban size', {'default':9});
    opt('ai', 'How many AI players', {'default':2});
    opt('handicap', 'Number of handicap stones', {'default':0});
    return opt('load', 'Game to load like e4,c3,d5', {'type':'string'});
});
console.log('Command line options received: ' + opts);
// Start the game
new ConsoleGame(opts).playGame();
// E02: unknown method ai()
// E02: unknown method load()
// E02: unknown method opt(...)
// W02: Unknown class supposed to be attached to main: Trollop
// E02: unknown method options(...)