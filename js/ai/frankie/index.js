//Translated from ai1_player.rb using babyruby2js
'use strict';

var main = require('../../main');

var allHeuristics = require('./AllHeuristics');
var BoardAnalyser = require('./boan/BoardAnalyser');
var Genes = require('../../Genes');
var Grid = require('../../Grid');
var InfluenceMap = require('./boan/InfluenceMap');
var PotentialTerritory = require('./boan/PotentialTerritory');
var Stone = require('../../Stone');
var ZoneFiller = require('./boan/ZoneFiller');

var sOK = main.sOK, sINVALID = main.sINVALID, sBLUNDER = main.sBLUNDER;

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves


/** @class
 *  public read-only attribute: goban, inf, ter, enemyColor, genes
 *  TODO: 
 *  - do not fill my own territory (potential territory recognition will use analyser.enlarge method)
 *  - identify all foolish moves (like NoEasyPrisoner but once for all) in a map that all heuristics can use
 *  - foresee a poursuit = on attack/defense (and/or use a reverse-killer?)
 *  - an eye shape constructor
 */
function Frankie(goban, color, genes) {
    if (genes === undefined) genes = null;
    this.version = 'Frankie-1.0';
    this.goban = goban;
    this.inf = new InfluenceMap(this.goban);
    this.ter = new PotentialTerritory(this.goban);
    this.boan = new BoardAnalyser();
    this.gsize = this.goban.gsize;
    this.stateGrid = new Grid(this.gsize);
    this.scoreGrid = new Grid(this.gsize);

    this.genes = (( genes ? genes : new Genes() ));
    this.minimumScore = this.getGene('smaller-move', 0.03, 0.01, 0.1);

    this.heuristics = [];
    var heuristics = allHeuristics();
    for (var i = 0; i < heuristics.length; i++) {
        var h = new (heuristics[i])(this);
        this.heuristics.push(h);
    }
    this.setColor(color);
    // genes need to exist before we create heuristics so passing genes below is done
    // to keep things coherent
    this.prepareGame(this.genes);
}
module.exports = Frankie;

Frankie.BoardAnalyser = BoardAnalyser;
Frankie.PotentialTerritory = PotentialTerritory;
Frankie.ZoneFiller = ZoneFiller;


Frankie.prototype.getHeuristic = function (heuristicName) {
    for (var n = this.heuristics.length - 1; n >= 0; n--) {
        var h = this.heuristics[n];
        if (h.constructor.name === heuristicName) return h;
    }
    throw new Error('Invalid heuristic name: ' + heuristicName);
};

Frankie.prototype.prepareGame = function (genes) {
    this.genes = genes;
    this.numMoves = 0;
};

Frankie.prototype.setColor = function (color) {
    this.color = color;
    this.enemyColor = 1 - color;
    for (var i = 0; i < this.heuristics.length; i++) {
        this.heuristics[i].initColor();
    }
};

Frankie.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};

function score2str(i, j, score) {
    return Grid.xy2move(i, j) + ':' + score.toFixed(3);
}

Frankie.prototype._foundSecondBestMove = function(i, j, score) {
    if (main.debug) {
        main.log.debug('=> ' + score2str(i,j,score) + ' becomes 2nd best move');
        if (this.secondBestI !== NO_MOVE) main.log.debug(' (replaces ' + score2str(this.secondBestI, this.secondBestJ, this.secondBestScore) + ')');
    }
    this.secondBestScore = score;
    this.secondBestI = i; this.secondBestJ = j;
};

Frankie.prototype._foundBestMove = function(i, j, score) {
    if (main.debug) {
        if (this.numBestTwins > 1) {
            main.log.debug('=> TWIN ' + score2str(i, j, score) + ' replaces equivalent best move ' + score2str(this.bestI, this.bestJ, this.bestScore));
        } else if (this.bestI !== NO_MOVE) {
            main.log.debug('=> ' + score2str(i, j, score) + ' becomes the best move');
        }
    }
    if (this.numBestTwins === 1) {
        this._foundSecondBestMove(this.bestI, this.bestJ, this.bestScore);
    }
    this.bestScore = score;
    this.bestI = i; this.bestJ = j;
};

Frankie.prototype._keepBestMoves = function(i, j, score) {
    // Keep the best move and the 2nd best move
    if (score < this.bestScore) {
        this._foundSecondBestMove(i, j, score);
    } else if (score > this.bestScore) {
        this.numBestTwins = 1; // number of moves with same best score (we randomly pick one of them)
        this._foundBestMove(i, j, score);
    } else { // score === this.bestScore
        this.numBestTwins++;
        if (Math.random() * this.numBestTwins >= 1) return; // keep current twin if it does not win
        this._foundBestMove(i, j, score);
    }
};

