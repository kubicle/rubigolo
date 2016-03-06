'use strict';

var CONST = require('../../constants');
var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var Stone = require('../../Stone');

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var NEVER = CONST.NEVER;
var UP = CONST.UP, RIGHT = CONST.RIGHT, DOWN = CONST.DOWN, LEFT = CONST.LEFT;
var DIR0 = CONST.DIR0, DIR3 = CONST.DIR3;

var POT2CHAR = Grid.territory2char;
var POT2OWNER = Grid.territory2owner;

var XY_AROUND = Stone.XY_AROUND;
var XY_DIAGONAL = Stone.XY_DIAGONAL;


/** @class */
function PotentialTerritory(player) {
    Heuristic.call(this, player);

    this.realGrid = new Grid(this.gsize, GRID_BORDER);
    this.realYx = this.realGrid.yx; // simple shortcut to real yx
    // grids below are used in the evaluation process
    this.grids = [new Grid(this.gsize, GRID_BORDER), new Grid(this.gsize, GRID_BORDER)];
    this.reducedGrid = new Grid(this.gsize, GRID_BORDER);
    this.territory = new Grid(this.gsize, GRID_BORDER); // result of evaluation

    this._computeBorderConnectConstants();

    this.allGroups = null;
    this.aliveOdds = [];
    this.deadOdds = [];
}
inherits(PotentialTerritory, Heuristic);
module.exports = PotentialTerritory;


PotentialTerritory.prototype.evalBoard = function () {
    this._initGroupState();
    // update real grid to current goban
    this.realGrid.initFromGoban(this.goban);
    // evaluate 2 "scenarios" - each player plays everywhere *first*
    this._foresee(BLACK);
    this._foresee(WHITE);
    this._mergeTerritoryResults();
};

PotentialTerritory.prototype._initGroupState = function () {
    this.allGroups = this.goban.getAllGroups();

    this.aliveOdds.length = 0;
    this.deadOdds.length = 0;
    for (var ndx in this.allGroups) {
        var gndx = ~~ndx;
        this.aliveOdds[gndx] = this.deadOdds[gndx] = NEVER;
    }
};

PotentialTerritory.prototype._collectGroupState = function () {
    for (var ndx in this.allGroups) {
        var g0 = this.allGroups[~~ndx], gn = g0;
        // follow merge history to get final group g0 ended up into
        while (gn.mergedWith) gn = gn.mergedWith;
        // collect state of final group
        if (gn.killedBy || gn._info.isDead) {
            this.deadOdds[g0.ndx]++;
        } else if (gn._info.isAlive) {
            this.aliveOdds[g0.ndx]++;
        }
    }
};

/** @return {number} - NEVER, SOMETIMES, ALWAYS */
PotentialTerritory.prototype.isOwned = function (i, j, color) {
    var myColor = color === BLACK ? -1 : +1;
    var score = NEVER;
    if (Grid.territory2owner[2 + this.grids[BLACK].yx[j][i]] === myColor) score++;
    if (Grid.territory2owner[2 + this.grids[WHITE].yx[j][i]] === myColor) score++;
    return score;
};

PotentialTerritory.prototype.territoryScore = function (i, j, color) {
    return this.territory.yx[j][i] * (color === BLACK ? 1 : -1);
};

//TODO review this - why 1-color and not both grids?
PotentialTerritory.prototype.enemyTerritoryScore = function (i, j, color) {
    var score = Grid.territory2owner[2 + this.grids[1 - color].yx[j][i]];
    return score * (color === BLACK ? 1 : -1);
};

PotentialTerritory.prototype.toString = function () {
    return '\n+1=white, -1=black, 0=no one\n' +
        this.territory.toText(function (v) { return v === 0 ? '    0' : '%+.1f'.format(v); }) +
        this.territory.toText(function (v) { return POT2CHAR[2 + v * 2]; });
};

PotentialTerritory.prototype.image = function () {
    return this.territory.toLine(function (v) { return POT2CHAR[2 + v * 2]; });
};

// For unit tests
PotentialTerritory.prototype._grid = function (first) {
    return this.grids[first];
};

