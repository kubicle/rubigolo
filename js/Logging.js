//Translated from logging.rb using babyruby2js
'use strict';

var main = require('./main');
//require 'logger';
main.log = new main.Logger(main.STDOUT);
// change $log.level to Logger::DEBUG, etc. as you need
main.log.level=(main.Logger.DEBUG);
// change $debug to true to see all the debug logs
// NB: note this slows down everything if $debug is true even if the log level is not DEBUG
main.debug = true;
main.debugGroup = false;
// W02: unknown class supposed to be attached to main: Logger
// W02: unknown constant supposed to be attached to main: STDOUT
// E02: unknown method: level=(...)
// W02: unknown class supposed to be attached to main: Logger
