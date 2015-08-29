//Translated from savior.rb using babyruby2js
'use strict';

var main = require('../main');

var Grid = require('../Grid');
var Heuristic = require('./Heuristic');
var Hunter = require('./Hunter');
var inherits = require('util').inherits;
var Stone = require('../Stone');

var sOK = main.sOK, ALWAYS = main.ALWAYS;


/** @class Saviors rescue ally groups in atari */
function Savior(player) {
    Heuristic.call(this, player);
    this.enemyHunter = new Hunter(player, true);
}
inherits(Savior, Heuristic);
module.exports = Savior;

Savior.prototype.initColor = function () {
    Heuristic.prototype.initColor.call(this);
    return this.enemyHunter.initColor();
};

Savior.prototype.evalBoard = function (stateYx, scoreYx) {
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            var stone = this.goban.stoneAt(i, j);
            var threat = this._evalEscape(i, j, stone);
            if (threat === 0) continue;
            if (main.debug) main.log.debug('=> Savior thinks we can save a threat of ' + threat + ' in ' + stone);
            var score = myScoreYx[j][i] = threat;
            scoreYx[j][i] += score;
        }
    }
};

Savior.prototype._evalEscape = function (i, j, stone) {
    // look around stone for 2 things: threatened allies & strong allies
    var threat = 0, livesAdded = 0, groups = [];
    var hunterThreat = null;
    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives === 1) {
            // NB: if more than 1 group in atari, they merge if we play this "savior" stone
            groups.push(g);
            threat += this.groupThreat(g, true);
        } else if (g.lives === 2) {
            groups.push(g);
            if (hunterThreat !== null) continue;
            if (main.debug) main.log.debug('Savior asking hunter to look at ' + Grid.xy2move(i, j) + ': pre-atari on ' + g);
            hunterThreat = this.enemyHunter.evalMove(i, j);
            threat += hunterThreat;
        } else if (g.isDead < ALWAYS) {
            livesAdded += g.lives - 1;
        }
    }
    if (threat === 0) return 0; // no threat

    livesAdded += stone.numEmpties();
    if (livesAdded > 2) return threat; // we can save the threat
    if (livesAdded >= 2) {
        // do not count empties that were already a life of threatened groups
        var empties = stone.empties();
        for (var t = groups.length - 1; t >= 0; t--) {
            g = groups[t];
            for (var n = empties.length - 1; n >= 0; n--) {
                if (empties[n].isNextTo(g)) livesAdded--;
            }
        }
    }
    if (livesAdded >= 2) {
        if (livesAdded === 2 && this.distanceFromStoneToBorder(stone) === 0) {
            if (main.debug) main.log.debug('Savior giving up on threat of ' + threat + ' in ' + Grid.xy2move(i, j) +
                ' because escape is along the border (TODO later)');
            return 0;
        }
        // when we get 2 lives from the new stone, get our "consultant hunter" to evaluate if we can escape
        if (main.debug) main.log.debug('Savior asking hunter to look at ' + Grid.xy2move(i, j) + ': threat=' + threat + ', lives_added=' + livesAdded);
        Stone.playAt(this.goban, i, j, this.color);
        var isCaught = this.enemyHunter.escapingAtariIsCaught(stone);
        Stone.undo(this.goban);
        if (!isCaught) {
            return threat;
        }
    }
    if (main.debug) main.log.debug('Savior giving up on threat of ' + threat + ' in ' + Grid.xy2move(i, j));
    return 0; // nothing we can do to help
};
