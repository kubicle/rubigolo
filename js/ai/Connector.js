//Translated from connector.rb using babyruby2js
'use strict';

var main = require('../main');
var Grid = require('../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY;


/** @class A move that connects 2 of our groups is good.
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
    return this.connectsMyGroups(i, j, this.color) +
           this.connectsMyGroups(i, j, 1 - this.color);
};

Connector.prototype.connectsMyGroups = function (i, j, color) {
    // TODO: one other way to connect 2 groups is to "protect" the cutting point; handle this here
    var stone = this.goban.stoneAt(i, j);
    var s1, s1b, s2, s2b, s3;
    var numStones = 0, numEnemies = 0;
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case main.EMPTY: continue;
        case color:
            numStones++;
            if (!s1) {
                s1 = s;
            } else if (!s2) {
                if (s.group !== s1.group) s2 = s; else s1b = s;
            } else {
                if (s.group !== s2.group) s3 = s; else s2b = s;
            }
            break;
        default: numEnemies++;
        }
    }
    if (!s2) return 0; // nothing to connect here
    if (numStones === 4) return 0; // 1 empty between 4 stones; never connect unless forced to
    // 3 of our stones around: no need to connect unless enemy comes by or threatens
    if (numStones === 3 && numEnemies === 0 &&
        s1.group.lives > 1 && s2.group.lives > 1 && (!s3 || s3.group.lives > 1)) return 0;

    var numGroups = s3 ? 3 : 2;
    // if 3rd stone in same group than 1 or 2; we keep the diagonal ones
    if (numGroups === 2 && numStones === 3) {
        if (s2b) { s1b = s2b; var swap = s1; s1 = s2; s2 = swap; }
        if (s1.i === s2.i || s1.j === s2.j) s1 = s1b;
    }
    // Case of diagonal (strong) stones
    if (s1.i !== s2.i && s1.j !== s2.j) {
        // no need to connect now if connection is granted
        if (this.distanceBetweenStones(s1, s2, color) === 0) return 0;
        // We count the cutting stone as enemy (we did not "see" it above because it's diagonal)
        numEnemies++;
    }
    var score;
    if (numEnemies === 0) {
        score = this.inflCoeff / this.inf.map[j][i][color];
    } else {
        score = this.allyCoeff1 * numGroups;
    }
    if (main.debug) main.log.debug('Connector for ' + Grid.colorName(color) + ' gives ' + score.toFixed(3) + ' to ' + i + ',' + j +
        ' (allies:' + numGroups + ' enemies: ' + numEnemies + ')');
    return score;
};
