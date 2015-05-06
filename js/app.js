'use strict';

var main = require('./main');
main.debug = true;
require('./StoneConstants');
require('./rb');

require('./test/TestAll');

main.GameLogic = require('./GameLogic');
main.Grid = require('./Grid');
main.Ai1Player = require('./Ai1Player');
window.main = main;
