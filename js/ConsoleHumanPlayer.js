//Translated from console_human_player.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Grid = require('./Grid');
var main = require('./main');
var Player = require('./Player');

/** @class */
function ConsoleHumanPlayer(goban, color) {
    Player.call(this, true, goban);
    setColor(color);
    this.debugAi = null;
}
inherits(ConsoleHumanPlayer, Player);
module.exports = ConsoleHumanPlayer;

ConsoleHumanPlayer.prototype.getMove = function (color) {
    if (color === undefined) color = this.color;
    this.goban.consoleDisplay();
    console.log('What is ' + Grid.COLOR_NAMES[color] + '/' + Grid.COLOR_CHARS[color] + ' move? (or \'help\')');
    return this.getAnswer();
};

ConsoleHumanPlayer.prototype.attachDebugAi = function (ai) {
    this.debugAi = ai;
};

ConsoleHumanPlayer.prototype.getAiEval = function (i, j) {
    if (this.debugAi) {
        this.debugAi.prepareEval();
        var score = this.debugAi.evalMove(i, j);
        return main.log.debug('==> AI would rank this move (' + i + ',' + j + ') as ' + score);
    }
};

ConsoleHumanPlayer.prototype.proposeScore = function () {
    console.log('Do you accept this score? (y/n)');
    return this.getAnswer(['y', 'n']) === 'y';
};

//private;
ConsoleHumanPlayer.prototype.getAnswer = function (validOnes) {
    if (validOnes === undefined) validOnes = null;
    while (true) {
        var answer = gets().toLowerCase().trim();
        if (answer === '') {
            continue;
        }
        if (validOnes && !validOnes.findIndex(answer)) {
            console.log('Valid answers: ' + validOnes.join(','));
            continue;
        }
        return answer;
    }
};

// E02: unknown method gets()
// E02: unknown method find_index(...)