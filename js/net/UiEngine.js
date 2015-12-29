'use strict';

//var main = require('../main');
var GtpEngine = require('./GtpEngine');
var inherits = require('util').inherits;


/** @class
 * GTP Engine interface for UI (extends GtpEngine)
 */
function UiEngine(ui) {
    GtpEngine.call(this, ui.game, ui.scorer);
    this.ui = ui;
}
inherits(UiEngine, GtpEngine);
module.exports = UiEngine;


UiEngine.prototype.quit = function () {
    this.ui.message('GTP quit command received');
};

UiEngine.prototype.send = function (msg) {
    console.log(msg); // stdout is default
};

UiEngine.prototype.getAiPlayer = function (color) {
    return this.ui.getAiPlayer(color);
};

UiEngine.prototype.refreshDisplay = function () {
    this.ui.refreshBoard();
};

UiEngine.prototype._letAiPlay = function () {
    return this.ui.letAiPlay();
};
