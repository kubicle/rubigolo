//Translated from spacer.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
// Vague idea that playing where we already have influence is moot.
var Heuristic = require('./Heuristic');

/** @class */
function Spacer(player) {
    Heuristic.call(this, player);
    this.inflCoeff = this.getGene('infl', 2.0, 0.0, 8.0);
    this.cornerCoeff = this.getGene('corner', 2.0, 0.0, 8.0);
}
inherits(Spacer, Heuristic);
module.exports = Spacer;

Spacer.prototype.evalMove = function (i, j) {
    var enemyInf, allyInf;
    enemyInf = allyInf = 0;
    var stone = this.goban.stoneAt(i, j);
    var inf = this.inf.map[j][i];
    enemyInf += inf[this.enemyColor];
    allyInf += inf[this.color];
    for (var s, s_array = stone.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        inf = this.inf.map[s.j][s.i];
        enemyInf += inf[this.enemyColor];
        allyInf += inf[this.color];
    }
    var totalInf = enemyInf + allyInf;
    var corner = 3;
    var dbX = this.distanceFromBorder(i);
    var dbY = this.distanceFromBorder(j);
    var dcX = 1 + Math.abs((dbX - corner));
    var dcY = 1 + Math.abs((dbY - corner));
    var dc = dcX + dcY;
    // hacky: why play on border if no one is around?
    if (dbX < 2) {
        totalInf += (20 * (2 - dbX)) / (totalInf + 1);
    }
    if (dbY < 2) {
        totalInf += (20 * (2 - dbY)) / (totalInf + 1);
    }
    // TESTME
    // remove points only if we fill up our own territory
    var ter = this.ter.potential().yx;
    var fillOwnTer = ( this.color === main.BLACK ? ter[j][i] : -ter[j][i] );
    if (fillOwnTer > 0) { // filling up enemy's space is not looked at here
        fillOwnTer = 0;
    }
    if (main.debug && fillOwnTer !== 0) {
        main.log.debug('Spacer sees potential territory score ' + fillOwnTer + ' in ' + i + ',' + j);
    }
    return fillOwnTer + 1.33 / (totalInf * this.inflCoeff + dc * this.cornerCoeff + 1);
};

Spacer.prototype.distanceFromBorder = function (n) {
    return Math.min(n - 1, this.gsize - n);
};
