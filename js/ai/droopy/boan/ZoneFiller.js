//Translated from zone_filler.rb using babyruby2js
'use strict';

var main = require('../../../main');

var BORDER = main.BORDER, WHITE = main.WHITE;


/** @class Fills & collect info about zones.
 */
function ZoneFiller(goban, grid) {
    this.goban = goban;
    this.grid = grid;
    this.yx = this.grid.yx;
    this.groups = null;

    this.toReplace = this.groups = null;
}
module.exports = ZoneFiller;


// "Color" a goban zone.
// toReplace can be EMPTY, BLACK, WHITE or a zone code
// neighbors, if given should be an array of n arrays, with n == number of colors
// if neighbors are not given, we do simple "coloring"
ZoneFiller.prototype.fillWithColor = function (startI, startJ, toReplace, byColor, neighbors) {
    if (this.yx[startJ][startI] !== toReplace) return 0;
    var vcount = 0, yx = this.yx;
    this.toReplace = toReplace;
    this.groups = neighbors;
    var gap, gaps = [[startI, startJ, startJ]];

    while ((gap = gaps.pop())) {
        var i = gap[0], j0 = gap[1], j1 = gap[2];
        
        if (yx[j0][i] !== toReplace) continue; // gap already done by another path

        while (this._check(i, j0 - 1)) j0--;
        while (this._check(i, j1 + 1)) j1++;

        vcount += j1 - j0 + 1;
        // Doing column i from j0 to j1
        for (var ix = i - 1; ix <= i + 1; ix += 2) {
            var curgap = null;
            for (var j = j0; j <= j1; j++) {
                if (ix < i) {
                    yx[j][i] = byColor; // fill with color
                }
                if (this._check(ix, j)) {
                    if (!curgap) {
                        // New gap in ix starts at j
                        curgap = j; // gap start
                    }
                } else if (curgap) {
                    gaps.push([ix, curgap, j - 1]);
                    curgap = null;
                }
            }
            if (curgap) gaps.push([ix, curgap, j1]); // last gap
        }
    }
    return vcount;
};

// Returns true if the replacement is needed (=> i,j has a color equal to the replaced one)
ZoneFiller.prototype._check = function (i, j) {
    var color = this.yx[j][i];
    if (color === BORDER) return false;
    if (color === this.toReplace) {
        return true;
    }

    if (!this.groups) return false; // we don't want the groups surrounding zones
    if (typeof color !== 'number') return false; // i,j is part of a void

    // keep new neighbors
    var group = this.goban.stoneAt(i, j).group;
    if (!group) throw new Error('Unexpected: ZoneFiller replacing a group'); // (since i,j is EMPTY)
    var groups = this.groups[color];
    if (groups.indexOf(group) === -1) groups.push(group);

    return false;
};
