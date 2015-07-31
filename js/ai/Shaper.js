'use strict';

var main = require('../main');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = main.ALWAYS;


/** @class Cares about good shapes
 */
function Shaper(player) {
    Heuristic.call(this, player);
    //this.allyCoeff = this.getGene('ally-infl', 0.1, 0.01, 4.0);
}
inherits(Shaper, Heuristic);
module.exports = Shaper;

Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    var myScoreYx = this.scoreGrid.yx;
    var allGroups = this.ter.allGroups;
    for (var ndx in allGroups) {
        var g = allGroups[ndx], gi = g._info;
        if (g.isDead === ALWAYS || gi.eyeCount !== 1) continue;
        var eye = gi.getSingleEye();
        var coords = [];
        var alive = Shaper.getEyeMakerMove(this.goban, eye.i, eye.j, eye.vcount, coords);
        if (alive !== 1) continue;
        var i = coords[0], j = coords[1];
        var score = myScoreYx[j][i] = this.groupThreat(g);
        scoreYx[j][i] += score;
    }
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
