//Translated from sgf_reader.rb using babyruby2js
'use strict';

var main = require('./main');

var BLACK = main.BLACK, WHITE = main.WHITE;
var colorName = ['B', 'W'];
var defaultBoardSize = 19;

// Example:
// (;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]
// SO[http://www.littlegolem.com];B[pd];W[pp];
// B[ce];W[dc]...;B[tt];W[tt];B[tt];W[aq])

var infoTags = {
    GM: ['int', null], // 1: Go - other values are considered invalid
    FF: ['int', 'fileFormat'],
    SZ: ['int', 'boardSize'], // NB: necessary for 'move' type conversions
    AB: ['move', null], // add a move (or handicap) for Black
    AW: ['move', null], // add a move for White
    HA: ['int', 'handicap'],
    KM: ['real', 'komi'],
    RU: ['text', 'rules'], // Manadatory names: AGA, GOE, Japanese, NZ
    RE: ['text', 'result'],
    PB: ['text', 'playerBlack'],
    PW: ['text', 'playerWhite'],
    BS: ['int', 'blackSpecies'], // 0: human, >0: computer
    WS: ['int', 'whiteSpecies'],
    LT: ['flag', 'enforceLosingOnTime'],
    SO: ['text', 'source'],
    ID: ['text', 'gameId'],
    AP: ['text', 'application'], // used to create the SGF file
    BR: ['text', 'blackRank'],
    WR: ['text', 'whiteRank'],
    BT: ['text', 'blackTeam'], // Black's Team
    WT: ['text', 'whiteTeam'], // White's Team
    TM: ['text', 'timeLimit'], // per player
    OT: ['text', 'overtimeMethod'],
    EV: ['text', 'event'], // e.g. tournament name
    RO: ['text', 'round'],
    DT: ['text', 'date'],
    PC: ['text', 'place'],
    GN: ['text', 'gameName'],
    ON: ['text', 'openingPlayed'],
    GC: ['text', 'gameComment'],
    C:  ['text', 'comment'],
    N:  ['text', 'nodeName'],
    US: ['text', 'userName'], // user who entered the game
    AN: ['text', 'analyseAuthor'],
    CP: ['text', 'copyright'],
    CA: ['text', 'characterSet'], // e.g. UTF-8
    ST: ['text', null] // method used to display variations
};

var gameTags = {
    B: 'move',
    W: 'move',
    AB: 'move',
    AW: 'move',
    BL: null, // Black's time Left
    WL: null, // White's time Left
    C:  null, // comments
    CR: null, // circle
    BM: null, // bad move
    N:  null  // node name
};



/** @class */
function SgfReader() {
    this.text = null;
    this.nodes = null;
    this.boardSize = 0;
    this.handMoves = null;
    this.infos = null;
    this.curColor = BLACK;
    this.moves = null;
    this.moveNumber = 0;
}
module.exports = SgfReader;


SgfReader.isSgf = function (game) {
    return game.trim().startsWith('(;');
};

// Raises an exception if we could not convert the format
SgfReader.prototype.readGame = function (sgf, upToMoveNumber) {
    if (!SgfReader.isSgf(sgf)) throw new Error('Not an SGF file');
    this.text = sgf;
    this.nodes = [];
    this.handMoves = [[], []];
    this._parseGameTree(sgf);
    this._processGameInfo();
    this._processMoves(upToMoveNumber);
    return this.infos;
};

SgfReader.prototype.toMoveList = function () {
    return this.moves;
};

function letterToCoord(c) {
    if (c.between('a', 'z')) return c.charCodeAt() - 97; // - 'a'
    if (c.between('A', 'Z')) return c.charCodeAt() - 65; // - 'A'
    throw new Error('Invalid coordinate value: ' + c);
}

var COLUMNS = 'abcdefghjklmnopqrstuvwxyz'; // NB: "i" is skipped + not handling > z

// this.boardSize (tag SZ) must be known before we can convert moves
// If SZ is unknown while we start generating moves, we suppose size as default.
// Once boardSize is set, changing it throws an exception.
SgfReader.prototype._setBoardSize = function (size) {
    if (this.boardSize) throw new Error('Size (SZ) set twice or after the first move');
    this.boardSize = size;
};

SgfReader.prototype._convertMove = function (sgfMove) {
    if (!this.boardSize) this._setBoardSize(defaultBoardSize);

    if (sgfMove === '' || (sgfMove === 'tt' && this.boardSize <= 19)) {
        return 'pass';
    }
    var i = COLUMNS[letterToCoord(sgfMove[0])];
    var j = this.boardSize - letterToCoord(sgfMove[1]);
    return i + j;
};

SgfReader.prototype._addMove = function (color, move, isHand) {
    // Keep count of "real" moves (not handicap or "added" moves)
    if (!isHand) this.moveNumber++;
    
    // Add color info to the move if this was not the expected color
    var colorStr = color === this.curColor ? '' : colorName[color];
    // If real game started...
    if (this.moveNumber) {
        this.curColor = 1 - color;
        this.moves.push(colorStr + move);
    } else {
        this.handMoves[color].push(move);
    }
};

