'use strict';

var CONST = require('./constants');
var main = require('./main');
var Grid = require('./Grid');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;


/** @class */
function ScoreAnalyser(game) {
    this.game = game;
    this.analyser = new main.defaultAi.BoardAnalyser(game);
}
module.exports = ScoreAnalyser;


// Computes score and returns it as a number >0 if black won
ScoreAnalyser.prototype.computeScoreDiff = function () {
    var totals = this._computeScore()[0];
    return totals[BLACK] - totals[WHITE];
};

// Computes score and returns it as an array of human-readable strings
 ScoreAnalyser.prototype.computeScoreAsTexts = function () {
    return this._scoreInfoToS(this._computeScore());
};

ScoreAnalyser.prototype.computeScoreInfo = function () {
    return this._computeScore();
};

// Retrives the scoring grid once the score has been computed
ScoreAnalyser.prototype.getScoringGrid = function () {
    return this.analyser.getScoringGrid();
};

ScoreAnalyser.prototype._computeScore = function () {
    var game = this.game;
    var goban = game.goban;
    var komi = game.komi;

    if (game.whoResigned !== null) {
        return ['resi', 1 - game.whoResigned, game.resignReason];
    }

    this.analyser.countScore(goban);

    var scores = this.analyser.scores;
    var prisoners = this.analyser.prisoners;

    var totals = [
        scores[BLACK] + prisoners[WHITE],
        scores[WHITE] + prisoners[BLACK] + komi];
    var details = [
        [scores[BLACK], prisoners[WHITE], 0],
        [scores[WHITE], prisoners[BLACK], komi]];

    return [totals, details];
};

function pointsToString(n) {
    return ( n !== 1 ? n + ' points' : '1 point' );
}

ScoreAnalyser.prototype._scoreInfoToS = function (info) {
    if (info[0] === 'resi') {
        var winner = Grid.COLOR_NAMES[info[1]], loser = Grid.COLOR_NAMES[1 - info[1]];
        var reason;
        switch (info[2]) {
        case 'time': reason = loser + ' ran out of time'; break;
        case null: case undefined: reason = loser + ' resigned'; break;
        default: reason = loser + ' disqualified: ' + info[2];
        }
        return [winner + ' won (' + reason + ')'];
    }
    if (!info || info.length !== 2) throw new Error('Invalid score info: ' + info);
    var totals = info[0];
    var details = info[1];
    if (totals.length !== details.length) throw new Error('Invalid score info');

    var s = [];
    var diff = totals[BLACK] - totals[WHITE];
    s.push(this._scoreDiffToS(diff));

    for (var c = BLACK; c <= WHITE; c++) {
        var detail = details[c];
        var score = detail[0], pris = detail[1], komi = detail[2];
        var prisoners = pris !== 0 ? ' ' + ( pris < 0 ? '-' : '+' ) + ' ' + Math.abs(pris) + ' prisoners' : '';
        var komiStr = (( komi > 0 ? ' + ' + komi + ' komi' : '' ));
        var detailStr = pris || komi ? ' (' + score + prisoners + komiStr + ')' : '';
        s.push(Grid.colorName(c) + ': ' + pointsToString(totals[c]) + detailStr);
    }
    return s;
};

ScoreAnalyser.prototype._scoreDiffToS = function (diff) {
    if (diff === 0) return 'Tie game';
    var win = ( diff > 0 ? BLACK : WHITE );
    return Grid.colorName(win) + ' wins by ' + pointsToString(Math.abs(diff));
};
