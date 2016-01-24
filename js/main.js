'use strict';

var pkg = require('../package.json');
var Logger = require('./Logger');
var createConstants = require('./constants');


function Main() {
    createConstants(this);

    this.debug = false;
    this.debugGroup = this.debugAi = this.debugBreed = false;

    this.appName = pkg.name;
    this.appVersion = pkg.version;

    this.isCiTest = this.isCoverTest = false;

    // Known AIs and default one
    this.ais = null;
    this.defaultAi = this.latestAi = this.previousAi = null;

    this.ui = null;
    this.gtp = null;

    this.tests = null;
    this.testUi = null;

    this.log = new Logger();
}

/** Singleton "main" */
var main = new Main();
module.exports = main;


Main.prototype.initAis = function () {
    this.ais = {
        Frankie: require('./ai/frankie'),
        Droopy:  require('./ai/droopy'),
        Chuckie: require('./ai/chuckie')
    };
    this.defaultAi = this.latestAi = this.ais.Chuckie;
    this.previousAi = this.ais.Droopy;
};

Main.prototype.initTests = function () {
    var TestSeries = require('./test/TestSeries');
    var addAllTests = require('./test/TestAll'); // one day this will only be in the testing build

    this.tests = new TestSeries();
    addAllTests(this.tests);
};


//--- Misc Helpers

/** If function.name is not supported, this function returns this info.
 *  E.g. for this.constructor.name you can do main.funcName(this.constructor)
 */
main.funcName = function (func) {
    return func.name || func.toString().split(/ |\(/, 2)[1];
};

/** Shallow clone helper.
 *  Usual caution applies - please do some reading about the pitfalls if needed.
 */
main.clone = function (obj) {
    if (obj === null || obj === undefined) return obj;
    var clone;
    if (obj instanceof Array) {
        clone = [];
        for (var i = 0, len = obj.length; i < len; i++) clone[i] = obj[i];
    } else if (typeof obj === 'object') {
        if (typeof obj.clone === 'function') return obj.clone(); // object knows better
        clone = {};
        for (var k in obj) {
            var val = obj[k];
            if (typeof val !== 'function') clone[k] = val;
        }
    } else throw new Error('main.clone called on ' + typeof obj);
    return clone;
};


//--- String

function hasLf(s) {
    if (s.slice(-1) !== '\n') return 0;
    if (s.slice(-2) !== '\r\n') return 1;
    return 2;
}

String.prototype.chomp = function (tail) {
    if (tail === undefined) {
        return this.substr(0, this.length - hasLf(this)); // NB: we cut 0 if no LF
    }
    var pos = this.length - tail.length;
    if (this.substr(pos) === tail) {
        return this.substr(0, pos);
    }
    return this.toString(); // unchanged string is returned
};

String.prototype.chop = function (count) {
    if (count === undefined) {
        // special behavior: chop ending \n or \r\n
        count = hasLf(this) || 1; // we cut at least 1
    } else if(typeof count !== 'number') {
        throw new Error('Invalid parameter type for String.count: ' + typeof count);
    }
    return this.substr(0, this.length - count);
};

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (head) {
        return this.substr(0, head.length) === head;
    };
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (tail) {
        return this.substr(this.length - tail.length) === tail;
    };
}

// TODO replace using toFixed() for float and ('0'+n).slice(-2) for int
String.prototype.format = function (num) {
    if (this[0] !== '%') throw new Error('Invalid format: ' + this.toString());
    var fmt = this.slice(1,-1), res, pos = 0;
    var code = this.slice(-1);
    switch (code) {
    case 'd': case 'x': //'%2d'
        var padChar = ' ';
        if (fmt[pos] === '0') { pos++; padChar = '0'; }
        var len = parseInt(fmt.substr(pos));
        res = num.toString(code === 'x' ? 16 : 10);
        for (var i = len - res.length; i > 0; i--) { res = padChar + res; }
        return res;
    case 'f': //'%.02f'
        var sign = '';
        if (fmt[pos] === '+') { pos++; if (num > 0) sign = '+'; }
        if (fmt[pos++] !== '.') break;
        var prec = parseInt(fmt.substr(pos));
        return sign + num.toFixed(prec);
    }
    throw new Error('Unknown format: ' + this.toString());
};

String.prototype.between = function (low, high) {
    return this >= low && this <= high;
};


//--- Array

main.newArray = function (size, initValue) {
    var a = new Array(size);
    for (var i = size - 1; i >= 0; i--) a[i] = initValue;
    return a;
};

main.newArray2 = function (numRows, numCols, initValue) {
    var yx = new Array(numRows);
    var emptyRow = yx[0] = main.newArray(numCols, initValue);
    for (var j = numRows - 1; j >= 1; j--) yx[j] = emptyRow.concat();
    return yx;
};

/** Mimics the Ruby Array constructor. Same limitation as in Ruby: do not use an object unless
 *  you really want all items to "point" to this object (i.e. modifying the objet will affect all items)
 *  @param {int} size
 *  @param {value|func} init - if a value is given, it is assigned to all items in the array.
 *         If a func is given, array[i] = func(i) will be performed for each item.
 *  @return {Array} - the new array
 */
Array.new = function (size, init) {
    if (size === undefined) return [];
    if (init === undefined) return new Array(size);

    var i, a = [];
    if (typeof init === 'function') {
        for (i = 0; i < size; i++) { a[i] = init(i); }
    } else {
        for (i = 0; i < size; i++) { a[i] = init; }
    }
    return a;
};

/** Push onto this array the items from array2 that are not yet in it.
 *  Returns the count of items added. */
Array.prototype.pushUnique = function (array2) {
    var len0 = this.length;
    for (var i = 0; i < array2.length; i++) {
        var e = array2[i];
        if (this.indexOf(e) === -1) this.push(e);
    }
    return this.length - len0;
};

//TODO replace .clear() by .length = 0
Array.prototype.clear = function () {
    this.length = 0;
};