// Returns the move chosen (e.g. c4 or pass)
// You can also check:
//   player.bestScore to see the score of the move returned
//   player.secondBestScore
Frankie.prototype.getMove = function () {
    this.numMoves++;
    if (this.numMoves >= this.gsize * this.gsize) { // force pass after too many moves
        main.log.error('Forcing AI pass since we already played ' + this.numMoves);
        return 'pass';
    }
    this._prepareEval();

    // init grids (and mark invalid moves)
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    var i,j;
    for (j = 1; j <= this.gsize; j++) {
        for (i = 1; i <= this.gsize; i++) {
            if (!Stone.validMove(this.goban, i, j, this.color)) {
                stateYx[j][i] = sINVALID;
                continue;
            }
            stateYx[j][i] = sOK;
            scoreYx[j][i] = 0;
        }
    }
    // do eval using each heuristic (NB: order is important)
    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].evalBoard(stateYx, scoreYx);
    }
    // now collect best score (and 2nd best)
    for (j = 1; j <= this.gsize; j++) {
        for (i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] >= sOK && scoreYx[j][i] > this.secondBestScore) {
                this._keepBestMoves(i, j, scoreYx[j][i]);
            }
        }
    }
    if (this.bestScore <= this.minimumScore) {
        return 'pass';
    }
    return Grid.xy2move(this.bestI, this.bestJ);
};

Frankie.prototype.guessTerritories = function () {
    return this.ter.guessTerritories();
};

Frankie.prototype._prepareEval = function () {
    this.currentMove = this.goban.moveNumber();
    this.bestScore = this.secondBestScore = this.minimumScore;
    this.bestI = this.secondBestI = NO_MOVE;
    this.survey = null;

    this.inf.buildMap();
    this.ter.guessTerritories();

    // get "raw" group info
    this.boan.analyse(this.color, this.goban);
};

/** Called by heuristics if they decide to stop looking further (rare cases) */
Frankie.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.stateGrid.yx[j][i] = sBLUNDER;
    main.log.debug(Grid.xy2move(i, j) + ' seen as blunder: ' + reason);
};
Frankie.prototype.isBlunderMove = function (i, j) {
    return this.stateGrid.yx[j][i] === sBLUNDER;
};

/** For tests */
Frankie.prototype._testMoveEval = function (i, j) {
    if (this.currentMove !== this.goban.moveNumber()) this.getMove();
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    // to get eval "again", set the state back to OK even if it got marked invalid later
    if (Stone.validMove(this.goban, i, j, this.color)) stateYx[j][i] = sOK;
    var score = 0, survey = {};
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        scoreYx[j][i] = 0;
        h.evalBoard(stateYx, scoreYx);
        var s = scoreYx[j][i];
        if (s) survey[h.constructor.name] = s;
        score += s;
    }
    this.survey = survey;
    return score;
};

/** For tests */
Frankie.prototype.testMoveEval = function (i, j) {
    var score = this._testMoveEval(i, j);

    this._foundBestMove(i, j, score);
    this.secondBestI = NO_MOVE;
    return score;
};

/** For tests */
Frankie.prototype.testHeuristic = function (i, j, heuristicName) {
    if (this.currentMove !== this.goban.moveNumber()) this.getMove();
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    this.getMove();
    stateYx[j][i] = sOK;
    scoreYx[j][i] = 0;
    var h = this.getHeuristic(heuristicName);
    h.evalBoard(stateYx, scoreYx);
    return scoreYx[j][i];
};

Frankie.prototype.getMoveSurveyText = function (rank, withDetails) {
    var survey, score, move;
    switch (rank) {
    case 1:
        if (this.bestI === NO_MOVE) break;
        this._testMoveEval(this.bestI, this.bestJ);
        survey = this.survey; score = this.bestScore;
        move = Grid.xy2move(this.bestI, this.bestJ);
        break;
    case 2:
        if (this.secondBestI === NO_MOVE) break;
        this._testMoveEval(this.secondBestI, this.secondBestJ);
        survey = this.survey; score = this.secondBestScore;
        move = Grid.xy2move(this.secondBestI, this.secondBestJ);
        break;
    }
    if (!survey) return '';
    var txt = move + ' (' + score.toFixed(2) + ')';
    if (!withDetails) return txt;
    txt += '\n';
    for (var h in survey) {
        if (survey[h] === 0) continue;
        txt += '- ' + h + ': ' + survey[h].toFixed(2) + '\n';
    }
    return txt;
};
