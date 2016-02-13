'use strict';

var main = require('../main');

var Grid = require('../Grid');
var touchManager = require('./touchManager.js');

var WGo = window.WGo;

var WHITE = main.WHITE, BLACK = main.BLACK, EMPTY = main.EMPTY;

var pixelRatio = window.devicePixelRatio || 1;

// Color codes conversions from WGo
var fromWgoColor = {};
fromWgoColor[WGo.B] = BLACK;
fromWgoColor[WGo.W] = WHITE;
// Color codes conversions to WGo
var toWgoColor = {};
toWgoColor[EMPTY] = null;
toWgoColor[BLACK] = WGo.B;
toWgoColor[WHITE] = WGo.W;


function Board() {
    this.board = null;
    this.tapHandlerFn = null;
    this.goban = null;
    this.gsize = 0;
    this.displayType = null;
    this.cursor = { type: 'CR', x: 0, y: 0 };
    this.isCursorOn = false;
    this.highlight = { type: null, x: 0, y: 0 };
}
module.exports = Board;


Board.prototype.create = function (parent, width, goban, options) {
    var gsize = goban.gsize;
    this.goban = goban;
    if (this.board && this.gsize === gsize) return; // already have the right board
    this.gsize = gsize;
    options = options || {};
    var margin = options.noCoords ? 0 : -0.23;
    var config = {
        size: gsize,
        width: width,
        section: { top: margin, left: margin, right: margin, bottom: margin },
        coordFontSize: 0.6
    };
    switch (options.background) {
    case 'wood': config.background = (window.rootDir || '.') + '/lib/wood1.jpg'; break;
    default: config.background = '#c75';
    }

    parent.clear();
    this.board = new WGo.Board(parent.getDomElt(), config);
    this.distCursorFromFinger = 60 + this.board.stoneRadius;

    if (!options.noCoords) this.board.addCustomObject(WGo.Board.coordinates);
    this.setEventListeners();
};

Board.prototype.setEventListeners = function () {
    var self = this;
    touchManager.listenOn(this.board.element, function (evName, x, y) {
        if (evName === 'dragCancel') return self.moveCursor(-1, -1);
        if (evName.substr(0, 4) === 'drag') {
            y -= self.distCursorFromFinger;
        }
        var vertex = self.canvas2grid(x, y);
        x = vertex[0]; y = vertex[1];
  
        switch (evName) {
        case 'dragStart':
            return self.moveCursor(x, y);
        case 'drag':
            return self.moveCursor(x, y);
        case 'dragEnd':
            self.moveCursor(-1, -1);
            return self.onTap(x, y);
        case 'tap':
            return self.onTap(x, y);
        }
    });
};

Board.prototype.setCurrentColor = function (color) {
    this.cursorColor = toWgoColor[color];
};

Board.prototype.moveCursor = function (x, y) {
    var isValid = this.isValidCoords(x, y);
    if (this.isCursorOn) {
        if (x === this.cursor.x && y === this.cursor.y) return;
        this.board.removeObject(this.cursor);
    }
    this.isCursorOn = isValid;
    if (!isValid) return;
    this.cursor.x = x; this.cursor.y = y;
    if (this.board.obj_arr[x][y][0]) {
        this.cursor.type = 'CR';
        this.cursor.c = undefined;
    } else {
        this.cursor.type = undefined;
        this.cursor.c = this.cursorColor;
    }
    this.board.addObject(this.cursor);
};

Board.prototype.highlightStone = function (i, j, type) {
    if (this.highlight.type) this.board.removeObject(this.highlight);
    this.highlight.type = type;
    if (!type) return;
    this.highlight.x = i - 1;
    this.highlight.y = this.gsize - j;
    this.board.addObject(this.highlight);
};

Board.prototype.isValidCoords = function (x, y) {
    return x >= 0 && y >= 0 && x < this.gsize && y < this.gsize;
};

// x & y are WGo coordinates (origin 0,0 in top-left corner)
Board.prototype.onTap = function (x, y) {
    // convert to goban coordinates (origin 1,1 in bottom-left corner)
    var i = x + 1;
    var j = this.gsize - y;
    // for invalid taps, send some info anyway but starting with "!"
    if (!this.isValidCoords(x, y)) {
        return this.tapHandlerFn('!' + (i >= 1 && i <= this.gsize ? Grid.xLabel(i) : j));
    }

    if (this.goban.colorAt(i, j) !== EMPTY) return;
    var move = Grid.xy2move(i, j);
    this.tapHandlerFn(move);
};

Board.prototype.setTapHandler = function (fn) {
    this.tapHandlerFn = fn;
};

// Converts canvas to WGo coordinates
Board.prototype.canvas2grid = function(x, y) {
    var board = this.board;
    x = Math.round((x * pixelRatio - board.left) / board.fieldWidth);
    y = Math.round((y * pixelRatio - board.top) / board.fieldHeight);
    return [x,y];
};

Board.prototype.refresh = function () {
    var restore = false; // most of the time only stones have been added/removed
    if (this.displayType !== 'regular') {
        this.displayType = 'regular';
        restore = true;
    }
    for (var j = 0; j < this.gsize; j++) {
        for (var i = 0; i < this.gsize; i++) {
            var color = this.goban.colorAt(i + 1, this.gsize - j);
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

Board.prototype.show = function (displayType, yx, fn) {
    this.refresh(); // the base is the up-to-date board
    this.displayType = displayType;

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

var valueFormatMinDec, valueFormatMaxDec;

// Usually for debug/test
Board.prototype.setValueFormat = function (minDecimals, maxDecimals) {
    valueFormatMinDec = minDecimals;
    valueFormatMaxDec = maxDecimals;
};

function valueDisplay(cell) {
    if (cell === null) return null;

    var minDec = 0, maxDec = 2;
    if (valueFormatMinDec !== undefined) minDec = valueFormatMinDec;
    if (valueFormatMaxDec !== undefined) maxDec = valueFormatMaxDec;

    var val = cell.toFixed(maxDec);
    for (var i = minDec; i < maxDec; i++) val = val.chomp('0');
    val = val.chomp('.');
    if (val === '0') return null;
    if (val.substr(0, 2) === '0.') val = val.slice(1);

    return { type: 'LB', text: val };
}

var displayFunctions = {
    territory: territoryDisplay,
    scoring: scoringDisplay,
    value: valueDisplay
};

Board.prototype.showSpecial = function (displayType, yx) {
    var fn = displayFunctions[displayType];
    if (!fn) { return main.log.error('invalid display type:', displayType); }
    this.show(displayType, yx, fn);
};

Board.prototype.showScoring = function (yx) {
    this.show('scoring', yx, scoringDisplay);
};
