'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALWAYS = main.ALWAYS;


/** @class public read-only attribute: map
 */
function Influence(player) {
    Heuristic.call(this, player);

    this.deadFactor = this.getGene('deadFactor', 0.23, 0.01, 1);

    var size = this.gsize + 1;
    this.map = Array.new(size, function () {
        return Array.new(size, function () {
            return [0, 0];
        });
    });
    // Share the map with others at player level - TODO: find better place
    player.infl = this.map;
}
inherits(Influence, Heuristic);
module.exports = Influence;


Influence.prototype._clear = function () {
    for (var j = this.gsize; j >= 1; j--) {
        var mapj = this.map[j];
        for (var i = this.gsize; i >= 1; i--) {
            var mapji = mapj[i];
            mapji[BLACK] = mapji[WHITE] = 0;
        }
    }
};

Influence.prototype.evalBoard = function () {
    this._clear();
    var influence = [4, 2, 1];
    // First we get stones' direct influence
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var stone = this.goban.stoneAt(i, j);
            var color = stone.color;
            if (color === EMPTY) continue;
            // a dying group must have a much small influence (but maybe not 0)
            var deadFactor = stone.group.xDead === ALWAYS ? this.deadFactor : 1;

            this.map[j][i][color] += influence[0] * deadFactor; // on the stone itself

            // Then we propagate it decreasingly with distance
            for (var n1, n1_array = stone.neighbors, n1_ndx = 0; n1=n1_array[n1_ndx], n1_ndx < n1_array.length; n1_ndx++) {
                if (n1.color !== EMPTY) continue;

                this.map[n1.j][n1.i][color] += influence[1] * deadFactor; // 2nd level

                for (var n2, n2_array = n1.neighbors, n2_ndx = 0; n2=n2_array[n2_ndx], n2_ndx < n2_array.length; n2_ndx++) {
                    if (n2.color !== EMPTY) continue;
                    if (n2 === stone) continue; // we are looking again at initial stone; skip it

                    this.map[n2.j][n2.i][color] += influence[2] * deadFactor; // 3rd level
                }
            }
        }
    }
    if (main.debug) this.debugDump();
};

Influence.prototype.debugDump = function () {
    var c;
    function inf2str(inf) {
        return ('     ' + inf[c].toFixed(2).chomp('0').chomp('0').chomp('.')).slice(-6);
    }

    for (c = BLACK; c <= WHITE; c++) {
        main.log.debug('Influence map for ' + Grid.COLOR_NAMES[c] + ':');
        for (var j = this.gsize; j >= 1; j--) {
            main.log.debug('%2d'.format(j) + ' ' +
                this.map[j].slice(1, this.gsize + 1).map(inf2str).join('|'));
        }
        var cols = '   ';
        for (var i = 1; i <= this.gsize; i++) { cols += '     ' + Grid.xLabel(i) + ' '; }
        main.log.debug(cols);
    }
};
