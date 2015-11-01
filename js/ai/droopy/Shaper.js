'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY, sOK = main.sOK;
var SOMETIMES = main.SOMETIMES, ALWAYS = main.ALWAYS;


/** @class Cares about good shapes
 */
function Shaper(player) {
    Heuristic.call(this, player);

    this.eyeCloserCoeff = this.getGene('eye-closer', 1, 0.01, 1);

    this.potEyeGrid = new Grid(this.gsize);
}
inherits(Shaper, Heuristic);
module.exports = Shaper;


Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    this.potEyeGrid.init();
    this._findPotentialEyes(stateYx);

    var allGroups = this.pot.allGroups;
    for (var ndx in allGroups) {
        var g = allGroups[~~ndx];
        if (g.isDead === ALWAYS || g.isAlive === ALWAYS) continue;

        this._evalSingleEyeSplit(scoreYx, g);
    }
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx);
};

Shaper.prototype._findPotentialEyes = function (stateYx) {
    var potEyeYx = this.potEyeGrid.yx;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            var state = stateYx[j][i];
            if (state < sOK) continue;

            var color = this.eyePotential(i, j);
            if (color === null) continue;

            var stone = this.goban.stoneAt(i, j), neighbors = stone.neighbors;
            var closeToAnotherEye = false, ally = null;
            for (var n = neighbors.length - 1; n >= 0; n--) {
                var s = neighbors[n];
                if (potEyeYx[s.j][s.i] === color) {
                    closeToAnotherEye = true;
                    break;
                }
                if (s.color === color) ally = s.group;
            }
            if (closeToAnotherEye || !ally) continue;

            potEyeYx[j][i] = color;
            ally._info.addPotentialEye(stone);
        }
    }
};

Shaper.prototype._evalSingleEyeSplit = function (scoreYx, g) {
    var gi = g._info;
    if (gi.eyeCount !== 1) return;
    var eye = gi.getSingleEye(); // TODO: if depending group is on a side of eye, 1 vertex will be lost
    if (!eye) return;
    var coords = [];
    var alive = Shaper.getEyeMakerMove(this.goban, eye.i, eye.j, eye.vcount, coords);
    if (alive !== 1) return;
    var i = coords[0], j = coords[1];
    var score = this.scoreGrid.yx[j][i] = this.groupThreat(g, this.color === g.color);
    scoreYx[j][i] += score;
};

// Decides if a "void" is good to make 2 eyes.
//   i,j is one free vertex of the void
//   vcount is the number of empties in the void
// Returns:
//   0 => cannot make 2 eyes
//   1 => can make 2 eyes if we play now (coords will receive [i,j])
//   2 => can make 2 eyes even if opponent plays first
Shaper.getEyeMakerMove = function (goban, i, j, vcount, coords) {
    if (vcount <= 2) return 0;
    if (vcount >= 7) return 2;

    var s1 = goban.stoneAt(i, j);
    var empties = s1.empties();
    if (vcount === 3) {
        var center = empties.length === 1 ? empties[0] : s1;
        coords[0] = center.i; coords[1] = center.j;
        return 1;
    }
    if (vcount === 4) {
        // verify the 4 empties are not a "square" shape (anything else works)
        if (empties.length === 3) { // "T" shape - s1 is at center
            coords[0] = s1.i; coords[1] = s1.j;
            return 1;
        }
        if (empties.length === 1) {
            if (empties[0].numEmpties() === 3) { // "T" shape - s1 is one extremity
                coords[0] = empties[0].i; coords[1] = empties[0].j;
                return 1;
            }
            return 2; // "Z" shape - s1 is one extremity
        }
        // s1 has 2 empty neighbors
        if (empties[0].numEmpties() === 2 && empties[1].numEmpties() === 2) {
            return 0; // square shape - each empty has 2 neighbors
        }
        return 2; // "Z" shape - s1 is one of the 2 at "center"
    }
    if (vcount === 5) {
        // FIXME: use a new method to get all empties and sort them by # neighbors
        // 4-1-1-1-1 if one has 4 neighbors this is a "+" shape and center is must-play now (1)
        // 2-2-2-1-1 if none has 3 this is a "line" = (2)
        // 3-2-2-2-1 if one has 3 and only 1 has 1, then 3 is must-play (1)
        // pick the only one with 3 neighbors
        return 2;
    }
    // vcount === 6
    // FIXME
    // 3-3-2-2-2-2 (1) aim at one of the 3
    // anything else is (2)
    return 2;
};

Shaper.prototype._evalMove = function (i, j, color) {
    return this.eyeCloserCoeff * (this._eyeCloser(i, j, color) + this._eyeCloser(i, j, 1 - color));
};

Shaper.prototype._eyeCloser = function (i, j, color) {
    var stone = this.goban.stoneAt(i, j);
    if (this.isOwned(i, j, color) !== SOMETIMES) return 0;

    var potEye = null, eyeThreatened = false, allyNeedsEye = false;
    var g = null, threat = 0, enemyCount = 0;
    var potEyeYx = this.potEyeGrid.yx;
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case EMPTY:
            if (potEyeYx[s.j][s.i] === color) potEye = s;
            break;
        case color:
            if (s.group.isAlive !== SOMETIMES) continue;
            allyNeedsEye = true;
            if (g !== null) threat += this.groupThreat(g, /*saved=*/true); //TODO review this approximation
            g = s.group;
            break;
        default: // enemy - must be only 1
            enemyCount++;
            if (s.group.isDead === ALWAYS) continue;
            eyeThreatened = true;
            break;
        }
    }
    if (potEye && eyeThreatened && allyNeedsEye) {
        if (enemyCount > 1) throw new Error('Unexpected: more than 1 enemy');
        threat += this.groupThreat(g, /*saved=*/true);
        var potEyeCount = g._info.countPotentialEyes();
        if (main.debug) main.log.debug('Shaper ' + Grid.colorName(color) + ' sees potential threat ' +
            threat + ' on eye ' + potEye + ' with ' + potEyeCount + ' potential eyes');
        return threat / Math.max(1, potEyeCount - 1);
    }
    return 0;
};
