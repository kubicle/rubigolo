'use strict';

require('../app');

var main = require('../main');
var Logger = require('../Logger');


function run() {
    // First see if this is a coverage or regular CI test run
    main.isCoverTest = process.argv[2] === '--cover' || parseInt(process.env.CoverageTest) === 1;
    if (main.isCoverTest) console.info('Running coverage tests...');
    else console.info('Running tests...');

    main.log.level = Logger.INFO;
    var logfn = function (/*lvl, msg*/) { return true; }; // all goes to console

    var failCount = main.tests.run(logfn);
    if (failCount === 0) {
        console.info('Tests completed OK.');
        process.exit(0);
    }

    console.error('Tests failed: ' + failCount + ' issue(s)');
    process.exit(1); // code != 0 means error here
}

run();
