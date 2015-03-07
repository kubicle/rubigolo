//Translated from potential_territory.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');
var Stone = require('./Stone');
var BoardAnalyser = require('./BoardAnalyser');

/** @class */
function PotentialTerritory(goban) {
    this.goban = goban;
    this.size = goban.size;
    this.boan = new BoardAnalyser();
    this.real_grid = this.goban.scoring_grid; // we can reuse the already allocated grid
    this.real_yx = this.real_grid.yx; // simple shortcut to real yx
    // grids below are used in the evaluation process
    this.grids = [new Grid(goban.size), new Grid(goban.size)];
    this.reduced_grid = new Grid(goban.size);
    this.territory = new Grid(goban.size); // result of evaluation
}
module.exports = PotentialTerritory;

// Returns the matrix of potential territory.
// +1: definitely white, -1: definitely black
// Values in between are possible too.
PotentialTerritory.prototype.guess_territories = function () {
    // update real grid to current goban
    this.real_grid.convert(this.goban.grid);
    // evaluate 2 "scenarios" - each player plays everywhere *first*
    for (var first = 1; first <= 2; first++) {
        this.foresee(this.grids[first], first, 1 - first);
    }
    if (main.debug) {
        main.log.debug('\nBLACK first:\n' + this.grids[0] + 'WHITE first:\n' + this.grids[1]);
    }
    // now merge the result
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            var owner = 0;
            for (var first = 1; first <= 2; first++) {
                var terr_color = this.grids[first].yx[j][i] - Grid.TERRITORY_COLOR;
                if (terr_color === main.WHITE) {
                    owner += 1;
                }
                if (terr_color === main.BLACK) {
                    owner -= 1;
                }
            }
            this.territory.yx[j][i] = owner / 2.0;
        }
    }
    if (main.debug) {
        main.log.debug('\n+1=white, -1=black, 0=no one\n' + this.territory.to_text(function (v) {
            if (v === 0) {
                return '    0';
            } else {
                return sprintf('%+.1f', v);
            }
        }));
    }
    return this.territory.yx;
};

PotentialTerritory.prototype.potential = function () {
    return this.territory;
};

// For unit tests
PotentialTerritory.prototype._grid = function (first) {
    return this.grids[first];
};

//private;
// TODO: add live/dead groups? Maybe not here
PotentialTerritory.prototype.foresee = function (grid, first, second) {
    this.tmp = this.territory; // safe to use it as temp grid here
    this.reduced_yx = null;
    this.move_num_before_enlarge = this.goban.move_number();
    // enlarging starts with real grid
    this.enlarge(this.real_grid, this.tmp.copy(this.real_grid), first, second);
    this.enlarge(this.tmp, grid.copy(this.tmp), second, first);
    this.connect_to_borders(grid.yx);
    if (main.debug) {
        main.log.debug('after 1st enlarge:\n' + this.grid);
    }
    // for reducing we start from the enlarged grid
    this.reduce(this.reduced_grid.copy(grid));
    this.reduced_yx = this.reduced_grid.yx;
    if (main.debug) {
        main.log.debug('after reduce:\n' + grid);
    }
    // now we have the reduced goban, play the enlarge moves again minus the extra
    this.enlarge(this.real_grid, this.tmp.copy(this.real_grid), first, second);
    this.enlarge(this.tmp, grid.copy(this.tmp), second, first);
    this.connect_to_borders(grid.yx);
    if (main.debug) {
        main.log.debug('after 2nd enlarge:');
    }
    if (main.debug) {
        this.goban.debug_display();
    }
    // passed grid will receive the result (scoring grid)
    this.boan.count_score(this.goban, grid.convert(this.goban.grid));
    // restore goban
    for (var i = 1; i <= (this.goban.move_number() - this.move_num_before_enlarge); i++) {
        Stone.undo(this.goban);
    }
};

PotentialTerritory.prototype.enlarge = function (in_grid, out_grid, first, second) {
    if (main.debug) {
        main.log.debug('enlarge ' + first + ',' + second);
    }
    var in_yx = in_grid.yx;
    var out_yx = out_grid.yx;
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            if (in_yx[j][i] !== main.EMPTY) {
                continue;
            }
            this.enlarge_at(in_yx, out_yx, i, j, first, second);
        }
    }
};

// Reduces given grid using the real grid as reference.
PotentialTerritory.prototype.reduce = function (grid) {
    var yx = grid.yx;
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            if (this.real_yx[j][i] !== main.EMPTY) {
                continue;
            } // cannot reduce a real stone
            var color = yx[j][i];
            if (color === main.EMPTY) {
                continue;
            } // we did not enlarge here, no need to reduce
            var enemies = this.in_contact(yx, i, j, 1 - color);
            // we can safely reduce if no enemy was around at the end of the enlarging steps
            if (enemies === 0) {
                yx[j][i] = main.EMPTY;
            }
        }
    }
};

