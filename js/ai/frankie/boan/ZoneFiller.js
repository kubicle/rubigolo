//Translated from zone_filler.rb using babyruby2js
'use strict';

var CONST = require('../../../constants');

var GRID_BORDER = CONST.GRID_BORDER;
var BORDER = CONST.BORDER;


/** @class public read-only attribute: grid
 *  if a grid is given, it is used as starting point; 
 *  otherwise, the goban scoring_grid is used.
 */
function ZoneFiller(goban, grid) {
    if (!grid) {
        grid = goban.scoringGrid.initFromGoban(goban);
    }
    this.goban = goban;
    this.grid = grid;
    this.yx = grid.yx;
    this.groups = null;
}
module.exports = ZoneFiller;


// "Color" a goban zone.
// to_replace can be EMPTY or a zone code (but cannot be a real color like BLACK)
// neighbors, if given should be an array of n arrays, with n == number of colors
// if neighbors are not given, we do simple "coloring"
ZoneFiller.prototype.fillWithColor = function (startI, startJ, toReplace, color, neighbors) {
    if (this.yx[startJ][startI] !== toReplace) return 0;
    var vcount = 0;
    this.toReplace = toReplace;
    this.groups = neighbors;
    var gap, gaps = [[startI, startJ, startJ]];

    while ((gap = gaps.pop())) {
        var i = gap[0], j0 = gap[1], j1 = gap[2];
        
        if (this.yx[j0][i] !== toReplace) continue; // gap already done by another path

        while (this._check(i, j0 - 1)) j0--;
        while (this._check(i, j1 + 1)) j1++;

        vcount += j1 - j0 + 1;
        for (var ix = i - 1; ix <= i + 1; ix += 2) {
            var curgap = null;
            for (var j = j0; j <= j1; j++) {
                if (ix < i) this.yx[j][i] = color;
                if (this._check(ix, j)) {
                    if (!curgap) {
                        curgap = j; // gap start
                    }
                } else if (curgap) {
                    gaps.push([ix, curgap, j - 1]);
                    curgap = null;
                }
            } // for j
            if (curgap) gaps.push([ix, curgap, j1]); // last gap
        } // for ix
    } // while gap
    return vcount;
};

//private

// Returns true if the replacement is needed (=> i,j has a color equal to the replaced one)
ZoneFiller.prototype._check = function (i, j) {
    var color = this.yx[j][i];
    if (color === GRID_BORDER || color === BORDER) return false;
    if (color === this.toReplace) return true;

    if (this.groups && color < 2) {
        var group = this.goban.stoneAt(i, j).group;
        if (group && this.groups[color].indexOf(group) < 0) {
            this.groups[color].push(group);
        }
    }
    return false;
};
