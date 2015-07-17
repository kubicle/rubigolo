'use strict';

var main = require('./main');
window.main = main;

// Constants attached to main and extensions of common classes
require('./StoneConstants');
require('./rb');

// Include tests in main build
require('./test/TestAll');

main.debug = false;

var Ui = require('./Ui');
var TestUi = require('./TestUi');

var ui = window.unitTest ? new TestUi() : new Ui();
ui.createUi();
