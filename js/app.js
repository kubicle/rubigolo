'use strict';

var main = require('./main');
main.debug = true;
require('./StoneConstants');
require('./rb');

require('./test/TestAll');

window.main = main;