PotentialTerritory.prototype._foresee = function (color) {
    var moveCount = this.goban.moveNumber();

    var grid = this.grids[color];
    this._connectThings(grid, color); //goban is updated with connecting moves
    this.player.boan.analyseTerritory(this.goban, grid, color);
    this._collectGroupState();

    // restore goban
    moveCount = this.goban.moveNumber() - moveCount;
    while (moveCount-- > 0) this.goban.untry();
};

PotentialTerritory.prototype._mergeTerritoryResults = function () {
    var blackYx = this.grids[BLACK].yx;
    var whiteYx = this.grids[WHITE].yx;
    var terrYx = this.territory.yx;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            terrYx[j][i] = (POT2OWNER[2 + blackYx[j][i]] + POT2OWNER[2 + whiteYx[j][i]]) / 2;
        }
    }
    if (main.debug) main.log.debug('Guessing territory for:\n' + this.realGrid +
        '\nBLACK first:\n' + this.grids[BLACK] + 'WHITE first:\n' + this.grids[WHITE] + this);
};

PotentialTerritory.prototype._connectThings = function (grid, color) {
    this.reducedYx = null;
    // enlarging starts with real grid
    this.enlarge(this.realGrid, grid.copy(this.realGrid), color);

    if (main.debug) main.log.debug('after 1st enlarge (before connectToBorders):\n' + grid);
    this.connectToBorders(grid.yx, color);
    if (main.debug) main.log.debug('after connectToBorders:\n' + grid);

    // for reducing we start from the enlarged grid
    this.reduce(this.reducedGrid.copy(grid));
    this.reducedYx = this.reducedGrid.yx;
    if (main.debug) main.log.debug('after reduce:\n' + this.reducedGrid);

    // now we have the reduced goban, play the enlarge moves again minus the extra
    this.enlarge(this.realGrid, grid.copy(this.realGrid), color);
    if (main.debug) main.log.debug('after 2nd enlarge (before connectToBorders):\n' + grid);
    this.connectToBorders(grid.yx, color);
    if (main.debug) main.log.debug('after connectToBorders:\n' + grid);
};

PotentialTerritory.prototype.enlarge = function (inGrid, outGrid, color) {
    if (main.debug) main.log.debug('---enlarge ' + Grid.colorName(color));
    var inYx = inGrid.yx, outYx = outGrid.yx;
    for (var j = this.gsize; j >= 1; j--) {
        var inYxj = inYx[j];
        for (var i = this.gsize; i >= 1; i--) {
            if (inYxj[i] !== EMPTY) continue;
            this.enlargeAt(inYx, outYx, i, j, color, 1 - color);
        }
    }
};

// Reduces given grid using the real grid as reference.
// We can safely "reduce" if no enemy was around at the end of the enlarging steps.
PotentialTerritory.prototype.reduce = function (grid) {
    var yx = grid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            // cannot reduce a real stone
            if (this.realYx[j][i] !== EMPTY) continue;
            
            var color = yx[j][i];
            // if we did not enlarge here, no need to reduce
            if (color === EMPTY) continue;

            // reduce if no enemy was around
            var enemies = this.inContact(yx, i, j, 1 - color);
            if (enemies === 0) {
                yx[j][i] = EMPTY;
            }
        }
    }
};

// "enlarge" around a given spot
// Note we read and write on separate grids
PotentialTerritory.prototype.enlargeAt = function (inYx, outYx, i, j, first, second) {
    switch (this.inContact(inYx, i, j, first)) {
    case 0: // no ally in line, check diagonal too
        if (!this.diagonalMoveOk(inYx, i, j, first, second)) return;
        break;
    case 4: // no need to fill the void
        return;
    case 3: // fill only if enemy is around
        if (this.inContact(inYx, i, j, second) === 0) return;
    }
    return this.addStone(outYx, i, j, first);
};

// Add a stone on given grid.
// When the reduced grid is known, use it and play moves on goban too.
PotentialTerritory.prototype.addStone = function (yx, i, j, color, border) {
    if (this.reducedYx) {
        // skip if useless move (it was reduced)
        if (!border && this.reducedYx[j][i] === EMPTY) {
            return;
        }
        // we check only against sucicide (e.g. no need to check against ko or non empty)
        var stone = this.goban.stoneAt(i, j);
        if (stone.moveIsSuicide(color)) {
            return;
        }
        this.goban.tryAt(i, j, color);
    }
    yx[j][i] = color;
};

