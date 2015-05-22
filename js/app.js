'use strict';

var main = require('./main');
window.main = main;

require('./StoneConstants');
require('./rb');

main.GameLogic = require('./GameLogic');
main.Grid = require('./Grid');
main.Ai1Player = require('./ai/Ai1Player');
main.ScoreAnalyser = require('./ScoreAnalyser');

//main.Ui = require('./Ui');

main.debug = false;
