//Translated from pusher.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('./main');
// Quite a dumb way of "pushing" our influence further...
// For that reason the coeff are rather low.
// This should eventually disappear.
var Heuristic = require('./Heuristic');

/** @class */
function Pusher(player) {
    Heuristic.call(this);
    this.ally_coeff = get_gene('ally-infl', 0.1, 0.01, 4.0);
    this.enemy_coeff = get_gene('enemy-infl', 0.4, 0.01, 4.0);
}
inherits(Pusher, Heuristic);
module.exports = Pusher;

Pusher.prototype.eval_move = function (i, j) {
    var inf = this.inf.map[j][i];
    var enemy_inf = inf[this.enemy_color];
    var ally_inf = inf[this.color];
    if (enemy_inf === 0 || ally_inf === 0) {
        return 0;
    }
    var score = 0.33 * (this.enemy_coeff * enemy_inf - this.ally_coeff * ally_inf);
    if (main.debug) {
        main.log.debug('Pusher heuristic sees influences ' + ally_inf + ' - ' + enemy_inf + ' at ' + i + ',' + j + ' -> ' + main.strFormat('%.03f', score));
    }
    return score;
};
