//Translated from pusher.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Heuristic = require('./Heuristic');

var sOK = main.sOK;


/** @class
 *  Quite a dumb way of "pushing" our influence further...
 *  For that reason the coeff are rather low.
 *  This should eventually disappear.
 */
function Pusher(player) {
    Heuristic.call(this, player);
    this.allyCoeff = this.getGene('ally-infl', 0.1, 0.01, 4.0);
    this.enemyCoeff = this.getGene('enemy-infl', 0.4, 0.01, 4.0);
}
inherits(Pusher, Heuristic);
module.exports = Pusher;

Pusher.prototype.evalBoard = function (stateYx, scoreYx) {
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            var score = myScoreYx[j][i] = this.evalMove(i, j);
            scoreYx[j][i] += score;
        }
    }
};

Pusher.prototype.evalMove = function (i, j) {
    var inf = this.inf.map[j][i];
    var enemyInf = inf[this.enemyColor];
    var allyInf = inf[this.color];
    if (enemyInf === 0 || allyInf === 0) {
        return 0;
    }
    if (!this.canConnect(i, j, this.color)) return 0;

    var fillTer = this.territoryScore(i, j, this.color);
    if (fillTer < 0) fillTer = 0; // Spacer will count <0 scores

    var score = fillTer + 0.33 * (this.enemyCoeff * enemyInf - this.allyCoeff * allyInf);
    if (main.debug) {
        main.log.debug('Pusher heuristic sees influences ' + allyInf + ' - ' + enemyInf + ' at ' + i + ',' + j + ' -> ' + '%.03f'.format(score));
    }
    return score;
};
