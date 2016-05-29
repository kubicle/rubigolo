'use strict';

var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var GRID_BORDER = CONST.GRID_BORDER;


/** @class */
function GroupsAndVoids(player) {
    Heuristic.call(this, player);

    this.grid = new Grid(this.gsize, GRID_BORDER);

    this.moveInfo = player.heuristic.MoveInfo;
}
inherits(GroupsAndVoids, Heuristic);
module.exports = GroupsAndVoids;


GroupsAndVoids.prototype.evalBoard = function () {
    var goban = this.goban;
    this.player.boan.startMoveAnalysis(goban, this.grid);

    this._updateGroupState();
};

GroupsAndVoids.prototype._updateGroupState = function () {
    var pot = this.pot, aliveOdds = pot.aliveOdds, deadOdds = pot.deadOdds;
    var allGroups = this.player.boan.allGroupInfos;
    for (var ndx in allGroups) {
        var gndx = ~~ndx;
        var gi = allGroups[gndx], g = gi.group;

        g.xAlive = aliveOdds[gndx];
        g.xDead = deadOdds[gndx];
        // g.xInRaceWith will be updated in GroupAnalyser

        for (var i = gi.fakeSpots.length - 1; i >= 0; i--) {
            var fakeSpot = gi.fakeSpots[i];
            if (!fakeSpot.mustBePlayed) continue;
            this.moveInfo.setAsFakeEye(fakeSpot.stone, g.color);
        }
    }
};
