//Translated from heuristic.rb using babyruby2js
'use strict';


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 *  public read-only attribute: negative
 */
function Heuristic(player, consultant) {
    if (consultant === undefined) consultant = false;
    this.player = player;
    this.consultant = consultant;
    this.negative = false;
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.inf = player.inf;
    this.ter = player.ter;

    this.spaceInvasionCoeff = this.getGene('spaceInvasion', 2.0, 0.01, 4.0);
}
module.exports = Heuristic;

Heuristic.prototype.initColor = function () {
    // For consultant heuristics we reverse the colors
    if (this.consultant) {
        this.color = this.player.enemyColor;
        this.enemyColor = this.player.color;
    } else {
        this.color = this.player.color;
        this.enemyColor = this.player.enemyColor;
    }
};

// A "negative" heuristic is one that can only give a negative score (or 0.0) to a move.
// We use this difference to spare some CPU work when a move is not good enough 
// (after running the "positive" heuristics) to beat the current candidate.
Heuristic.prototype.setAsNegative = function () {
    this.negative = true;
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.player.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};

// TODO: instead of below, evaluate the damage caused by an *invasion* by taking group g
Heuristic.prototype.groupThreat = function (g) {
    var lives = g.allLives();
    var numEmpties = 0;
    for (var i = lives.length - 1; i >= 0; i--) {
        numEmpties += lives[i].numEmpties();
    }
    return g.stones.length * 2 + // 2 points are pretty much granted for the prisonners
        this.spaceInvasionCoeff * numEmpties; //...and the "open gate" to territory will count a lot
};
