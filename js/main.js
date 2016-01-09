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
