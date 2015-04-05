//Translated from score_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var BoardAnalyser = require('./BoardAnalyser');

/** @class */
function ScoreAnalyser() {
    this.goban = null;
    this.analyser = new BoardAnalyser();
}
module.exports = ScoreAnalyser;

// Compute simple score difference for a AI-AI game (score info not needed)
ScoreAnalyser.prototype.computeScoreDiff = function (goban, komi) {
    this.analyser.countScore(goban);
    var scores = this.analyser.scores;
    var prisoners = this.analyser.prisoners;
    var b = scores[main.BLACK] + prisoners[main.WHITE];
    var w = scores[main.WHITE] + prisoners[main.BLACK] + komi;
    return b - w;
};

// Returns score info as an array of strings
ScoreAnalyser.prototype.computeScore = function (goban, komi, whoResigned) {
    this.startScoring(goban, komi, whoResigned);
    var txt = this.scoreInfoToS(this.scoreInfo);
    return txt;
};

// Initialize scoring phase
ScoreAnalyser.prototype.startScoring = function (goban, komi, whoResigned) {
    this.goban = goban;
    if (whoResigned) {
        var winner = Grid.COLOR_NAMES[1 - whoResigned];
        var other = Grid.COLOR_NAMES[whoResigned];
        this.scoreInfo = winner + ' won (since ' + other + ' resigned)';
        return;
    }
    this.analyser.countScore(goban);
    var scores = this.analyser.scores;
    var prisoners = this.analyser.prisoners;
    var totals = [];
    var details = [];
    var addPris = true;
    for (var c = 1; c <= 2; c++) {
        var kom = (( c === main.WHITE ? komi : 0 ));
        var pris = (( addPris ? prisoners[1 - c] : -prisoners[c] ));
        totals[c] = scores[c] + pris + kom;
        details[c] = [scores[c], pris, kom];
    }
    this.scoreInfo = [totals, details];
};

ScoreAnalyser.prototype.getScore = function () {
    return this.scoreInfoToS(this.scoreInfo);
};

ScoreAnalyser.prototype.scoreInfoToS = function (info) {
    if (main.isA('String', info)) { // for games where all but 1 resigned
        return [info];
    }
    if (!info || info.length !== 2) {
        throw new Error('Invalid score info: ' + info);
    }
    var totals = info[0];
    var details = info[1];
    if (totals.length !== details.length) {
        throw new Error('Invalid score info');
    }
    var s = [];
    s.push(this.scoreWinnerToS(totals));
    for (var c = 1; c <= 2; c++) {
        var detail = details[c];
        if (detail === null) {
            s.push(Grid.colorName(c) + ' resigned');
            continue;
        }
        if (detail.length !== 3) {
            throw new Error('Invalid score details');
        }
        var score = detail[0];
        var pris = detail[1];
        var komi = detail[2];
        var komiStr = (( komi > 0 ? ' + ' + komi + ' komi' : '' ));
        s.push(Grid.colorName(c) + ' (' + Grid.COLOR_CHARS[c] + '): ' + this.pts(totals[c]) + ' (' + score + ' ' + ( pris < 0 ? '-' : '+' ) + ' ' + Math.abs(pris) + ' prisoners' + komiStr + ')');
    }
    return s;
};

ScoreAnalyser.prototype.scoreDiffToS = function (diff) {
    if (diff !== 0) {
        var win = ( diff > 0 ? main.BLACK : main.WHITE );
        return Grid.colorName(win) + ' wins by ' + this.pts(Math.abs(diff));
    } else {
        return 'Tie game';
    }
};

ScoreAnalyser.prototype.scoreWinnerToS = function (totals) {
    if (totals.length === 2) {
        var diff = totals[0] - totals[1];
        return this.scoreDiffToS(diff);
    } else {
        var max = Math.max.apply(Math, totals);
        var winners = [];
        for (var c = 1; c <= totals.length; c++) {
            if (totals[c] === max) {
                winners.push(c);
            }
        }
        if (winners.length === 1) {
            return Grid.colorName(winners[0]) + ' wins with ' + this.pts(max);
        } else {
            return 'Tie between ' + winners.map(function (w) {
                return '' + Grid.colorName(w);
            }).join(' & ') + ', ' + ( winners.length === 2 ? 'both' : 'all' ) + ' with ' + this.pts(max);
        }
    }
};

//private;
ScoreAnalyser.prototype.pts = function (n) {
    return ( n !== 1 ? n + ' points' : '1 point' );
};
