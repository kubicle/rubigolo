'use strict';

require('./ui/style.less');

var main = require('./main');
window.main = main;

// Constants attached to main and extensions of common classes
require('./constants');
require('./rb');

// Include tests in main build
require('./test/TestAll');

main.debug = false;

var Ui = require('./ui/Ui');
var TestUi = require('./ui/TestUi');

var ui = window.unitTest ? new TestUi() : new Ui();
ui.createUi();
