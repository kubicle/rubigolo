'use strict';

var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class */
function GroupAnalyser(player) {
    Heuristic.call(this, player);
}
inherits(GroupAnalyser, Heuristic);
module.exports = GroupAnalyser;


GroupAnalyser.prototype.evalBoard = function () {
    this.player.boan.continueMoveAnalysis();

    this._updateGroupState();
};

GroupAnalyser.prototype._updateGroupState = function () {
    var allGroups = this.player.boan.allGroupInfos;
    for (var ndx in allGroups) {
        var gndx = ~~ndx;
        var gi = allGroups[gndx], g = gi.group;

        g.xInRaceWith = gi.inRaceWith && gi.inRaceWith.group;
    }
};
