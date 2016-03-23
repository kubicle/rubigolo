'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var EVEN = CONST.EVEN, ODD = CONST.ODD;


function PotentialEyes(player) {
    Heuristic.call(this, player);

    this.potEyeGrids = [new Grid(this.gsize, GRID_BORDER), new Grid(this.gsize, GRID_BORDER)];

    this.moveInfo = player.heuristic.MoveInfo;
}
inherits(PotentialEyes, Heuristic);
module.exports = PotentialEyes;


PotentialEyes.prototype.evalBoard = function () {
    this._findPotentialEyes();
};

PotentialEyes.prototype._findPotentialEyes = function () {
    this.potEyeGrids[EVEN].init(EMPTY);
    this.potEyeGrids[ODD].init(EMPTY);

    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            var eye = this.goban.stoneAt(i, j);
            if (eye.color !== EMPTY) continue;

            var color = this._eyePotential(i, j, eye);
            if (color === null) continue;

            var v = this.player.boan.getVoidAt(eye);
            if (v.owner) continue;
            if (this.moveInfo.isFakeEye(eye, color)) continue;

            var neighbors = eye.neighbors;
            var ally = null, enemyInfl = this.infl[1 - color], count = 1;
            for (var n = neighbors.length - 1; n >= 0; n--) {
                var s = neighbors[n];
                if (s.color === color) ally = s.group;
                if (count === 1 && !s.isBorder() &&
                    enemyInfl[s.j][s.i] === 0 && s.numEmpties() === s.neighbors.length) {
                    count = 2;
                }
            }
            if (!ally) continue;

            var oddOrEven = (i + j) % 2;
            var potEyeYx = this.potEyeGrids[oddOrEven].yx;
            potEyeYx[j][i] = color;
            ally._info.addPotentialEye(oddOrEven, count);
            if (main.debug) main.log.debug('Potential eye in ' + eye);
        }
    }
};

/** @return {color|null} - null if no chance to make an eye here */
PotentialEyes.prototype._eyePotential = function (i, j, eye) {
    var infB = this.infl[BLACK][j][i];
    var infW = this.infl[WHITE][j][i];
    var color = infB > infW ? BLACK : WHITE;
    var allyInf = Math.max(infB, infW), enemyInf = Math.min(infB, infW);
    if (enemyInf > 1) return null; // enemy stone closer than 2 vertexes
    var cornerPoints = 0, gsize = this.gsize;
    if (i === 1 || i === gsize || j === 1 || j === gsize) cornerPoints++;
    if (allyInf + cornerPoints - 3 - enemyInf < 0) return null;
    return color;
};
