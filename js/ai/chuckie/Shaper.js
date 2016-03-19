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

    this.mi.singleEyeThreat(g, stone, this.color);

    if (main.debug) main.log.debug('Shaper ' + Grid.colorName(this.color) + ' sees single eye split at ' + stone);
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
    if (this.pot.isOwned(i, j, color) === NEVER)
        return false;

    if (!this.canConnect(i, j, 1 - color))
        return false;

    var v = this.player.boan.getVoidAt(stone);
    if (v.owner && v.owner.group.color === color) {
        return this._realEyeCloser(stone, color, v);
    } else {
        return this._potEyeCloser(stone, color);
    }
};

Shaper.prototype._realEyeCloser = function (stone, color, v) {
    if (v.vcount > 2) return false; //TODO review this; must be much more complex
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color !== color || s.group.lives !== 1) continue;

        if (!this.mi.eyeThreat(s.group, stone, color)) continue;

        if (main.debug) main.log.debug('Shaper ' + Grid.colorName(color) + ' sees threat on real eye ' + v);
        return true;
    }
    return false;
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
    if (!potEye || !g) return false;

    if (!this.mi.eyeThreat(g, stone, color)) return false;

    if (main.debug) main.log.debug('Shaper ' + Grid.colorName(color) + ' sees threat on pot eye ' + potEye);
    return true;
};
