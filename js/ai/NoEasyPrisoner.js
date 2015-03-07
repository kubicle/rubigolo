//Translated from no_easy_prisoner.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Stone = require('./Stone');
var main = require('./main');
// Should recognize when our move is foolish...
var Heuristic = require('./Heuristic');
var Hunter = require('./Hunter');

/** @class */
function NoEasyPrisoner(player) {
    Heuristic.call(this);
    set_as_negative();
    this.enemy_hunter = new Hunter(player, true);
}
inherits(NoEasyPrisoner, Heuristic);
module.exports = NoEasyPrisoner;

NoEasyPrisoner.prototype.init_color = function () {
    Heuristic.init_color.call(this);
    return this.enemy_hunter.init_color();
};

NoEasyPrisoner.prototype.eval_move = function (i, j) {
    // NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    // be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).
    var stone = Stone.play_at(this.goban, i, j, this.color);
    var g = stone.group;
    var score = 0;
    if (g.lives === 1) {
        score = -g.stones.size;
        if (main.debug) {
            main.log.debug('NoEasyPrisoner says ' + i + ',' + j + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (main.debug) {
            main.log.debug('NoEasyPrisoner asking Hunter to look at ' + i + ',' + j);
        }
        if (this.enemy_hunter.escaping_atari_is_caught(stone)) {
            score = -g.stones.size;
            if (main.debug) {
                main.log.debug('NoEasyPrisoner (backed by Hunter) says ' + i + ',' + j + ' is foolish  (' + score + ')');
            }
        }
    }
    Stone.undo(this.goban);
    return score;
};
