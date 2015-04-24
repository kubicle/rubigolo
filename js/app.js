'use strict';

var main = require('./main');
main.debug = true;
require('./StoneConstants');
require('./rb');

require('./test/TestAi');
require('./test/TestGameLogic');
require('./test/TestGroup');
require('./test/TestStone');

main.tests.run();
