'use strict';

require('./ui/style.less');

var main = require('./main');
window.main = main;

var pkg = require('../package.json');
main.appName = pkg.name;
main.appVersion = pkg.version;

// Constants attached to main and extensions of common classes
require('./constants');
require('./rb');

// Include tests in main build
require('./test/TestAll');

// AIs
main.ais = {
    Frankie: require('./ai/frankie'),
    Droopy: require('./ai/droopy')
};
main.defaultAi = main.latestAi = main.ais.Droopy;

main.debug = false;

var Ui = require('./ui/Ui');
var TestUi = require('./ui/TestUi');

var ui = main.ui = window.unitTest ? new TestUi() : new Ui();
ui.createUi();
