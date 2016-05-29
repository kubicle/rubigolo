'use strict';

var log = require('./log');
var main = require('./main');

var PREF_NAME = main.appName;
var DEFAULT_SAVE_DELAY = 180; //in seconds
var ALL_USERS_KEY = 'all'; //prefix for global "all users" keys


/** @class */
function UserPreferences() {
    this.autosave = null;
    this.nextSaveTime = 0;
    this.accountName = null;
    this.prefs = {};
    this._load();
}

/** Call "close" if your app is terminating now. This will make sure latest data changes are saved. */
UserPreferences.prototype.close = function () {
    this.setAccount(null);
};

/** Sets the "scope" of stored values with the current account name
 *  @param {string|null} accountName - the account name or null to "exit" previous account scope */
UserPreferences.prototype.setAccount = function (accountName) {
    if (this.autosave) {
        this._save();
    }
    this.accountName = accountName;
};

/** @private */
UserPreferences.prototype._load = function () {
    try {
        var content = window.localStorage.getItem(PREF_NAME);
        if (content) {
            this.prefs = JSON.parse(content);
        }
    } catch (err) {
        if (log.warn) log.warn('Failed to load user preferences: ' + err);
    }
};

/** Schedules the next autosave
 *  @private
 *  @param {int} [saveAfter] - maximum delay before next autosave (in second); NB: could be saved earlier */
UserPreferences.prototype._scheduleNextSave = function (saveAfter) {
    var self = this;
    if (!saveAfter) {
        //NB: we refuse "0" as delay, sign of someone ignoring the API doc
        saveAfter = DEFAULT_SAVE_DELAY;
    }
    var nextSaveTime = Date.now() + saveAfter * 1000;

    //if already scheduled and for a time coming before the current request, we are fine just doing nothing
    if (this.autosave && this.nextSaveTime <= nextSaveTime) {
        return;
    }

    //we need to schedule (or reschedule) the next save
    if (this.autosave) {
        window.clearTimeout(this.autosave);
    }
    this.nextSaveTime = nextSaveTime;
    this.autosave = window.setTimeout(function () {
        self.autosave = null;
        self._save();
    }, saveAfter * 1000);
};

/** Saves all modified values right now.
 *  @private */
UserPreferences.prototype._save = function () {
    try {
        if (this.autosave) {
            //cancel the current scheduling since we have been called "by force"
            window.clearTimeout(this.autosave);
            this.autosave = null;
        }
        window.localStorage.setItem(PREF_NAME, JSON.stringify(this.prefs));
    } catch (err) {
        if (log.warn) log.warn('Failed to save user preferences: ' + err);
    }
};

/** Gets a value from user preferences
 *  @param {string} key - key name
 *  @param {any} defValue - value to be returned as default if no previous value was set
 *  @param {boolean} [global] - pass true to read a global (all accounts) value; false is default
 *  @return {any} the value (any type) */
UserPreferences.prototype.getValue = function (key, defValue, global) {
    key = (this.accountName && !global ? this.accountName : ALL_USERS_KEY) + '#' + key;
    var value = this.prefs[key];
    if (value === undefined) {
        return defValue;
    }
    return value;
};

/** Sets a value into user preferences
 *  @param {string} key - key name
 *  @param {any} value - value to be set, any type
 *  @param {int} [saveAfter] - maximum delay before next autosave (in second); NB: could be saved earlier */
UserPreferences.prototype.setValue = function (key, value, saveAfter) {
    key = (this.accountName ? this.accountName : ALL_USERS_KEY) + '#' + key;
    this.prefs[key] = value;

    this._scheduleNextSave(saveAfter);
};

var prefs = new UserPreferences();
module.exports = prefs;
