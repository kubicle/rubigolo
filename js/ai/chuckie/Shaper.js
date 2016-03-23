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

    this.potEyeGrids = player.heuristic.PotentialEyes.potEyeGrids;

    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
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
    var stone = this.goban.stoneAt(coords[0], coords[1]);

    if (main.debug) main.log.debug('Shaper ' + Grid.colorName(this.color) + ' sees single eye split at ' + stone);
    this.mi.eyeThreat(g, stone, this.color);
};

Shaper.prototype._evalMove = function (i, j, color) {
    this._eyeCloser(i, j, color); // we can save 1 eye for us
    this._eyeCloser(i, j, 1 - color); // we can attack 1 eye from enemy
    return 0;
};

Shaper.prototype._eyeCloser = function (i, j, color) {
    var stone = this.goban.stoneAt(i, j);
    // Below optim is "risky" since we give up making 2 eyes without trying when
    // our PotentialTerritory eval thinks we are dead. And we know PotentialTerritory is loose.
    if (this.pot.isOwned(i, j, color) === NEVER) return;

    // If enemy cannot play in i,j there is no worry
    if (!this.co.canConnect(i, j, 1 - color)) return;

    var v = this.player.boan.getVoidAt(stone);
    if (v.owner && v.owner.group.color === color) {
        this._realEyeCloser(stone, color, v);
    } else {
        this._potEyeCloser(stone, color);
    }
};

// stone can close a real eye if it captures an ally around it AND eye is "small enough" (TBD)
Shaper.prototype._realEyeCloser = function (stone, color, v) {
    if (v.vcount > 2) return; //TODO review this; must be much more complex

    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color === color && s.group.lives === 1) {
            if (main.debug) main.log.debug('Shaper ' + Grid.colorName(color) + ' sees threat on real eye ' + v);
            this.mi.eyeThreat(s.group, stone, color);
            break;
        }
    }
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
            g = s.group;
        }
        if (potEye && g) break;
    }
    if (!potEye) return;
    if (!g) {
        // Case where eye-closing stone is not connected to our group (see testEyeMaking_shape5safe)
        if (this.noEasyPrisonerYx[stone.j][stone.i] < 0) return;
        g = this.player.boan.getVoidAt(potEye).groups[color][0]; // any of our groups around should be OK
    }
    if (g.xAlive === ALWAYS || g.xDead === ALWAYS) return;

    this.mi.eyeThreat(g, stone, color);
};
