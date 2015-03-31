//Translated from heuristic.rb using babyruby2js
'use strict';

// Base class for all heuristics.
// Anything useful for all of them should be stored as data member here.
//public read-only attribute: negative;

/** @class */
function Heuristic(player, consultant) {
    if (consultant === undefined) consultant = false;
    this.player = player;
    this.consultant = consultant;
    this.negative = false;
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.inf = player.inf;
    this.ter = player.ter;
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

Heuristic.prototype.getGene = function (name, def_val, low_limit, high_limit) {
    if (low_limit === undefined) low_limit = null;
    if (high_limit === undefined) high_limit = null;
    return this.player.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};
