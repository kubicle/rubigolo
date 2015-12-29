'use strict';

require('../app');

var main = require('../main');
var Logger = require('../Logger');

function parseArgs() {
    var args = process.argv;
    for (var n = 2; n < args.length; n++) {
        switch (args[n]) {
        case '--cover': main.isCoverTest = true; break;
        case '--ci': main.isCiTest = true; break;
        default: main.log.error('Invalid option: ' + args[n]);
        }
    }
}

function run() {
    parseArgs();

    if (main.isCoverTest) main.log.info('Running coverage tests...');
    else main.log.info('Running tests...');

    main.log.level = Logger.INFO;

    var failCount = main.tests.run();
    if (failCount === 0) {
        main.log.info('Tests completed OK.');
        process.exit(0);
    }

    main.log.error('Tests failed: ' + failCount + ' issue(s)');
    process.exit(1); // code != 0 means error here
}

run();
