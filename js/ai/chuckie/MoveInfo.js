'use strict';

//var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class */
function MoveInfo(player) {
    Heuristic.call(this, player);

    this.grid = new Grid(this.gsize, null);
}
inherits(MoveInfo, Heuristic);
module.exports = MoveInfo;

function CellInfo() {
    this.fakeEyeForColor = null;

    //TODO:
    //this.capturedGroups = null;
    //this.savedGroups = null;
}

MoveInfo.prototype.evalBoard = function () {
    this.grid.init(null);
};

MoveInfo.prototype.getCellInfo = function (i, j) {
    return this.grid.yx[j][i]; // can be null
};

MoveInfo.prototype._getCell = function (i, j) {
    var cell = this.grid.yx[j][i];
    if (cell) return cell;

    this.grid.yx[j][i] = cell = new CellInfo();
    return cell;
};

MoveInfo.prototype.setAsFakeEye = function (stone, color) {
    this._getCell(stone.i, stone.j).fakeEyeForColor = color;
};

MoveInfo.prototype.isFakeEye = function (stone, color) {
    var cell = this.getCellInfo(stone.i, stone.j);
    return cell && cell.fakeEyeForColor === color;
};
