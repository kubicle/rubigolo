'use strict';

/** Singleton "main" before everything else */
var main = module.exports = {};

var Logger = require('./Logger');
var TestSeries = require('./test/TestSeries');
var TestCase = require('./test/TestCase');

main.debug = false;
main.TestCase = TestCase; // could be refactored - each test can require TestCase now
main.tests = new TestSeries();
main.log = new Logger();


//--- Misc Helpers

/** main.isA(Vehicule, myCar) -> TRUE
 *  main.isA(Car, myCar) -> true
 *  klass can be a string for Ruby types that have no exact equivalent in JS
 */
main.isA = function (klass, obj) {
    if (typeof klass === 'string') {
        if (klass === 'integer') return (typeof obj === 'number' || obj instanceof Number) && ~~obj === obj;
        if (klass === 'float') return (typeof obj === 'number' || obj instanceof Number);
        throw new Error('Invalid parameter for isA: ' + klass);
    }
    if (obj instanceof klass) return true;
    if (obj === null || obj === undefined) return false;
    if (obj.constructor.name === klass.name) return true; // for String and Number
    return false;
};

/** main.isA(Vehicule, myCar) -> FALSE
 *  main.isA(Car, myCar) -> true
 */
main.instanceOf = function (klass, obj) {
    return obj.constructor.name === klass.name;
};

/** Shallow clone helper.
 *  Usual caution applies - please do some reading about the pitfalls if needed.
 */
main.clone = function (obj) {
    if (obj === null || obj === undefined) return obj;
    var clone;
    if (main.isA(Array, obj)) {
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
