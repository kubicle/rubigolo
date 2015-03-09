//Translated from zone_filler.rb using babyruby2js
'use strict';

var main = require('./main');
//public read-only attribute: grid;
// if a grid is given, it is used as starting point; 
// otherwise, the goban scoring_grid is used.

/** @class */
function ZoneFiller(goban, grid) {
    if (grid === undefined) grid = null;
    if (!grid) {
        grid = goban.scoring_grid.convert(goban.grid);
    }
    // $log.debug("ZoneFiller.new \n"+grid.to_s) if $debug
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
ZoneFiller.prototype.fill_with_color = function (start_i, start_j, to_replace, color, neighbors) {
    if (neighbors === undefined) neighbors = null;
    // $log.debug("fill #{start_i} #{start_j}; replace #{to_replace} with #{color}") if $debug
    if (this.yx[start_j][start_i] !== to_replace) {
        return 0;
    }
    var size = 0;
    this.to_replace = to_replace;
    this.groups = neighbors;
    var gaps = [[start_i, start_j, start_j]];
    var gap;
    while ((gap = gaps.pop())) {
        // $log.debug("About to do gap: #{gap} (left #{gaps.size})") if $debug
        var i, j0, j1;
        var _m = gap;
        i = _m[0];
        j0 = _m[1];
        j1 = _m[2];
        
        if (this.yx[j0][i] !== to_replace) {
            continue;
        } // gap already done by another path
        while (this._check(i, j0 - 1)) {
            j0 -= 1;
        }
        while (this._check(i, j1 + 1)) {
            j1 += 1;
        }
        size += j1 - j0 + 1;
        // $log.debug("Doing column #{i} from #{j0}-#{j1}") if $debug
        for (var ix = (i - 1); ix <= i + 1; ix += 2) {
            var curgap = null;
            for (var j = j0; j <= j1; j++) {
                // $log.debug("=>coloring #{i},#{j}") if $debug and ix<i
                if (ix < i) {
                    this.yx[j][i] = color;
                }
                // $log.debug("checking neighbor #{ix},#{j}") if $debug
                if (this._check(ix, j)) {
                    if (!curgap) {
                        // $log.debug("New gap in #{ix} starts at #{j}") if $debug
                        curgap = j; // gap start
                    }
                } else if (curgap) {
                    // $log.debug("--- pushing gap [#{ix},#{curgap},#{j-1}]") if $debug
                    gaps.push([ix, curgap, j - 1]);
                    curgap = null;
                }
            }
            // upto j
            // $log.debug("--- pushing gap [#{ix},#{curgap},#{j1}]") if $debug and curgap
            if (curgap) {
                gaps.push([ix, curgap, j1]);
            } // last gap
        } // each ix
    }
    // while gap
    return size;
};

//private;
// Returns true if the replacement is needed (=> i,j has a color equal to the replaced one)
ZoneFiller.prototype._check = function (i, j) {
    var color = this.yx[j][i];
    if (color === main.BORDER) {
        return false;
    }
    if (color === this.to_replace) {
        return true;
    }
    if (this.groups && color < 2) {
        var group = this.goban.stone_at(i, j).group;
        if (group && !this.groups[color].find_index(group)) {
            this.groups[color].push(group);
        }
    }
    return false;
};
