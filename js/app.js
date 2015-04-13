'use strict';

var main = require('./main');
require('./StoneConstants');
require('./rb');
require('./test/TestStone');
require('./test/TestGroup');
require('./test/TestGameLogic');

main.tests.run();
