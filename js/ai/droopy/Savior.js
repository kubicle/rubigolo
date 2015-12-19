//Translated from savior.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var sOK = main.sOK, sDEBUG = main.sDEBUG, ALWAYS = main.ALWAYS;


/** @class Saviors rescue ally groups in atari */
function Savior(player) {
    Heuristic.call(this, player);

    this.hunter = player.getHeuristic('Hunter');
}
inherits(Savior, Heuristic);
module.exports = Savior;


Savior.prototype.evalBoard = function (stateYx, scoreYx) {
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var state = stateYx[j][i];
            if (state < sOK) continue;
            if (state === sDEBUG && this.name === this.player.debugHeuristic)
                main.debug = true; // set your breakpoint on this line if needed

            var stone = this.goban.stoneAt(i, j);
            var threat = this._evalEscape(i, j, stone);
            if (threat === 0) continue;
            if (main.debug) main.log.debug('=> Savior thinks we can save a threat of ' + threat + ' in ' + stone);
            var score = myScoreYx[j][i] = threat;
            scoreYx[j][i] += score;
        }
    }
};

// i,j / stone is the stone we are proposing to play to help one of nearby groups to escape
Savior.prototype._evalEscape = function (i, j, stone) {
    // look around stone for 2 things: threatened allies & strong allies
    var savedThreat = 0, groups = [], livesAdded = 0;
    var hunterThreat = null; // we only get once the eval from hunter in i,j
    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives === 1) {
            if (hunterThreat === 0) continue;
            groups.push(g);
            if (hunterThreat !== null) continue;
            savedThreat += this.groupThreat(g, true);
        } else if (g.lives === 2) {
            if (hunterThreat === 0) continue;
            groups.push(g);
            if (hunterThreat !== null) continue;
            // Not really intuitive: we check if enemy could chase us starting in i,j
            if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' asking hunter to look at ' +
                stone + ' pre-atari on ' + g);
            hunterThreat = this.hunter.catchThreat(i, j, this.enemyColor);
            if (hunterThreat) savedThreat = hunterThreat; // hunter computes total threat in i,j
        } else if (g.isDead < ALWAYS) {
            livesAdded += g.lives - 1;
        }
    }
    if (savedThreat === 0) return 0; // no threat

    livesAdded += stone.numEmpties();
    if (livesAdded > 2) return savedThreat; // we can save the threat
    if (livesAdded === 2) {
        // do not count empties that were already a life of threatened groups
        var empties = stone.empties();
        for (var t = groups.length - 1; t >= 0; t--) {
            g = groups[t];
            for (var n = empties.length - 1; n >= 0; n--) {
                if (empties[n].isNextTo(g)) livesAdded--;
            }
        }
    }
    if (livesAdded === 2) {
        // we get 2 lives from the new stone - first check special case of border
        if (groups.length === 1 && stone.isBorder()) {
            if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' checks an escape along border in ' + Grid.xy2move(i, j));
            var savior = this.canEscapeAlongBorder(groups[0], i, j);
            if (savior !== undefined) return savior ? savedThreat : 0;
        }
        // get our hunter to evaluate if we can escape
        if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' asking hunter to look at ' + Grid.xy2move(i, j) + ': threat=' + savedThreat + ', lives_added=' + livesAdded);
        this.goban.tryAt(i, j, this.color);
        var isCaught = this.hunter.isEscapingAtariCaught(stone);
        this.goban.untry();
        if (!isCaught) {
            return savedThreat;
        }
    }
    if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' giving up on threat of ' + savedThreat + ' in ' + Grid.xy2move(i, j));
    return 0; // nothing we can do to help
};
