'use strict';

var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var log = require('../../log');

var ALWAYS = CONST.ALWAYS;
var EMPTY = CONST.EMPTY, BORDER = CONST.BORDER;


/** @class Saviors rescue ally groups in atari */
function Savior(player) {
    Heuristic.call(this, player);

    this.hunter = null;
}
inherits(Savior, Heuristic);
module.exports = Savior;


Savior.prototype._beforeEvalBoard = function () {
    if (!this.hunter) this.hunter = this.player.heuristic.Hunter;
};

Savior.prototype._evalMove = function (i, j) {
    var stone = this.goban.stoneAt(i, j);
    this._evalEscape(i, j, stone);
    return 0;
};

// i,j / stone is the stone we are proposing to play to help one of nearby groups to escape
Savior.prototype._evalEscape = function (i, j, stone) {
    // look around stone for 2 things: threatened allies & strong allies
    var groups = [], livesAdded = 0, n;

    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives === 1) {
            groups.push(g);
        } else if (g.lives === 2) {
            groups.push(g);
        } else if (g.xDead < ALWAYS) {
            livesAdded += g.lives - 1;
        }
    }
    if (!groups.length) return false; // no threat we handle here
    livesAdded += stone.numEmpties();

    // Not really intuitive: we check if enemy could chase us starting in i,j
    if (log.debug) log.debug('Savior ' + Grid.colorName(this.color) +
        ' asking hunter to look at ' + stone + ' pre-atari on ' + groups[0] +
        (groups.length > 1 ? ' AND ' + (groups.length - 1) + ' other groups' : ''));
    if (!this.hunter.isKill(i, j, this.enemyColor)) return false;

    if (livesAdded === 2) {
        // do not count empties that were already a life of threatened groups
        var empties = stone.empties();
        for (var t = groups.length - 1; t >= 0; t--) {
            g = groups[t];
            for (n = empties.length - 1; n >= 0; n--) {
                if (empties[n].isNextTo(g)) livesAdded--;
            }
        }
    }
    var canSave = livesAdded > 2;
    if (livesAdded === 2) {
        // we get 2 lives from the new stone - first check special case of border
        if (groups.length === 1 && stone.isBorder()) {
            if (log.debug) log.debug('Savior ' + Grid.colorName(this.color) +
                ' checks an escape along border in ' + Grid.xy2move(i, j));
            var savior = this._canEscapeAlongBorder(groups[0], i, j);
            if (savior !== undefined) canSave = !!savior;
        }
        if (!canSave) {
            // get our hunter to evaluate if we can escape
            if (log.debug) log.debug('Savior ' + Grid.colorName(this.color) +
                ' asking hunter to look at ' + Grid.xy2move(i, j) + ', lives_added=' + livesAdded);
            this.goban.tryAt(i, j, this.color);
            canSave = !this.hunter.isEscapingAtariCaught(stone);
            this.goban.untry();
        }
    }
    if (!canSave) {
        if (log.debug) log.debug('Savior ' + Grid.colorName(this.color) + ' giving up on threat in ' + Grid.xy2move(i, j));
        return false; // nothing we can do to help
    }

    for (n = groups.length - 1; n >= 0; n--) {
        g = groups[n];
        this.mi.rescueGroup(g, stone);
        if (log.debug) log.debug('=> Savior thinks we can save a threat in ' + stone + ' against ' + g);
    }
    return true;
};

/**
 * Checks if an escape along border can succeed.
 * group escapes toward i,j, the proposed 1st escape move
 * @return {Group|null|undefined} - group we connect to, null if fails, undefined if we cannot say
 */
Savior.prototype._canEscapeAlongBorder = function (group, i, j) {
    // decide direction
    var dx = 0, dy = 0, gsize = this.gsize;
    if (i === 1 || i === gsize) dy = 1;
    else if (j === 1 || j === gsize) dx = 1;
    else throw new Error('not along border');

    // get direction to second row (next to the border we run on)
    var secondRowDx = dy, secondRowDy = dx;
    if (this.goban.stoneAt(i + secondRowDx, j + secondRowDy) === BORDER) {
        secondRowDx = -secondRowDx; secondRowDy = -secondRowDy;
    }
    // don't handle case of group running toward the border here
    if (this.goban.stoneAt(i + secondRowDx, j + secondRowDy).group === group) {
        return undefined;
    }
    // check 1 stone to see if we should run the other way
    var color = group.color;
    var s = this.goban.stoneAt(i + dx, j + dy);
    if (s !== BORDER && s.group === group) {
        dx = -dx; dy = -dy;
    }

    for(;;) {
        i += dx; j += dy;
        s = this.goban.stoneAt(i, j);
        if (s === BORDER) {
            return null;
        }
        switch (s.color) {
        case color:
            if (s.group.lives > 2) return s.group;
            return null;
        case EMPTY:
            var secondRow = this.goban.stoneAt(i + secondRowDx, j + secondRowDy);
            if (secondRow.color === EMPTY) continue;
            if (secondRow.color === 1 - color) {
                return null;
            }
            if (secondRow.group.lives > 2) return secondRow.group;
            return null;
        default: //enemy
            return null;
        }
    }
};
