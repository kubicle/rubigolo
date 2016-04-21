'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY;
var sOK = CONST.sOK, sDEBUG = CONST.sDEBUG;
var ALWAYS = CONST.ALWAYS;


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 */
function Heuristic(player) {
    this.player = player;
    this._setName();
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);
    this.minimumScore = player.minimumScore;

    this.color = this.enemyColor = null;
    this.updateCrossRef(); // just for creating entries on "this"; will be called again by player
}
module.exports = Heuristic;


Heuristic.prototype._setName = function () {
    var constr = this.constructor;
    this.name = constr.name || main.funcName(constr);
    // Mangled constructor name has file-scope so we may have dupes; we add the unique ID for that
    if (this.name.length < 5) this.name += this.player.heuristics.length;
};

Heuristic.prototype.updateCrossRef = function () {
    var heurMap = this.player.heuristic;
    this.co = heurMap.Connector;
    this.mi = heurMap.MoveInfo;
    this.pot = heurMap.PotentialTerritory;
    this.infl = heurMap.Influence ? heurMap.Influence.infl : null;
};

Heuristic.prototype.initColor = function (color) {
    this.color = color;
    this.enemyColor = 1 - color;
};

// For heuristics which do not handle evalBoard (but _evalMove)
// NB: _evalMove is "private": only called from here (base class), and from inside a heuristic
Heuristic.prototype.evalBoard = function (stateYx, scoreYx) {
    var prevDebug = main.debug;
    var color = this.player.color;
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var state = stateYx[j][i];
            if (state < sOK) continue;
            if (state === sDEBUG && this.name === this.player.debugHeuristic)
                main.debug = true; // set your breakpoint on this line if needed

            var score = myScoreYx[j][i] = this._evalMove(i, j, color);
            scoreYx[j][i] += score;

            if (state === sDEBUG) main.debug = prevDebug;
        }
    }
};

Heuristic.prototype.getMoveSurvey = function (i, j, survey) {
    var s = this.scoreGrid.yx[j][i];
    if (s) survey[this.name] = s;
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    return this.player.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};
