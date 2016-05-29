'use strict';

//var main = require('../main');
var GtpEngine = require('./GtpEngine');
var inherits = require('util').inherits;


/** @class
 * GTP Engine interface for UI (extends GtpEngine)
 */
function UiGtpEngine(ui) {
    GtpEngine.call(this, ui.game);
    this.ui = ui;
}
inherits(UiGtpEngine, GtpEngine);
module.exports = UiGtpEngine;


UiGtpEngine.prototype.quit = function () {
    this.ui.message('GTP quit command received');
};

UiGtpEngine.prototype.send = function (msg) {
    console.log(msg); // TODO UI will probably connect via socket etc.
};

UiGtpEngine.prototype.getAiPlayer = function (color) {
    return this.ui.getAiPlayer(color);
};

UiGtpEngine.prototype.refreshDisplay = function () {
    this.ui.refreshBoard();
};

UiGtpEngine.prototype._letAiPlay = function () {
    return this.ui.letAiPlay();
};