// "enlarge" around a given spot
// Note we read and write on separate grids
PotentialTerritory.prototype.enlarge_at = function (in_yx, out_yx, i, j, first, second) {
    var ss = this.in_contact(in_yx, i, j, first);
    if (ss > 0) {
        if (ss >= 3) {
            return;
        } // if 3 or 4 no need to fill the void
    } else if (!this.diagonal_move_ok(in_yx, i, j, first, second)) {
        return;
    }
    return this.add_stone(out_yx, i, j, first);
};

// Add a stone on given grid.
// When the reduced grid is known, use it and play moves on goban too.
PotentialTerritory.prototype.add_stone = function (yx, i, j, color) {
    if (this.reduced_yx) {
        // skip if useless move (it was reduced)
        if (this.reduced_yx[j][i] === main.EMPTY) {
            return;
        }
        // we check only against sucicide (e.g. no need to check against ko or non empty)
        var stone = this.goban.stone_at(i, j);
        if (stone.move_is_suicide(color)) {
            return;
        }
        Stone.play_at(this.goban, i, j, color);
    }
    yx[j][i] = color;
};

// Returns the number of times we find "color" in contact with i,j
PotentialTerritory.prototype.in_contact = function (yx, i, j, color) {
    var num = 0;
    for (var vect, vect_array = Stone.XY_AROUND, vect_ndx = 0; vect=vect_array[vect_ndx], vect_ndx < vect_array.length; vect_ndx++) {
        if (yx[j + vect[1]][i + vect[0]] === color) {
            num += 1;
        }
    }
    return num;
};

// Authorises a diagonal move if first color is on a diagonal stone from i,j
// AND if second color is not next to this diagonal stone
PotentialTerritory.prototype.diagonal_move_ok = function (yx, i, j, first, second) {
    for (var vect, vect_array = Stone.XY_DIAGONAL, vect_ndx = 0; vect=vect_array[vect_ndx], vect_ndx < vect_array.length; vect_ndx++) {
        if (yx[j + vect[1]][i + vect[0]] !== first) {
            continue;
        }
        if (yx[j + vect[1]][i] === second || yx[j][i + vect[0]] === second) {
            continue;
        }
        if (main.debug && i === 1 && j === 9) {
            main.log.debug('diagonal_move_ok: ' + i + ',' + j + ' for ' + first);
        }
        return true;
    }
    return false;
};

PotentialTerritory.AROUND = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 0, -1, 0], [-1, 0, 1, 0]]; // TODO replace this by pre-computed coords
// connect stones close to borders to the border
PotentialTerritory.prototype.connect_to_borders = function (yx) {
    for (var n = 2; n <= this.size - 1; n++) {
        for (var c, c_array = PotentialTerritory.AROUND, c_ndx = 0; c=c_array[c_ndx], c_ndx < c_array.length; c_ndx++) {
            var i = (( c[0] < 0 ? this.size : c[0] * n )) + c[1]; // n,1,n,size
            var j = (( c[2] < 0 ? this.size : c[2] * n )) + c[3]; // 1,n,size,n
            if (yx[j][i] === main.EMPTY) {
                var i2 = (( c[0] < 0 ? this.size - 1 : c[0] * n )) + c[1] * 2; // n,2,n,size-1
                var j2 = (( c[2] < 0 ? this.size - 1 : c[2] * n )) + c[3] * 2; // 2,n,size-1,n
                var i3 = (( c[0] < 0 ? this.size : c[0] * (n + 1) )) + c[1]; // n+1,1,n+1,size
                var j3 = (( c[2] < 0 ? this.size : c[2] * (n + 1) )) + c[3]; // 1,n+1,size,n+1
                var i4 = (( c[0] < 0 ? this.size : c[0] * (n - 1) )) + c[1]; // n-1,1,n-1,size
                var j4 = (( c[2] < 0 ? this.size : c[2] * (n - 1) )) + c[3]; // 1,n-1,size,n-1
                var next2border = yx[j2][i2];
                if (next2border !== main.EMPTY && yx[j3][i3] === main.EMPTY && yx[j4][i4] === main.EMPTY) {
                    this.add_stone(yx, i, j, next2border);
                }
            }
        } // if @goban.empty?(i,1) //   next2border = @goban.stone_at?(i,2).color //   if next2border != EMPTY and @goban.empty?(i+1,1) and @goban.empty?(i-1,1) //     Stone.play_at(@goban,i,1,next2border) //   end // end // if @goban.empty?(1,i) //   next2border = @goban.stone_at?(2,i).color //   if next2border != EMPTY and @goban.empty?(1,i+1) and @goban.empty?(1,i-1) //     Stone.play_at(@goban,1,i,next2border) //   end // end // if @goban.empty?(i,@size) //   next2border = @goban.stone_at?(i,@size-1).color //   if next2border != EMPTY and @goban.empty?(i+1,@size) and @goban.empty?(i-1,@size) //     Stone.play_at(@goban,i,@size,next2border) //   end // end // if @goban.empty?(@size,i) //   next2border = @goban.stone_at?(@size-1,i).color //   if next2border != EMPTY and @goban.empty?(@size,i+1) and @goban.empty?(@size,i-1) //     Stone.play_at(@goban,@size,i,next2border) //   end // end
    }
};
