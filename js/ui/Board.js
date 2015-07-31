'use strict';

var main = require('../main');

var Grid = require('../Grid');

var WGo = window.WGo;

var WHITE = main.WHITE, BLACK = main.BLACK, EMPTY = main.EMPTY;


function Board() {
    this.board = null;
    this.tapHandlerFn = null;
    this.goban = null;
    this.gsize = 0;
    this.displayType = null;
}
module.exports = Board;


Board.prototype.create = function (parent, width, goban, options) {
    var gsize = goban.gsize;
    this.goban = goban;
    if (this.board && this.gsize === gsize) return; // already have the right board
    this.gsize = gsize;
    parent.clear();
    var config = { size: gsize, width: width, section: { top: -0.5, left: -0.5, right: -0.5, bottom: -0.5 } };
    this.board = new WGo.Board(parent.getDomElt(), config);
    if (options.coords) this.board.addCustomObject(WGo.Board.coordinates);
    var self = this;
    this.board.addEventListener('click', function (x,y) {
        if (x < 0 || y < 0 || x >= gsize || y >= gsize) return;
        // convert to goban coordinates
        x++; y = gsize - y;

        if (self.goban.color(x, y) !== EMPTY) return;
        var move = Grid.xy2move(x, y);
        self.tapHandlerFn(move);
    });
};

Board.prototype.setTapHandler = function (fn) { this.tapHandlerFn = fn; };

// Color codes conversions from WGo
var fromWgoColor = {};
fromWgoColor[WGo.B] = BLACK;
fromWgoColor[WGo.W] = WHITE;
// Color codes conversions to WGo
var toWgoColor = {};
toWgoColor[EMPTY] = null;
toWgoColor[BLACK] = WGo.B;
toWgoColor[WHITE] = WGo.W;

Board.prototype.refresh = function () {
    var restore = false; // most of the time only stones have been added/removed
    if (this.displayType !== 'regular') {
        this.displayType = 'regular';
        restore = true;
    }
    for (var j = 0; j < this.gsize; j++) {
        for (var i = 0; i < this.gsize; i++) {
            var color = this.goban.color(i + 1, this.gsize - j);
            var wgoColor = toWgoColor[color];

            var obj = this.board.obj_arr[i][j][0];
            if (restore) { obj = null; this.board.removeObjectsAt(i,j); }

            if (wgoColor === null) {
                if (obj) this.board.removeObjectsAt(i,j);
            } else if (!obj || obj.c !== wgoColor) {
                this.board.addObject({ x: i, y: j, c: wgoColor });
            }
        }
    }
};

Board.prototype.show = function (name, yx, fn) {
    this.refresh(); // the base is the up-to-date board
    this.displayType = name;

    for (var j = 0; j < this.gsize; j++) {
        for (var i = 0; i < this.gsize; i++) {
            var obj = fn(yx[this.gsize - j][i + 1]);
            if (!obj) continue;
            obj.x = i; obj.y = j;
            this.board.addObject(obj);
        }
    }
};

function territoryDisplay(cell) {
    switch (cell) {
    case -1:   return { type: 'mini', c: WGo.B };
    case -0.5: return { type: 'outline', c: WGo.B };
    case  0:   return null;
    case +0.5: return { type: 'outline', c: WGo.W };
    case +1:   return { type: 'mini', c: WGo.W };
    default:   return null;
    }
}

function scoringDisplay(cell) {
    switch (cell) {
    case Grid.TERRITORY_COLOR + BLACK:
    case Grid.DEAD_COLOR + WHITE:
        return { type: 'mini', c: WGo.B };
    case Grid.TERRITORY_COLOR + WHITE:
    case Grid.DEAD_COLOR + BLACK:
        return { type: 'mini', c: WGo.W };
    case Grid.DAME_COLOR:
        return { type: 'SL', c: 'grey' };
    default:
        return null;
    }
}

var displayFunctions = {
    territory: territoryDisplay,
    scoring: scoringDisplay
};

Board.prototype.showTerritory = function (yx) {
    this.show('territory', yx, territoryDisplay);
};

Board.prototype.showScoring = function (yx) {
    this.show('scoring', yx, scoringDisplay);
};

Board.prototype.prepareSpecialDisplay = function (name) {
    if (this.displayType !== name) return true;
    // back to regular display
    this.refresh();
    return false;
};

Board.prototype.showSpecial = function (name, yx) {
    var fn = displayFunctions[name];
    if (!fn) { return console.error('invalid display type:', name); }
    this.show(name, yx, fn);
};
