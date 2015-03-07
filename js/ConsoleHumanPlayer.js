//Translated from console_human_player.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Grid = require('./Grid');
var main = require('./main');
var Player = require('./Player');

/** @class */
function ConsoleHumanPlayer(goban, color) {
    main.Player.call(this, true, goban);
    set_color(color);
    this.debug_ai = null;
}
inherits(ConsoleHumanPlayer, main.Player);
module.exports = ConsoleHumanPlayer;

ConsoleHumanPlayer.prototype.get_move = function (color) {
    if (color === undefined) color = this.color;
    this.goban.console_display();
    console.log('What is ' + Grid.COLOR_NAMES[color] + '/' + Grid.COLOR_CHARS[color] + ' move? (or \'help\')');
    return this.get_answer();
};

ConsoleHumanPlayer.prototype.attach_debug_ai = function (ai) {
    this.debug_ai = ai;
};

ConsoleHumanPlayer.prototype.get_ai_eval = function (i, j) {
    if (this.debug_ai) {
        this.debug_ai.prepare_eval();
        var score = this.debug_ai.eval_move(i, j);
        return main.log.debug('==> AI would rank this move (' + i + ',' + j + ') as ' + score);
    }
};

ConsoleHumanPlayer.prototype.propose_score = function () {
    console.log('Do you accept this score? (y/n)');
    return this.get_answer(['y', 'n']) === 'y';
};

//private;
ConsoleHumanPlayer.prototype.get_answer = function (valid_ones) {
    if (valid_ones === undefined) valid_ones = null;
    while (true) {
        var answer = gets().toLowerCase().trim();
        if (answer === '') {
            continue;
        }
        if (valid_ones && !valid_ones.find_index(answer)) {
            console.log('Valid answers: ' + valid_ones.join(','));
            continue;
        }
        return answer;
    }
};
