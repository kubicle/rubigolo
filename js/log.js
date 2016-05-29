'use strict';

var systemConsole = console;

var DEBUG = 0, INFO = 1, WARN = 2, ERROR = 3, FATAL = 4;

/** @class */
function Logger() {
    this.level = NaN;
    this.logfunc = null;

    this.DEBUG = 0;
    this.INFO = 1;
    this.WARN = 2;
    this.ERROR = 3;
    this.FATAL = 4;

    this.debugBreed = false;
    this.debugGroup = false;
}

Logger.prototype.setLevel = function (level) {
    if (level === this.level) return;
    this.level = level;
    this.debug = level <= DEBUG ? this.logDebug : null;
    this.info =  level <= INFO ?  this.logInfo : null;
    this.warn =  level <= WARN ?  this.logWarn : null;
    this.error = level <= ERROR ? this.logError : null;
    this.fatal = level <= FATAL ? this.logFatal : null;
};

Logger.prototype.setLogFunc = function (fn) {
    this.logfunc = fn;
};

Logger.prototype._newLogFn = function (lvl, consoleFn) {
    var self = this;
    return function (msg) {
        if (self.level > lvl) return;
        if (self.logfunc && !self.logfunc(lvl, msg)) return;
        consoleFn.call(systemConsole, msg);
    };
};

var log = module.exports = new Logger();

Logger.prototype.logDebug = log._newLogFn(DEBUG, systemConsole.debug);
Logger.prototype.logInfo =  log._newLogFn(INFO, systemConsole.info);
Logger.prototype.logWarn =  log._newLogFn(WARN, systemConsole.warn);
Logger.prototype.logError = log._newLogFn(ERROR, systemConsole.error);
Logger.prototype.logFatal = log._newLogFn(FATAL, systemConsole.error);

log.setLevel(INFO);
