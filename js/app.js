'use strict';

var main = require('./main');
require('./StoneConstants');
require('./rb');

require('./test/TestAi');
require('./test/TestGameLogic');
require('./test/TestGroup');
require('./test/TestStone');

main.tests.run();
