//Translated from potential_territory.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');
var Stone = require('./Stone');
var BoardAnalyser = require('./BoardAnalyser');

/** @class */
function PotentialTerritory(goban) {
    this.goban = goban;
    this.gsize = goban.gsize;
    this.boan = new BoardAnalyser();
    this.realGrid = this.goban.scoringGrid; // we can reuse the already allocated grid
    this.realYx = this.realGrid.yx; // simple shortcut to real yx
    // grids below are used in the evaluation process
    this.grids = [new Grid(this.gsize), new Grid(this.gsize)];
    this.reducedGrid = new Grid(this.gsize);
    this.territory = new Grid(this.gsize); // result of evaluation
}
module.exports = PotentialTerritory;

// Returns the matrix of potential territory.
// +1: definitely white, -1: definitely black
// Values in between are possible too.
PotentialTerritory.prototype.guessTerritories = function () {
    // update real grid to current goban
    this.realGrid.convert(this.goban.grid);
    // evaluate 2 "scenarios" - each player plays everywhere *first*
    for (var first = 1; first <= 2; first++) {
        this.foresee(this.grids[first], first, 1 - first);
    }
    if (main.debug) {
        main.log.debug('\nBLACK first:\n' + this.grids[0] + 'WHITE first:\n' + this.grids[1]);
    }
    // now merge the result
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var owner = 0;
            for (first = 1; first <= 2; first++) {
                var terrColor = this.grids[first].yx[j][i] - Grid.TERRITORY_COLOR;
                if (terrColor === main.WHITE) {
                    owner += 1;
                }
                if (terrColor === main.BLACK) {
                    owner -= 1;
                }
            }
            this.territory.yx[j][i] = owner / 2.0;
        }
    }
    if (main.debug) {
        main.log.debug('\n+1=white, -1=black, 0=no one\n' + this.territory.toText(function (v) {
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
    this.reducedYx = null;
    this.moveNumBeforeEnlarge = this.goban.moveNumber();
    // enlarging starts with real grid
    this.enlarge(this.realGrid, this.tmp.copy(this.realGrid), first, second);
    this.enlarge(this.tmp, grid.copy(this.tmp), second, first);
    this.connectToBorders(grid.yx);
    if (main.debug) {
        main.log.debug('after 1st enlarge:\n' + this.grid);
    }
    // for reducing we start from the enlarged grid
    this.reduce(this.reducedGrid.copy(grid));
    this.reducedYx = this.reducedGrid.yx;
    if (main.debug) {
        main.log.debug('after reduce:\n' + grid);
    }
    // now we have the reduced goban, play the enlarge moves again minus the extra
    this.enlarge(this.realGrid, this.tmp.copy(this.realGrid), first, second);
    this.enlarge(this.tmp, grid.copy(this.tmp), second, first);
    this.connectToBorders(grid.yx);
    if (main.debug) {
        main.log.debug('after 2nd enlarge:');
    }
    if (main.debug) {
        this.goban.debugDisplay();
    }
    // passed grid will receive the result (scoring grid)
    this.boan.countScore(this.goban, grid.convert(this.goban.grid));
    // restore goban
    for (var _i = 1; _i <= (this.goban.moveNumber() - this.moveNumBeforeEnlarge); _i++) {
        Stone.undo(this.goban);
    }
};

PotentialTerritory.prototype.enlarge = function (inGrid, outGrid, first, second) {
    if (main.debug) {
        main.log.debug('enlarge ' + first + ',' + second);
    }
    var inYx = inGrid.yx;
    var outYx = outGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (inYx[j][i] !== main.EMPTY) {
                continue;
            }
            this.enlargeAt(inYx, outYx, i, j, first, second);
        }
    }
};

// Reduces given grid using the real grid as reference.
PotentialTerritory.prototype.reduce = function (grid) {
    var yx = grid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (this.realYx[j][i] !== main.EMPTY) { // cannot reduce a real stone
                continue;
            }
            var color = yx[j][i];
            if (color === main.EMPTY) { // we did not enlarge here, no need to reduce
                continue;
            }
            var enemies = this.inContact(yx, i, j, 1 - color);
            // we can safely reduce if no enemy was around at the end of the enlarging steps
            if (enemies === 0) {
                yx[j][i] = main.EMPTY;
            }
        }
    }
};

// "enlarge" around a given spot
// Note we read and write on separate grids
PotentialTerritory.prototype.enlargeAt = function (inYx, outYx, i, j, first, second) {
    var ss = this.inContact(inYx, i, j, first);
    if (ss > 0) {
        if (ss >= 3) { // if 3 or 4 no need to fill the void
            return;
        }
    } else if (!this.diagonalMoveOk(inYx, i, j, first, second)) {
        return;
    }
    return this.addStone(outYx, i, j, first);
};

// Add a stone on given grid.
// When the reduced grid is known, use it and play moves on goban too.
PotentialTerritory.prototype.addStone = function (yx, i, j, color) {
    if (this.reducedYx) {
        // skip if useless move (it was reduced)
        if (this.reducedYx[j][i] === main.EMPTY) {
            return;
        }
        // we check only against sucicide (e.g. no need to check against ko or non empty)
        var stone = this.goban.stoneAt(i, j);
        if (stone.moveIsSuicide(color)) {
            return;
        }
        Stone.playAt(this.goban, i, j, color);
    }
    yx[j][i] = color;
};

// Returns the number of times we find "color" in contact with i,j
PotentialTerritory.prototype.inContact = function (yx, i, j, color) {
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
PotentialTerritory.prototype.diagonalMoveOk = function (yx, i, j, first, second) {
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
PotentialTerritory.prototype.connectToBorders = function (yx) {
    for (var n = 2; n <= this.gsize - 1; n++) {
        for (var c, c_array = PotentialTerritory.AROUND, c_ndx = 0; c=c_array[c_ndx], c_ndx < c_array.length; c_ndx++) {
            var i = (( c[0] < 0 ? this.gsize : c[0] * n )) + c[1]; // n,1,n,gsize
            var j = (( c[2] < 0 ? this.gsize : c[2] * n )) + c[3]; // 1,n,gsize,n
            if (yx[j][i] === main.EMPTY) {
                var i2 = (( c[0] < 0 ? this.gsize - 1 : c[0] * n )) + c[1] * 2; // n,2,n,gsize-1
                var j2 = (( c[2] < 0 ? this.gsize - 1 : c[2] * n )) + c[3] * 2; // 2,n,gsize-1,n
                var i3 = (( c[0] < 0 ? this.gsize : c[0] * (n + 1) )) + c[1]; // n+1,1,n+1,gsize
                var j3 = (( c[2] < 0 ? this.gsize : c[2] * (n + 1) )) + c[3]; // 1,n+1,gsize,n+1
                var i4 = (( c[0] < 0 ? this.gsize : c[0] * (n - 1) )) + c[1]; // n-1,1,n-1,gsize
                var j4 = (( c[2] < 0 ? this.gsize : c[2] * (n - 1) )) + c[3]; // 1,n-1,gsize,n-1
                var next2border = yx[j2][i2];
                if (next2border !== main.EMPTY && yx[j3][i3] === main.EMPTY && yx[j4][i4] === main.EMPTY) {
                    this.addStone(yx, i, j, next2border);
                }
            }
        }
    }
};

// E02: unknown method sprintf(...)