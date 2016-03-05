'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = CONST.EMPTY;
var NEVER = CONST.NEVER, SOMETIMES = CONST.SOMETIMES, ALWAYS = CONST.ALWAYS;
var EVEN = CONST.EVEN, ODD = CONST.ODD;


/** @class Cares about good shapes
 */
function Shaper(player) {
    Heuristic.call(this, player);

    this.eyeCloserCoeff = this.getGene('eyeCloser', 1, 0.01, 1);

    this.potEyeGrids = player.getHeuristic('PotentialEyes').potEyeGrids;
}
inherits(Shaper, Heuristic);
module.exports = Shaper;


Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    // Call _evalMove for each vertex and init this.scoreGrid
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx);

    var allGroups = this.pot.allGroups;
    for (var ndx in allGroups) {
        var g = allGroups[~~ndx];
        if (g.xDead === ALWAYS || g.xAlive === ALWAYS) continue;

        this._evalSingleEyeSplit(scoreYx, g);
    }
};

Shaper.prototype._evalSingleEyeSplit = function (scoreYx, g) {
    var coords = [];
    var alive = g._info.getEyeMakerMove(coords);
    if (alive !== SOMETIMES) return;
    var i = coords[0], j = coords[1];
    var score = this.groupThreat(g, this.color === g.color); //TODO count threat on band, not only on group that owns the eye
    var potEyeCount = g._info.countBandPotentialEyes();
    score = score / Math.max(1, potEyeCount - 1);
    this.scoreGrid.yx[j][i] += score;
    scoreYx[j][i] += score;
    if (main.debug) main.log.debug('Shaper ' + Grid.colorName(this.color) + ' sees single eye split at ' +
        i + ',' + j + ' score: ' + score);
};

Shaper.prototype._evalMove = function (i, j, color) {
    return this.eyeCloserCoeff * (
        this._eyeCloser(i, j, color) + // we can save 1 eye for us
        this._eyeCloser(i, j, 1 - color) // we can attack 1 eye from enemy
        );
};

Shaper.prototype._eyeCloser = function (i, j, color) {
    var stone = this.goban.stoneAt(i, j);
    // Below optim is "risky" since we give up making 2 eyes without trying when
    // our PotentialTerritory eval thinks we are dead. And we know PotentialTerritory is loose.
    if (this.pot.isOwned(i, j, color) === NEVER)
        return 0;

    if (!this.canConnect(i, j, 1 - color))
        return 0;

    var v = this.player.boan.getVoidAt(stone);
    if (v.owner && v.owner.group.color === color) {
        return this._realEyeCloser(stone, color, v);
    } else {
        return this._potEyeCloser(stone, color);
    }
};

Shaper.prototype._realEyeCloser = function (stone, color, v) {
    if (v.vcount > 2) return 0; //TODO review this; must be much more complex
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color !== color || s.group.lives !== 1) continue;
        return this._evalEyeThreat(s.group);
    }
    return 0;
};

Shaper.prototype._potEyeCloser = function (stone, color) {
    var potEyeEvenYx = this.potEyeGrids[EVEN].yx;
    var potEyeOddYx = this.potEyeGrids[ODD].yx;
    var potEye = null, g = null;

    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case EMPTY:
            if (potEyeEvenYx[s.j][s.i] === color || potEyeOddYx[s.j][s.i] === color) potEye = s;
            break;
        case color:
            if (s.group.xAlive === ALWAYS || s.group.xDead === ALWAYS) continue;
            g = s.group;
            break;
        }
        if (potEye && g) break;
    }
    if (!potEye || !g) return 0;

    var threat = this._evalEyeThreat(g);
    if (main.debug) main.log.debug('Shaper ' + Grid.colorName(color) + ' sees potential threat ' +
        threat + ' on eye ' + potEye);
    return threat;
};

function countThreatOnBand(shaper) {
    return shaper.groupThreat(this.group, /*saved=*/true);
}

Shaper.prototype._evalEyeThreat = function (g) {
    var gi = g._info;
    var potEyeCount = gi.countBandPotentialEyes();
    if (potEyeCount < 2)
        return 0;

    var threat = gi.callOnBand(countThreatOnBand, this);
    return threat / (potEyeCount - 1);
};
