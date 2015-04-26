//Translated from savior.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Stone = require('../Stone');
// Saviors rescue ally groups in atari
var Heuristic = require('./Heuristic');
var Hunter = require('./Hunter');

/** @class */
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

Savior.prototype.evalMove = function (i, j) {
    var stone = this.goban.stoneAt(i, j);
    var threat = this.evalEscape(i, j, stone);
    if (main.debug && threat > 0) {
        main.log.debug('=> Savior thinks we can save a threat of ' + threat + ' in ' + i + ',' + j);
    }
    return threat;
};

//private;
Savior.prototype.evalEscape = function (i, j, stone) {
    var threat, livesAdded;
    threat = livesAdded = 0;
    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        var newThreat = null;
        if (g.lives === 1) {
            // NB: if more than 1 group in atari, they merge if we play this "savior" stone
            newThreat = g.stones.length;
        } else if (g.lives === 2) {
            if (main.debug) {
                main.log.debug('Savior asking hunter to look at ' + i + ',' + j + ': pre-atari on ' + g);
            }
            newThreat = this.enemyHunter.evalMove(i, j);
        }
        if (!newThreat) {
            livesAdded += g.lives - 1;
        } else {
            threat += newThreat;
        }
    }
    if (threat === 0) { // no threat
        return 0;
    }
    livesAdded += stone.numEmpties();
    // $log.debug("Savior looking at #{i},#{j}: threat is #{threat}, lives_added is #{lives_added}") if $debug
    if (livesAdded < 2) { // nothing we can do here
        return 0;
    }
    if (livesAdded === 2) {
        // when we get 2 lives from the new stone, get our "consultant hunter" to evaluate if we can escape
        if (main.debug) {
            main.log.debug('Savior asking hunter to look at ' + i + ',' + j + ': threat=' + threat + ', lives_added=' + livesAdded);
        }
        Stone.playAt(this.goban, i, j, this.color);
        var isCaught = this.enemyHunter.escapingAtariIsCaught(stone);
        Stone.undo(this.goban);
        if (isCaught) {
            if (main.debug) {
                main.log.debug('Savior giving up on threat of ' + threat + ' in ' + i + ',' + j);
            }
            return 0;
        }
    }
    return threat;
};
