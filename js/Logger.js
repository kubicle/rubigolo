'use strict';

var systemConsole = console;


/** @class */
function Logger() {
    this.level = Logger.INFO;

    Logger.prototype.debug = this._newLogFn(Logger.DEBUG, systemConsole.debug);
    Logger.prototype.info = this._newLogFn(Logger.INFO, systemConsole.info);
    Logger.prototype.warn = this._newLogFn(Logger.WARN, systemConsole.warn);
    Logger.prototype.error = this._newLogFn(Logger.ERROR, systemConsole.error);
    Logger.prototype.fatal = this._newLogFn(Logger.FATAL, systemConsole.error);
}
module.exports = Logger;

Logger.FATAL = 4;
Logger.ERROR = 3;
Logger.WARN = 2;
Logger.INFO = 1;
Logger.DEBUG = 0;

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
