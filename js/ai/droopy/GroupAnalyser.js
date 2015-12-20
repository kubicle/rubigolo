'use strict';

var BoardAnalyser = require('./boan/BoardAnalyser');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class */
function GroupAnalyser(player) {
    Heuristic.call(this, player);

    this.boan = new BoardAnalyser();

    // Share the info with others at player level - TODO: find better place
    player.boan = this.boan;
}
inherits(GroupAnalyser, Heuristic);
module.exports = GroupAnalyser;


GroupAnalyser.prototype.evalBoard = function () {
    this._initGroupState();
    // get "raw" group info
    var goban = this.goban;
    this.boan.analyse(goban, goban.scoringGrid.initFromGoban(goban));
};

GroupAnalyser.prototype._initGroupState = function () {
    this.allGroups = this.goban.getAllGroups();
    for (var ndx in this.allGroups) {
        var g = this.allGroups[~~ndx];
        g.xInRaceWith = null;
    }
};
