'use strict';

var main = require('./main');
require('./StoneConstants');
require('./rb');
require('./test/TestStone');
require('./test/TestGroup');

main.tests.run();
