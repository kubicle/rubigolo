'use strict';

var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BLACK = CONST.BLACK, WHITE = CONST.WHITE;

// Influence depending on distance to a stone
var INF_AT_1 = 2, INF_AT_2 = 1; // NB: making them genes does not seem to make sense


/** @class
 *  public read-only attribute: infl
 */
function Influence(player) {
    Heuristic.call(this, player);

    this.grids = [
        new Grid(this.gsize, GRID_BORDER),
        new Grid(this.gsize, GRID_BORDER)
    ];

    this.infl = [this.grids[BLACK].yx, this.grids[WHITE].yx];
}
inherits(Influence, Heuristic);
module.exports = Influence;


Influence.prototype.evalBoard = function () {
    this.grids[BLACK].init(0);
    this.grids[WHITE].init(0);

    // First we get stones' direct influence
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var stone = this.goban.stoneAt(i, j);
            var color = stone.color;
            if (color === EMPTY) continue;
            var yx = this.infl[color];

            // Then we propagate it decreasingly with distance
            for (var n1, n1_array = stone.neighbors, n1_ndx = 0; n1=n1_array[n1_ndx], n1_ndx < n1_array.length; n1_ndx++) {
                if (n1.color !== EMPTY) continue;

                yx[n1.j][n1.i] += INF_AT_1; // 2nd level

                for (var n2, n2_array = n1.neighbors, n2_ndx = 0; n2=n2_array[n2_ndx], n2_ndx < n2_array.length; n2_ndx++) {
                    if (n2.color !== EMPTY) continue;
                    if (n2 === stone) continue; // we are looking again at initial stone; skip it

                    yx[n2.j][n2.i] += INF_AT_2; // 3rd level
                }
            }
        }
    }
};
