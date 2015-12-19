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

    this.eyeCloserCoeff = this.getGene('eyeCloser', 1, 0.01, 1);

    this.potEyeGrid = new Grid(this.gsize);
}
inherits(Shaper, Heuristic);
module.exports = Shaper;


Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    this.potEyeGrid.init();
    this._findPotentialEyes(stateYx);

    // Call _evalMove for each vertex and init this.scoreGrid
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx);

    var allGroups = this.pot.allGroups;
    for (var ndx in allGroups) {
        var g = allGroups[~~ndx];
        if (g.isDead === ALWAYS || g.isAlive === ALWAYS) continue;

        this._evalSingleEyeSplit(scoreYx, g);
    }
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
    var coords = [];
    var alive = g._info.getEyeMakerMove(coords);
    if (alive !== SOMETIMES) return;
    var i = coords[0], j = coords[1];
    var score = this.groupThreat(g, this.color === g.color);
    var potEyeCount = g._info.countPotentialEyes();
    score = score / Math.max(1, potEyeCount - 1);
    this.scoreGrid.yx[j][i] += score;
    scoreYx[j][i] += score;
    if (main.debug) main.log.debug('Shaper ' + Grid.colorName(this.color) + ' sees single eye split at ' +
        i + ',' + j + ' score: ' + score);
};

Shaper.prototype._evalMove = function (i, j, color) {
    return this.eyeCloserCoeff * (this._eyeCloser(i, j, color) + this._eyeCloser(i, j, 1 - color));
};

Shaper.prototype._eyeCloser = function (i, j, color) {
    var stone = this.goban.stoneAt(i, j);
    if (this.isOwned(i, j, color) !== SOMETIMES) return 0;

    var potEye = null, eyeThreatened = false, allyNeedsEye = false;
    var g = null, threat = 0;
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
        default: // enemy
            // NB: dead enemies have less influence so we sometimes can see more than 1 around
            if (s.group.isDead === ALWAYS) continue;
            eyeThreatened = true;
            break;
        }
    }
    if (potEye && eyeThreatened && allyNeedsEye) {
        threat += this.groupThreat(g, /*saved=*/true);
        var potEyeCount = g._info.countPotentialEyes();
        if (main.debug) main.log.debug('Shaper ' + Grid.colorName(color) + ' sees potential threat ' +
            threat + ' on eye ' + potEye + ' with ' + potEyeCount + ' potential eyes');
        return threat / Math.max(1, potEyeCount - 1);
    }
    return 0;
};
