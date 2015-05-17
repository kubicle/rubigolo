//Translated from connector.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Heuristic = require('./Heuristic');

/** @class A move that connects 2 of our groups is good.
 *  TODO: this could threaten our potential for keeping eyes, review this.
 */
function Connector(player) {
    Heuristic.call(this, player);
    this.inflCoeff = this.getGene('infl', 0.07, 0.01, 0.5);
    this.allyCoeff1 = this.getGene('ally-1enemy', 0.33, 0.01, 1.0);
    this.allyCoeff2 = this.getGene('ally-more-enemies', 1.66, 0.01, 3.0);
}
inherits(Connector, Heuristic);
module.exports = Connector;

Connector.prototype.evalMove = function (i, j) {
    // we care a lot if the enemy is able to cut us,
    // and even more if by connecting we cut them...
    // TODO: the opposite heuristic - a cutter; and make both more clever.
    // TODO: one other way to connect 2 groups is to "protect" the cutting point; handle this here
    var stone = this.goban.stoneAt(i, j);
    var allies = stone.uniqueAllies(this.color);
    var numGroups = allies.length;

    if (numGroups < 2) return 0; // nothing to connect here

    var s1, s2; // we will get stone 1 & 2 for cases with 2 groups connecting
    var numStones = 0, numEnemies = 0;
    for (var s, s_array = stone.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        switch (s.group) {
        case null: continue;
        case allies[0]: s1 = s; break;
        case allies[1]: s2 = s;
        }
        if (s.color === this.color) numStones++;
        else numEnemies++;
    }
    if (numStones === 4) return 0;
    // 3 of our stones around: no need to connect unless enemy comes by
    if (numGroups === 3 && numEnemies === 0) return 0;

    // Case of diagonal (strong) stones (TODO: handle the case with a 3rd stone in same group than 1 or 2)
    if (numStones === 2 && s1.i !== s2.i && s1.j !== s2.j) {
        // No need to connect if both connection points are free (no cutting stone yet)
        if (this.goban.empty(s1.i, s2.j) && this.goban.empty(s2.i, s1.j)) return 0;
        // We count the cutting stone as enemy
        numEnemies++;
    }

    switch (numEnemies) {
    case 0:
        var _eval = this.inflCoeff / this.inf.map[j][i][this.color];
        break;
    case 1:
        _eval = this.allyCoeff1 * numGroups;
        break;
    default: 
        _eval = this.allyCoeff2 * numGroups;
    }
    if (main.debug) {
        main.log.debug('Connector gives ' + '%.2f'.format(_eval) + ' to ' + i + ',' + j +
            ' (allies:' + numGroups + ' enemies: ' + numEnemies + ')');
    }
    return _eval;
};
