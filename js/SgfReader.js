//Translated from sgf_reader.rb using babyruby2js
'use strict';

var main = require('./main');
// Example:
// (;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]
// SO[http://www.littlegolem.com];B[pd];W[pp];
// B[ce];W[dc]...;B[tt];W[tt];B[tt];W[aq])

//public read-only attribute: boardSize, komi, handicap, handicapStones;

/** @class */
function SgfReader(sgf) {
    this.text = sgf;
    this.nodes = [];
    this.boardSize = 19;
    this.handicap = 0;
    this.handicapStones = [];
    this.komi = 6.5;
    this.parseGameTree(sgf + '');
    return this.getGameInfo();
}
module.exports = SgfReader;

// Raises an exception if we could not convert the format
SgfReader.prototype.toMoveList = function () {
    // NB: we verify the expected player since our internal move format
    // does not mention the player each time.
    var expectedPlayer = 'B';
    var moves = '';
    if (this.handicap > 0) {
        expectedPlayer = 'W';
        if (this.handicapStones.length !== 0) {
            if (this.handicapStones.length !== this.handicap) {
                throw new Error('List of ' + this.handicapStones.length + ' handicap stones given does not match the handicap number of ' + this.handicap);
            }
            moves = 'hand:' + this.handicap + '=' + this.handicapStones.join('-') + ',';
        } else {
            moves = 'hand:' + this.handicap + ',';
        }
    }
    for (var i = 1; i <= this.nodes.length - 1; i++) {
        var name = this.nodes[i][0];
        var value = this.nodes[i][1];
        if (name !== 'B' && name !== 'W') {
            if (name !== 'C') { // comments can be ignored
                main.log.warn('Unknown property ' + name + '[' + value + '] ignored');
            }
            continue;
        }
        if (name !== expectedPlayer) {
            throw new Error('Move for ' + expectedPlayer + ' was expected and we got ' + name + ' instead');
        }
        moves += this.convertMove(value) + ',';
        expectedPlayer = (( expectedPlayer === 'B' ? 'W' : 'B' ));
    }
    return moves.chop();
};

//private;
SgfReader.prototype.getGameInfo = function () {
    var header = this.nodes[0];
    if (!header || header[0] !== 'FF') {
        throw new Error('SGF header missing');
    }
    for (var p = 0; p <= header.length - 1; p += 2) {
        var name = header[p];
        var val = header[p + 1];
        switch (name) {
        case 'FF':
            if (parseInt(val, 10) < 4) {
                main.log.warn('SGF version FF[' + val + ']. Not sure we handle it.');
            }
            break;
        case 'SZ':
            this.boardSize = parseInt(val, 10);
            break;
        case 'HA':
            this.handicap = parseInt(val, 10);
            break;
        case 'AB':
            this.handicapStones.push(this.convertMove(val));
            break;
        case 'KM':
            this.komi = val.toF();
            break;
        case 'RU':
        case 'RE':
        case 'PB':
        case 'PW':
        case 'BR':
        case 'WR':
        case 'BT':
        case 'WT':
        case 'TM':
        case 'DT':
        case 'EV':
        case 'RO':
        case 'PC':
        case 'GN':
        case 'ON':
        case 'GC':
        case 'SO':
        case 'US':
        case 'AN':
        case 'CP':
            //NOP
            break;
        default: 
            main.log.info('Unknown property in SGF header: ' + name + '[' + val + ']');
        }
    }
};

SgfReader.prototype.convertMove = function (sgfMove) {
    if (sgfMove === 'tt') {
        var move = 'pass';
    } else {
        move = sgfMove[0] + (this.boardSize - (sgfMove[1].charCodeAt() - 'a'.charCodeAt())).toString();
    }
    return move;
};

SgfReader.prototype.parseGameTree = function (t) {
    t = this.skip(t);
    t = this.get('(', t);
    t = this.parseNode(t);
    this.finished = false;
    while (!this.finished) {
        t = this.parseNode(t);
    }
    return this.get(')', t);
};

SgfReader.prototype.parseNode = function (t) {
    t = this.skip(t);
    if (t[0] !== ';') {
        this.finished = true;
        return t;
    }
    t = this.get(';', t);
    var node = [];
    while (true) {
        var i = 0;
        while (t[i] && t[i].between('A', 'Z')) {
            i += 1;
        }
        var propIdent = t[0];
        if (propIdent === '') {
            this.error('Property name expected', t);
        }
        node.push(propIdent);
        t = this.get(propIdent, t);
        while (true) {
            t = this.get('[', t);
            var brace = t.index(']');
            if (!brace) {
                this.error('Missing \']\'', t);
            }
            var val = t[0];
            node.push(val);
            t = this.get(val + ']', t);
            if (t[0] !== '[') {
                break;
            }
            node.push(null); // multiple values, we use nil as name for 2nd, 3rd, etc.
        }
        if (!t[0] || !t[0].between('A', 'Z')) {
            break;
        }
    }
    this.nodes.push(node);
    return t;
};

SgfReader.prototype.skip = function (t) {
    return t.trimLeft();
};

SgfReader.prototype.get = function (lex, t) {
    if (!t.startWith(lex)) {
        this.error(lex + ' expected', t);
    }
    return t.sub(lex, '').trimLeft();
};

SgfReader.prototype.error = function (reason, t) {
    throw new Error('Syntax error: \'' + reason + '\' at ...' + t[0] + '...');
};

// E01: unknown no-arg method to_f()
// E02: unknown method sub(...)