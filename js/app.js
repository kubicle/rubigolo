'use strict';

// First we define "main" on which global things attach
var main = require('./main');

// Get App name and version
var pkg = require('../package.json');
main.appName = pkg.name;
main.appVersion = pkg.version;

// Constants attached to main and extensions of common classes
require('./constants');
require('./rb');

// Require scripts we want in main build
require('./test/TestAll'); // one day this will only be in the testing build

// Known AIs and default one
main.ais = {
    Frankie: require('./ai/frankie'),
    Droopy: require('./ai/droopy')
};
main.defaultAi = main.latestAi = main.ais.Droopy;

if (typeof window !== 'undefined') {
    // In a browser: create the UI
    require('./ui/style.less');
    var Ui = require('./ui/Ui');
    var TestUi = require('./ui/TestUi');
    var ui = main.ui = window.testApp ? new TestUi() : new Ui();
    ui.createUi();

    window.main = main; // just for helping console debugging
}

