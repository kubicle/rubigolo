//Translated from executioner.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
// Executioner only preys on enemy groups in atari
var Heuristic = require('./Heuristic');

/** @class */
function Executioner(player) {
    Heuristic.call(this, player);
}
inherits(Executioner, Heuristic);
module.exports = Executioner;


// In this board, c5 is a "sure death" move
// 5 O@+OO
// 4 O@O@+
// 3 OO@@+
// 2 ++@++
// 1 ++@++
//   abcde
Executioner.prototype.isSureDeath = function (empty, color) {
    var numKill = 0;
    for (var i = empty.neighbors.length - 1; i >= 0; i--) {
        var n = empty.neighbors[i];
        switch (n.color) {
        case main.EMPTY:
            return false;
        case color:
            if (n.group.lives > 1) return false; // TODO: where do we worry about life of group?
            break;
        default:
            if (n.group.lives > 1) break; // not a kill
            if (n.group.stones.length > 1) return false; // kill more than 1 stone
            if (numKill) return false; // kill at least 2 groups (hence more than 1 stone)
            numKill++;
        }
    }
    return true;
};

Executioner.prototype.evalMove = function (i, j) {
    var stone = this.goban.stoneAt(i, j);
    if (this.isSureDeath(stone, this.color)) {
        return this.markMoveAsBlunder(i, j, 'sure death');
    }
    var threat = 0, saving = 0;
    for (var g, g_array = stone.uniqueEnemies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives > 1) { // NB: more than 1 is a job for hunter
            continue;
        }
        threat += this.groupThreat(g);
        for (var ally, ally_array = g.allEnemies(), ally_ndx = 0; ally=ally_array[ally_ndx], ally_ndx < ally_array.length; ally_ndx++) {
            if (ally.lives > 1) {
                continue;
            }
            saving += this.groupThreat(ally);
        }
    }
    if (threat === 0) {
        return 0;
    }
    if (main.debug) {
        main.log.debug('Executioner heuristic found a threat of ' + threat + ' at ' + i + ',' + j);
    }
    if (main.debug && saving > 0) {
        main.log.debug('...this would also save ' + saving);
    }
    return threat + saving;
};
