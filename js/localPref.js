'use strict';

var log = require('./log');

var entryName = 'localPref';


function LocalPref() {
    this.saveTimeout = null;
    this.map = {};
    this._saveHandler = this._saveNow.bind(this);
    try {
        var json = window.localStorage.getItem(entryName);
        if (json) this.map = JSON.parse(json);
    } catch (err) {
        log.logError('Cannot load local preferences: ' + err);
    }
}

LocalPref.prototype.terminate = function () {
    if (this.saveTimeout) this._saveNow();
};

LocalPref.prototype._saveLater = function () {
    if (this.saveTimeout) return;
    this.saveTimeout = window.setTimeout(this._saveHandler, 60000);
};

LocalPref.prototype._saveNow = function () {
    window.clearTimeout(this.saveTimeout);
    this.saveTimeout = null;
    try {
        window.localStorage.setItem(entryName, JSON.stringify(this.map));
    } catch (err) {
        log.logError('Cannot save local preferences: ' + err);
    }
};

LocalPref.prototype.getValue = function (key, defValue) {
    var value = this.map[key];
    return value !== undefined ? value : defValue;
};

LocalPref.prototype.setValue = function (key, value) {
    this.map[key] = value;
    this._saveLater();
};

module.exports = new LocalPref();
