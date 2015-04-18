//Translated from connector.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
// Basic: a move that connects 2 of our groups is good.
// TODO: this could threaten our potential for keeping eyes, review this.
var Heuristic = require('./Heuristic');

/** @class */
function Connector(player) {
    Heuristic.call(this);
    this.inflCoeff = getGene('infl', 0.07, 0.01, 0.5);
    this.allyCoeff1 = getGene('ally-1enemy', 0.33, 0.01, 1.0);
    this.allyCoeff2 = getGene('ally-more-enemies', 1.66, 0.01, 3.0);
}
inherits(Connector, Heuristic);
module.exports = Connector;

Connector.prototype.evalMove = function (i, j) {
    // we care a lot if the enemy is able to cut us,
    // and even more if by connecting we cut them...
    // TODO: the opposite heuristic - a cutter; and make both more clever.
    var stone = this.goban.stoneAt(i, j);
    var enemies = stone.uniqueEnemies(this.color);
    var numEnemies = enemies.length;
    var allies = stone.uniqueAllies(this.color);
    var numAllies = allies.length;
    if (numAllies < 2) { // nothing to connect here
        return 0;
    }
    if (numAllies === 3 && numEnemies === 0) { // in this case we never want to connect unless enemy comes by
        return 0;
    }
    if (numAllies === 4) {
        return 0;
    }
    if (numAllies === 2) {
        var s1, s2;
        s1 = s2 = null;
        var nonUniqueCount = 0;
        for (var s, s_array = stone.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.group === allies[0]) {
                s1 = s;
            }
            if (s.group === allies[1]) {
                s2 = s;
            }
            if (s.color === this.color) {
                nonUniqueCount += 1;
            }
        }
        if (nonUniqueCount === 3 && numEnemies === 0) {
            return 0;
        }
        // Case of diagonal (strong) stones (TODO: handle the case with a 3rd stone in same group than 1 or 2)
        if (nonUniqueCount === 2 && s1.i !== s2.i && s1.j !== s2.j) {
            // No need to connect if both connection points are free
            if (this.goban.empty(s1.i, s2.j) && this.goban.empty(s2.i, s1.j)) {
                return 0;
            }
        }
    }
    switch (numEnemies) {
    case 0:
        var _eval = this.inflCoeff / this.inf.map[j][i][this.color];
        break;
    case 1:
        _eval = this.allyCoeff1 * numAllies;
        break;
    default: 
        _eval = this.allyCoeff2 * numAllies;
    }
    if (main.debug) {
        main.log.debug('Connector gives ' + '%.2f'.format(_eval) + ' to ' + i + ',' + j + ' (allies:' + numAllies + ' enemies: ' + numEnemies + ')');
    }
    return _eval;
};
