//Translated from test_all.rb using babyruby2js
'use strict';

var main = require('../main');
window.main = main;

main.testAll = true;

require('../StoneConstants');
require('../rb');

var TestAi = require('./TestAi');
var TestBoardAnalyser = require('./TestBoardAnalyser');
var TestBreeder = require('./TestBreeder');
var TestGameLogic = require('./TestGameLogic');
var TestGroup = require('./TestGroup');
var TestPotentialTerritory = require('./TestPotentialTerritory');
var TestScoreAnalyser = require('./TestScoreAnalyser');
var TestSgfReader = require('./TestSgfReader');
var TestSpeed = require('./TestSpeed');
var TestStone = require('./TestStone');
var TestZoneFiller = require('./TestZoneFiller');
