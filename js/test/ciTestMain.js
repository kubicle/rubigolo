'use strict';

var main = require('../main');
var Logger = require('../Logger');


function run() {
    var param1 = process.argv[2];
    if (param1 == '--cover') main.isCoverTest = true;

    main.log.level = Logger.WARN;
    var logfn = function (/*lvl, msg*/) { return true; }; // all goes to console

    var failCount = main.tests.run(logfn);
    if (failCount === 0) {
        process.exit(0);
    }

    console.error('Unit tests failed: ' + failCount + ' issue(s)');
    process.exit(1); // code != 0 means error here
}
module.exports = run;
