//Translated from pusher.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class
 *  Way of "pushing" our influence further...
 *  Still very naive; for that reason the coeff are rather low.
 */
function Pusher(player) {
    Heuristic.call(this, player);

    this.allyCoeff = this.getGene('ally-infl', 0.03, 0.01, 1.0);
    this.enemyCoeff = this.getGene('enemy-infl', 0.13, 0.01, 1.0);
}
inherits(Pusher, Heuristic);
module.exports = Pusher;


Pusher.prototype._evalMove = function (i, j, color) {
    var inf = this.infl[j][i];
    var enemyInf = inf[this.enemyColor];
    var allyInf = inf[color];
    if (enemyInf === 0 || allyInf === 0) {
        return 0;
    }
    // Only push where we can connect to
    if (!this.canConnect(i, j, color)) return 0;
    // Stones that would "fill a blank" are not for Pusher to evaluate
    if (this.goban.stoneAt(i, j).numEmpties() === 0) return 0;

    var invasion = this.invasionCost(i, j, color);

    var score = invasion + this.enemyCoeff * enemyInf - this.allyCoeff * allyInf;
    if (main.debug) main.log.debug('Pusher heuristic sees invasion:' + invasion +
        ', influences:' + allyInf + ' - ' + enemyInf + ' at ' + Grid.xy2move(i, j) +
        ' -> ' + '%.03f'.format(score));
    return score;
};
