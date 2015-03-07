//Translated from sgf_reader.rb using babyruby2js
'use strict';

var main = require('./main');
// Example:
// (;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]
// SO[http://www.littlegolem.com];B[pd];W[pp];
// B[ce];W[dc]...;B[tt];W[tt];B[tt];W[aq])

//public read-only attribute: board_size, komi, handicap, handicap_stones;

/** @class */
function SgfReader(sgf) {
    this.text = sgf;
    this.nodes = [];
    this.board_size = 19;
    this.handicap = 0;
    this.handicap_stones = [];
    this.komi = 6.5;
    this.parse_game_tree(sgf + '');
    return this.get_game_info();
}
module.exports = SgfReader;

// Raises an exception if we could not convert the format
SgfReader.prototype.to_move_list = function () {
    // NB: we verify the expected player since our internal move format
    // does not mention the player each time.
    var expected_player = 'B';
    var moves = '';
    if (this.handicap > 0) {
        expected_player = 'W';
        if (this.handicap_stones.size !== 0) {
            if (this.handicap_stones.size !== this.handicap) {
                throw new Error('List of ' + this.handicap_stones.size + ' handicap stones given does not match the handicap number of ' + this.handicap);
            }
            moves = 'hand:' + this.handicap + '=' + this.handicap_stones.join('-') + ',';
        } else {
            moves = 'hand:' + this.handicap + ',';
        }
    }
    for (var i = 1; i <= this.nodes.size - 1; i++) {
        var name = this.nodes[i][0];
        var value = this.nodes[i][1];
        if (name !== 'B' && name !== 'W') {
            if (name !== 'C') {
                main.log.warn('Unknown property ' + name + '[' + value + '] ignored');
            } // comments can be ignored
            continue;
        }
        if (name !== expected_player) {
            throw new Error('Move for ' + expected_player + ' was expected and we got ' + name + ' instead');
        }
        moves += this.convert_move(value) + ',';
        expected_player = (( expected_player === 'B' ? 'W' : 'B' ));
    }
    return main.strChop(moves);
};

//private;
SgfReader.prototype.get_game_info = function () {
    var header = this.nodes[0];
    if (!header || header[0] !== 'FF') {
        throw new Error('SGF header missing');
    }
    for (var p = 0; p <= header.size - 1; p += 2) {
        var name = header[p];
        var val = header[p + 1];
        switch (name) {
        case 'FF':
            if (parseInt(val, 10) < 4) {
                main.log.warn('SGF version FF[' + val + ']. Not sure we handle it.');
            }
            break;
        case 'SZ':
            this.board_size = parseInt(val, 10);
            break;
        case 'HA':
            this.handicap = parseInt(val, 10);
            break;
        case 'AB':
            this.handicap_stones.push(this.convert_move(val));
            break;
        case 'KM':
            this.komi = val.to_f();
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

SgfReader.prototype.convert_move = function (sgf_move) {
    if (sgf_move === 'tt') {
        var move = 'pass';
    } else {
        move = sgf_move[0] + (this.board_size - ((sgf_move[1]).charCodeAt() - ('a').charCodeAt())).to_s();
    }
    return move;
};

SgfReader.prototype.parse_game_tree = function (t) {
    t = this.skip(t);
    t = this.get('(', t);
    t = this.parse_node(t);
    this.finished = false;
    while (!this.finished) {
        t = this.parse_node(t);
    }
    return this.get(')', t);
};

SgfReader.prototype.parse_node = function (t) {
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
        var prop_ident = t[0];
        if (prop_ident === '') {
            this.error('Property name expected', t);
        }
        node.push(prop_ident);
        t = this.get(prop_ident, t);
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
    if (!t.start_with(lex)) {
        this.error(lex + ' expected', t);
    }
    return t.sub(lex, '').trimLeft();
};

SgfReader.prototype.error = function (reason, t) {
    throw new Error('Syntax error: \'' + reason + '\' at ...' + t[0] + '...');
};
