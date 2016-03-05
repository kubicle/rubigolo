'use strict';

var main = require('../../../main');

var GRID_BORDER = main.GRID_BORDER;
var BORDER = main.BORDER;


/** @class Fills & collect info about zones.
 */
function ZoneFiller(goban, grid) {
    this.goban = goban;
    this.yx = grid.yx;

    this.groups = null;
    this.toReplace = null;
}
module.exports = ZoneFiller;


/**
 * "Colors" a goban zone.
 * @param {number} toReplace - EMPTY, BLACK, WHITE or a zone code
 * @param {number|Void} byColor - if a Void, it will be updated too
 */
ZoneFiller.prototype.fillWithColor = function (i0, j0, toReplace, byColor) {
    if (this.yx[j0][i0] !== toReplace) return 0;
    this.toReplace = toReplace;
    var theVoid = typeof byColor !== 'number' ? byColor : null;
    this.groups = theVoid && theVoid.prepare(i0, j0);
    var vcount = 0, yx = this.yx;
    var gap, gaps = [[i0, j0, j0]], i, j1;

    while ((gap = gaps.pop())) {
        i = gap[0]; j0 = gap[1]; j1 = gap[2];
        
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
                    if (theVoid) theVoid.addVertex(i, j);
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
    if (color === GRID_BORDER || color === BORDER) return false;
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