SgfReader.prototype._convertValue = function (rawVal, valType) {
    switch (valType) {
    case 'text': return rawVal;
    case 'int': return parseInt(rawVal);
    case 'real': return parseFloat(rawVal);
    case 'flag': return true;
    case 'move': return this._convertMove(rawVal);
    default: throw new Error('Invalid tag type: ' + valType);
    }
};

SgfReader.prototype._processGameTag = function (name, rawVal) {
    var valType = gameTags[name];
    if (valType === undefined) {
        return main.log.warn('Unknown property ' + name + '[' + rawVal + '] ignored');
    }
    if (!valType) return; // fine to ignore

    var value = this._convertValue(rawVal, valType);

    switch (name) {
    case 'B': return this._addMove(BLACK, value);
    case 'W': return this._addMove(WHITE, value);
    case 'AB': return this._addMove(BLACK, value, /*isHand=*/true);
    case 'AW': return this._addMove(WHITE, value, /*isHand=*/true);
    }
};

SgfReader.prototype._genHandMoves = function (color) {
    var moves = this.handMoves[color];
    if (!moves.length) return '';

    return 'hand:' + colorName[color] + '=' + moves.join('-') + ',';
};

SgfReader.prototype._processMoves = function (upToMoveNumber) {
    this.moves = [];
    this.moveNumber = 0;
    this.curColor = null;

    for (var i = 1; i < this.nodes.length; i++) {
        var node = this.nodes[i];
        for (var n = 0; n < node.length; n += 2) {
            var name = node[n] || name;
            var rawVal = node[n + 1];
            this._processGameTag(name, rawVal);
        }
    }
    var beforeMove = upToMoveNumber ? upToMoveNumber - 1 : this.moves.length;
    this.moves = (this._genHandMoves(BLACK) + this._genHandMoves(WHITE) +
        this.moves.slice(0, beforeMove).join(',')).chomp(',');
};

SgfReader.prototype._storeInfoTag = function (name, rawVal) {
    var tag = infoTags[name];
    if (tag === undefined) {
        this.infos[name] = rawVal;
        return main.log.info('Unknown property in SGF header: ' + name + '[' + rawVal + ']');
    }
    var infoType = tag[0], infoName = tag[1];

    var value = this._convertValue(rawVal, infoType);
    if (infoName) this.infos[infoName] = value;
    return value;
};

SgfReader.prototype._processGameInfo = function () {
    this.boardSize = null;
    this.infos = { boardSize: defaultBoardSize, komi: 0, handicap: 0 };
    var header = this.nodes[0];
    for (var p = 0; p <= header.length - 1; p += 2) {
        var name = header[p];
        var rawVal = header[p + 1];

        var value = this._storeInfoTag(name, rawVal);

        switch (name) {
        case 'GM':
            if (value !== 1) throw new Error('SGF game is not a GO game');
            break;
        case 'FF': // FileFormat
            if (value < 3 || value > 4) {
                main.log.warn('SGF format ' + value + '. Not sure we handle it well.');
            }
            break;
        case 'SZ': this._setBoardSize(value); break;
        case 'AB': this._addMove(BLACK, value, /*isHand=*/true); break;
        case 'AW': this._addMove(WHITE, value, /*isHand=*/true); break;
        }
    }
};

SgfReader.prototype._parseGameTree = function (t) {
    t = this._skip(t);
    t = this._get('(', t);
    t = this._parseNode(t);
    this.finished = false;
    while (!this.finished) {
        t = this._parseNode(t);
    }
    return this._get(')', t);
};

function indexOfClosingBrace(t) {
    var pos = 0;
    for (;;) {
        var brace = t.indexOf(']', pos);
        if (brace === -1) return -1;
        if (t[brace - 1] !== '\\') return brace;
        pos = brace + 1;
    }
}

SgfReader.prototype._parseNode = function (t) {
    t = this._skip(t);
    if (t[0] !== ';') {
        this.finished = true;
        return t;
    }
    t = this._get(';', t);
    var node = [];
    for (;;) {
        var i = 0;
        while (t[i] && t[i].between('A', 'Z')) { i++; }
        var propIdent = t.substr(0, i);
        if (propIdent === '') this._error('Property name expected', t);
        node.push(propIdent);
        t = this._get(propIdent, t);
        for (;;) {
            t = this._get('[', t);
            var brace = indexOfClosingBrace(t);
            if (brace < 0) this._error('Missing \']\'', t);

            var val = t.substr(0, brace);
            node.push(val);
            t = this._get(val + ']', t);
            if (t[0] !== '[') break;
            node.push(null); // multiple values, we use nil as name for 2nd, 3rd, etc.
        }
        if (!t[0] || !t[0].between('A', 'Z')) break;
    }
    this.nodes.push(node);
    return t;
};

SgfReader.prototype._skip = function (t) {
    return t.trim();
};

SgfReader.prototype._get = function (lex, t) {
    if (!t.startsWith(lex)) this._error(lex + ' expected', t);
    return t.replace(lex, '').trim();
};

SgfReader.prototype._error = function (reason, t) {
    throw new Error('Syntax error: \'' + reason + '\' at ...' + t.substr(0, 20) + '...');
};
