'use strict';

var main = require('./main');
window.main = main;

require('./StoneConstants');
require('./rb');

main.GameLogic = require('./GameLogic');
main.Grid = require('./Grid');
main.Ai1Player = require('./ai/Ai1Player');
main.ScoreAnalyser = require('./ScoreAnalyser');

var Ui = require('./Ui');
var TestUi = require('./TestUi');

// Include tests in main build
require('./test/TestAll');

main.debug = false;

var ui = window.unitTest ? new TestUi() : new Ui();
ui.createUi();