// Returns the number of times we find "color" in contact with i,j
PotentialTerritory.prototype.inContact = function (yx, i, j, color) {
    var num = 0;
    for (var dir = DIR0; dir <= DIR3; dir++) {
        var vect = XY_AROUND[dir];
        if (yx[j + vect[1]][i + vect[0]] === color) {
            num++;
        }
    }
    return num;
};

// Authorises a diagonal move if first color is on a diagonal stone from i,j
// AND if second color is not next to this diagonal stone
PotentialTerritory.prototype.diagonalMoveOk = function (yx, i, j, first, second) {
    for (var v = DIR0; v <= DIR3; v++) {
        var vect = XY_DIAGONAL[v];
        if (yx[j + vect[1]][i + vect[0]] !== first) continue;
        if (yx[j + vect[1]][i] === second || yx[j][i + vect[0]] === second) continue;
        return true;
    }
    return false;
};

// Returns the position of specified border stone
function borderPos(dir, n, gsize) {
    switch (dir) {
    case UP: return [n, 1]; // bottom border
    case RIGHT: return [1, n]; // facing right => left border
    case DOWN: return [n, gsize]; // facing down => top border
    case LEFT: return [gsize, n]; // right border
    }
}

// Done only once
PotentialTerritory.prototype._computeBorderConnectConstants = function () {
    var points = [];
    for (var dir = DIR0; dir <= DIR3; dir++) {
        var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
        for (var n = this.gsize - 1; n >= 2; n--) {
            var p = borderPos(dir, n, this.gsize);
            points.push([p[0], p[1], dx, dy]);
        }
    }
    this.borderPoints = points;
};

/** Makes "obvious" connections to border. Note we must avoid splitting eyes.
 Example for left border: (direction = RIGHT)
 G=GOAL, S=SPOT, L=LEFT, R=RIGHT (left & right could be switched, it does not matter)
 LL0
 L0 L1 L2
 G  S1 S2 S3
 R0 R1 R2
 RR0
 */
PotentialTerritory.prototype.connectToBorders = function (yx, first) {
    var points = this.borderPoints;
    var l0, r0, l1, r1, l2, r2;
    for (var i = points.length - 1; i >=0; i--) {
        var p = points[i];
        var gi = p[0], gj = p[1];
        if (yx[gj][gi] !== EMPTY) continue;
        var dx = p[2], dy = p[3]; // direction from border to center
        var s1i = gi + dx, s1j = gj + dy; // spot 1
        var color = yx[s1j][s1i];
        if (color !== EMPTY) {
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            if (l0 === color || r0 === color) continue; // no need for goal if s0 or r0
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            if (l0 === EMPTY && r0 === EMPTY && l1 === color && r1 === color) continue;
            var ll0 = yx[gj-2*dx][gi-2*dy], rr0 = yx[gj+2*dx][gi+2*dy];
            if (ll0 === color || rr0 === color) continue;
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
        var s2i = s1i + dx, s2j = s1j + dy;
        color = yx[s2j][s2i];
        if (color !== EMPTY) {
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            if (l0 !== 1 - color && l1 === color) continue;
            if (r0 !== 1 - color && r1 === color) continue;
            this.addStone(yx, s1i, s1j, color, true);
            if (l0 === color || r0 === color) continue; // no need for goal if s0 or r0
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
        var s3i = s2i + dx, s3j = s2j + dy;
        color = yx[s3j][s3i];
        if (color !== EMPTY) {
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            l2 = yx[s2j-dx][s2i-dy]; r2 = yx[s2j+dx][s2i+dy];
            if (l0 === color && l1 === color && l2 === color) continue;
            if (r0 === color && r1 === color && r2 === color) continue;
            this.addStone(yx, s2i, s2j, color, true);
            if (l0 === color && l1 === color) continue;
            if (r0 === color && r1 === color) continue;
            this.addStone(yx, s1i, s1j, color, true);
            if (l0 === color || r0 === color) continue; // no need for goal if s0 or r0
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
    }
};
