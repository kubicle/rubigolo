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
require('./test/TestAll');

// Known AIs and default one
main.ais = {
    Frankie: require('./ai/frankie'),
    Droopy: require('./ai/droopy')
};
main.defaultAi = main.latestAi = main.ais.Droopy;

if (typeof window === 'undefined') {
    var logfn = function (/*lvl, msg*/) { return true; };
    
    var failCount = main.tests.run(logfn);
    if (failCount === 0) process.exit(0);
    console.error('Unit tests failed: ' + failCount + ' issue(s)');
    process.exit(1); // code != 0 means error here
}

// Create the UI
require('./ui/style.less');
var Ui = require('./ui/Ui');
var TestUi = require('./ui/TestUi');
var ui = main.ui = window.testApp ? new TestUi() : new Ui();
ui.createUi();

window.main = main; // just for helping console debugging
