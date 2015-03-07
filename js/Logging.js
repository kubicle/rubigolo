//Translated from  using babyruby2js
'use strict';

var main = require('./main');
var Logger = require('./Logger');
// require "logger"
Logger.ERROR = 3;
Logger.WARNING = 2;
Logger.INFO = 1;
Logger.DEBUG = 0;
//public read-only attribute: level;
//public read-write attribute: level;

/** @class */
function Logger(stream) {
    this.level = Logger.INFO;
}
module.exports = Logger;

Logger.prototype.error = function (msg) {
    console.log('ERROR: ' + msg);
};

Logger.prototype.warn = function (msg) {
    console.log('WARN: ' + msg);
};

Logger.prototype.debug = function (msg) {
    console.log(msg);
};

main.log = new Logger(main.STDOUT);
// change $log.level to Logger::DEBUG, etc. as you need
main.log.level=(Logger.DEBUG);
// change $debug to true to see all the debug logs
// NB: note this slows down everything if $debug is true even if the log level is not DEBUG
main.debug = true;
main.debug_group = false;