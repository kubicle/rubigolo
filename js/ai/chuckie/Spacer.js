//Translated from spacer.rb using babyruby2js
'use strict';

var main = require('../../main');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class Tries to occupy empty space + counts when filling up territory */
function Spacer(player) {
    Heuristic.call(this, player);

    this.inflCoeff = this.getGene('infl', 1, 0.5, 3);
    this.borderCoeff = this.getGene('border', 10, 0, 20);

    this.rowCoeff = this.gsize <= 9 ?
        [0, 0.2, 0.8, 0.95, 1] :
        [0, 0.2, 0.8, 1, 0.95, 0.8];
}
inherits(Spacer, Heuristic);
module.exports = Spacer;

Spacer.prototype._evalMove = function (i, j) {
    var enemyInf = 0, allyInf = 0;
    var stone = this.goban.stoneAt(i, j);
    var eInf = this.infl[this.enemyColor], aInf = this.infl[this.color];
    enemyInf += eInf[j][i];
    allyInf += aInf[j][i];
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color !== main.EMPTY) return 0;
        enemyInf += eInf[s.j][s.i];
        allyInf += aInf[s.j][s.i];
    }
    var totalInf = 1 + this.inflCoeff * Math.max(enemyInf + allyInf - 3, 0) * (this.gsize / 9);

    var maxDist = this.rowCoeff.length - 1;
    var distH = Math.min(this.distanceFromBorder(i), maxDist);
    var distV = Math.min(this.distanceFromBorder(j), maxDist);
    var db = this.rowCoeff[distH] * this.rowCoeff[distV] * this.borderCoeff;
    
    // remove points only if we fill up our own territory
    var fillTer = 0;
    if (this.player.jpRules) {
        fillTer = this.pot.territoryScore(i, j, this.color);
        if (fillTer > 0) fillTer = 0; // Pusher will count >0 scores
    }
    return fillTer + db / totalInf;
};

Spacer.prototype.distanceFromBorder = function (n) {
    return Math.min(n - 1, this.gsize - n);
};
