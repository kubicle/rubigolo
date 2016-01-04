//Translated from score_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function ScoreAnalyser() {
    this.goban = null;
    this.analyser = new main.defaultAi.BoardAnalyser();
}
module.exports = ScoreAnalyser;


// Computes score and returns it as a number >0 if black won
ScoreAnalyser.prototype.computeScoreDiff = function (goban, komi) {
    this._computeScore(goban, komi);
    var totals = this.scoreInfo[0];
    return totals[BLACK] - totals[WHITE];
};

// Computes score and returns it as an array of human-readable strings
 ScoreAnalyser.prototype.computeScoreAsTexts = function (goban, komi, whoResigned) {
    this._computeScore(goban, komi, whoResigned);
    return this._scoreInfoToS(this.scoreInfo);
};

// Retrives the scoring grid once the score has been computed
ScoreAnalyser.prototype.getScoringGrid = function () {
    return this.analyser.getScoringGrid();
};

ScoreAnalyser.prototype._computeScore = function (goban, komi, whoResigned) {
    this.goban = goban;
    if (typeof whoResigned === 'number') {
        var winner = Grid.COLOR_NAMES[1 - whoResigned];
        var other = Grid.COLOR_NAMES[whoResigned];
        this.scoreInfo = winner + ' won (since ' + other + ' resigned)';
        return;
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

    this.scoreInfo = [totals, details];
};

function pointsToString(n) {
    return ( n !== 1 ? n + ' points' : '1 point' );
}

ScoreAnalyser.prototype._scoreInfoToS = function (info) {
    if (typeof info === 'string') { // one player resigned
        return [info];
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
        var komiStr = (( komi > 0 ? ' + ' + komi + ' komi' : '' ));
        s.push(Grid.colorName(c) + ': ' +
            pointsToString(totals[c]) + ' (' + score + ' ' +
            ( pris < 0 ? '-' : '+' ) + ' ' + Math.abs(pris) + ' prisoners' +
            komiStr + ')');
    }
    return s;
};

ScoreAnalyser.prototype._scoreDiffToS = function (diff) {
    if (diff === 0) return 'Tie game';
    var win = ( diff > 0 ? BLACK : WHITE );
    return Grid.colorName(win) + ' wins by ' + pointsToString(Math.abs(diff));
};
