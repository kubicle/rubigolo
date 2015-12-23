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
}
inherits(Spacer, Heuristic);
module.exports = Spacer;

Spacer.prototype._evalMove = function (i, j) {
    var enemyInf = 0, allyInf = 0;
    var stone = this.goban.stoneAt(i, j);
    var inf = this.infl[j][i];
    enemyInf += inf[this.enemyColor];
    allyInf += inf[this.color];
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color !== main.EMPTY) return 0;
        inf = this.infl[s.j][s.i];
        enemyInf += inf[this.enemyColor];
        allyInf += inf[this.color];
    }
    var totalInf = 1 + this.inflCoeff * Math.max(enemyInf + allyInf - 3, 0) * (this.gsize / 9);

    var dbX = this.distanceFromBorder(i);
    var dbY = this.distanceFromBorder(j);
    var rowCoeff = [0, 0.2, 0.8, 1, 0.95, 0.8];
    var border = rowCoeff.length - 1;
    if (dbX > border) dbX = border;
    if (dbY > border) dbY = border;
    var db = rowCoeff[dbX] * rowCoeff[dbY] * this.borderCoeff;
    
    // remove points only if we fill up our own territory
    var fillTer = this.territoryScore(i, j, this.color);
    if (fillTer > 0) fillTer = 0; // Pusher will count >0 scores

    return fillTer + db / totalInf;
};

Spacer.prototype.distanceFromBorder = function (n) {
    return Math.min(n - 1, this.gsize - n);
};
