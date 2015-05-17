//Translated from ai1_player.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var allHeuristics = require('./AllHeuristics');
var main = require('../main');
var Grid = require('../Grid');
var Stone = require('../Stone');
var Player = require('../Player');
var InfluenceMap = require('../InfluenceMap');
var PotentialTerritory = require('../PotentialTerritory');
var Genes = require('../Genes');


/** @class
 *  public read-only attribute: goban, inf, ter, enemyColor, genes, lastMoveScore
 *  TODO: 
 *  - do not fill my own territory (potential territory recognition will use analyser.enlarge method)
 *  - identify all foolish moves (like NoEasyPrisoner but once for all) in a map that all heuristics can use
 *  - foresee a poursuit = on attack/defense (and/or use a reverse-killer?)
 *  - an eye shape constructor
 */
function Ai1Player(goban, color, genes) {
    if (genes === undefined) genes = null;
    Player.call(this, false, goban);
    this.inf = new InfluenceMap(this.goban);
    this.ter = new PotentialTerritory(this.goban);
    this.gsize = this.goban.gsize;
    this.genes = (( genes ? genes : new Genes() ));
    this.minimumScore = this.getGene('smaller-move', 0.033, 0.02, 0.066);

    this.heuristics = [];
    this.negativeHeuristics = [];
    var heuristics = allHeuristics();
    for (var i = 0; i < heuristics.length; i++) {
        var h = new (heuristics[i])(this);
        if (!h.negative) {
            this.heuristics.push(h);
        } else {
            this.negativeHeuristics.push(h);
        }
    }
    this.setColor(color);
    // genes need to exist before we create heuristics so passing genes below is done
    // to keep things coherent
    return this.prepareGame(this.genes);
}
inherits(Ai1Player, Player);
module.exports = Ai1Player;

Ai1Player.prototype.prepareGame = function (genes) {
    this.genes = genes;
    this.numMoves = 0;
};

Ai1Player.prototype.setColor = function (color) {
    Player.prototype.setColor.call(this, color);
    this.enemyColor = 1 - color;
    for (var h, h_array = this.heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        h.initColor();
    }
    for (h, h_array = this.negativeHeuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        h.initColor();
    }
};

Ai1Player.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};

// Returns the move chosen (e.g. c4 or pass)
// One can check last_move_score to see the score of the move returned
Ai1Player.prototype.getMove = function () {
    var bestScore, secondBest, bestI, bestJ;
    // @timer.start("AI move",0.5,3)
    this.numMoves += 1;
    if (this.numMoves >= this.gsize * this.gsize) { // force pass after too many moves
        main.log.error('Forcing AI pass since we already played ' + this.numMoves);
        return 'pass';
    }
    this.prepareEval();
    bestScore = secondBest = this.minimumScore;
    bestI = bestJ = -1;
    var bestNumTwin = 0; // number of occurrence of the current best score (so we can randomly pick any of them)
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var score = this.evalMove(i, j, bestScore);
            // Keep the best move
            if (score > bestScore) {
                secondBest = bestScore;
                if (main.debug) {
                    main.log.debug('=> ' + Grid.moveAsString(i, j) + ' becomes the best move with ' + score.toFixed(3));
                    if (bestI > 0) main.log.debug(' (2nd best is ' + Grid.moveAsString(bestI, bestJ) + ' with ' + bestScore.toFixed(3) + ')');
                }
                bestScore = score;
                bestI = i;
                bestJ = j;
                bestNumTwin = 1;
            } else if (score === bestScore) {
                bestNumTwin += 1;
                if (~~(Math.random()*~~(bestNumTwin)) === 0) {
                    if (main.debug) {
                        main.log.debug('=> ' + Grid.moveAsString(i, j) + ' replaces equivalent best move with ' + score.toFixed(3) + ' (equivalent best was ' + Grid.moveAsString(bestI, bestJ) + ')');
                    }
                    bestScore = score;
                    bestI = i;
                    bestJ = j;
                }
            } else if (score >= secondBest) {
                if (main.debug) {
                    main.log.debug('=> ' + Grid.moveAsString(i, j) + ' is second best move with ' + score + ' (best is ' + Grid.moveAsString(bestI, bestJ) + ' with ' + bestScore + ')');
                }
                secondBest = score;
            }
        }
    }
    this.lastMoveScore = bestScore;
    // @timer.stop(false) # false: no exception if it takes longer but an error in the log
    if (bestScore > this.minimumScore) {
        return Grid.moveAsString(bestI, bestJ);
    }
    if (main.debug) {
        main.log.debug('AI is passing...');
    }
    return 'pass';
};

Ai1Player.prototype.prepareEval = function () {
    this.inf.buildMap();
    return this.ter.guessTerritories();
};

/** Can be called from the outside for tests, but prepareEval must be called first */
Ai1Player.prototype.evalMove = function (i, j, bestScore) {
    if (bestScore === undefined) bestScore = this.minimumScore;
    if (!Stone.validMove(this.goban, i, j, this.color)) {
        return 0.0;
    }
    var score = 0.0;
    // run all positive heuristics
    for (var h, h_array = this.heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        score += h.evalMove(i, j);
    }
    // we run negative heuristics only if this move was a potential candidate
    if (score >= bestScore) {
        for (h, h_array = this.negativeHeuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
            score += h.evalMove(i, j);
            if (score < bestScore) {
                break;
            }
        }
    }
    return score;
};

/** For tests */
Ai1Player.prototype._testHeuristic = function (i, j, heuristicName) {
    for (var n = this.heuristics.length -1; n >= 0; n--) {
        var h = this.heuristics[n];
        if (h.constructor.name === heuristicName) {
            return h.evalMove(i, j);
        }
    }
    throw new Error('Invalid heuristic name: ' + heuristicName);
};
