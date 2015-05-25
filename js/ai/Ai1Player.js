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
 *  public read-only attribute: goban, inf, ter, enemyColor, genes
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

function score2str(i, j, score) {
    return Grid.moveAsString(i, j) + ':' + score.toFixed(3);
}

Ai1Player.prototype._foundSecondBestMove = function(i, j, score, survey) {
    if (main.debug) {
        main.log.debug('=> ' + score2str(i,j,score) + ' becomes 2nd best move');
        if (this.secondBestI > 0) main.log.debug(' (replaces ' + score2str(this.secondBestI, this.secondBestJ, this.secondBestScore) + ')');
    }
    this.secondBestScore = score;
    this.secondBestI = i; this.secondBestJ = j;
    this.secondBestSurvey = survey;
};

Ai1Player.prototype._foundBestMove = function(i, j, score, survey) {
    if (main.debug) {
        if (this.numBestTwins > 1) {
            main.log.debug('=> TWIN ' + score2str(i, j, score) + ' replaces equivalent best move ' + score2str(this.bestI, this.bestJ, this.bestScore));
        } else {
            main.log.debug('=> ' + score2str(i, j, score) + ' becomes the best move');
        }
    }
    if (this.numBestTwins === 1) {
        this._foundSecondBestMove(this.bestI, this.bestJ, this.bestScore, this.bestSurvey);
    }
    this.bestScore = score;
    this.bestI = i; this.bestJ = j;
    this.bestSurvey = survey;
};

Ai1Player.prototype._keepBestMoves = function(i, j, score) {
    // Keep the best move and the 2nd best move
    if (score < this.bestScore) {
        this._foundSecondBestMove(i, j, score, this._takeSurvey());
    } else if (score > this.bestScore) {
        this.numBestTwins = 1; // number of moves with same best score (we randomly pick one of them)
        this._foundBestMove(i, j, score, this._takeSurvey());
    } else { // score === this.bestScore
        this.numBestTwins++;
        if (Math.random() * this.numBestTwins >= 1) return; // keep current twin if it does not win
        this._foundBestMove(i, j, score, this._takeSurvey());
    }
};

// "Use" the current survey (so we start another one)
// We do this simply to avoid creating tons of temporary maps
Ai1Player.prototype._takeSurvey = function () {
    var survey = this.survey;
    this.survey = {};
    return survey;
};

// Returns the move chosen (e.g. c4 or pass)
// You can also check:
//   player.bestScore to see the score of the move returned
//   player.bestSurvey to see details about this score
//   player.secondBestScore
//   player.secondBestSurvey
Ai1Player.prototype.getMove = function () {
    this.numMoves++;
    if (this.numMoves >= this.gsize * this.gsize) { // force pass after too many moves
        main.log.error('Forcing AI pass since we already played ' + this.numMoves);
        return 'pass';
    }
    this.prepareEval();

    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var score = this._evalMove(i, j, this.secondBestScore);
            if (score > this.secondBestScore) this._keepBestMoves(i, j, score);
        }
    }
    if (this.bestScore <= this.minimumScore) {
        if (main.debug) main.log.debug('AI is passing...');
        return 'pass';
    }
    return Grid.moveAsString(this.bestI, this.bestJ);
};

Ai1Player.prototype.prepareEval = function () {
    this.bestScore = this.secondBestScore = this.minimumScore;
    this.bestI = this.bestJ = -1;
    this.survey = {};

    this.inf.buildMap();
    this.ter.guessTerritories();
};

/** Can be called from the outside for tests, but prepareEval must be called first */
Ai1Player.prototype.evalMove = function (i, j) {
    var score = this._evalMove(i, j, 0);
    this._foundBestMove(i, j, score, this._takeSurvey());
    return score;
};

Ai1Player.prototype._evalMove = function (i, j, minScore) {
    if (!Stone.validMove(this.goban, i, j, this.color)) {
        return 0;
    }
    var score = 0, s;
    // run all positive heuristics
    for (var h, h_array = this.heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        s = h.evalMove(i, j);
        if (this.survey) { this.survey[h.constructor.name] = s; }
        score += s;
    }
    // we run negative heuristics only if this move was a potential candidate
    if (score < minScore) return score;
    for (h, h_array = this.negativeHeuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        s = h.evalMove(i, j);
        if (this.survey) { this.survey[h.constructor.name] = s; }
        score += s;
        if (score < minScore) break;
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

Ai1Player.prototype.getMoveSurveyText = function (rank) {
    var survey, score, move;
    switch (rank) {
    case 1:
        survey = this.bestSurvey; score = this.bestScore;
        move = Grid.moveAsString(this.bestI, this.bestJ);
        break;
    case 2:
        survey = this.secondBestSurvey; score = this.secondBestScore;
        move = Grid.moveAsString(this.secondBestI, this.secondBestJ);
        break;
    }
    if (!survey) return '';
    var txt = 'Stats of ' + move + ' (' + score.toFixed(3) + '):\n';
    for (var h in survey) {
        if (survey[h] === 0) continue;
        txt += '- ' + h + ': ' + survey[h].toFixed(3) + '\n';
    }
    return txt;
};

