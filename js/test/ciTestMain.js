'use strict';

var log = require('../log');
var main = require('../main');

var TestSeries = require('./TestSeries');
var addAllTests = require('./TestAll');

var ais = [
    { name: 'Droopy',  constr: require('../ai/droopy') },
    { name: 'Chuckie', constr: require('../ai/chuckie') }
];


function parseArgs() {
    var args = process.argv;
    for (var n = 2; n < args.length; n++) {
        switch (args[n]) {
        case '--cover': main.isCoverTest = true; break;
        case '--ci': main.isCiTest = true; break;
        default: log.error('Invalid option: ' + args[n]);
        }
    }
}

function run() {
    log.setLevel(log.INFO);

    parseArgs();
    main.initTests(TestSeries, addAllTests);
    main.initAis(ais);

    if (main.isCoverTest) log.info('Running coverage tests...');
    else log.info('Running tests...');

    var failCount = main.tests.run();
    if (failCount === 0) {
        log.info('Tests completed OK.');
        process.exit(0);
    }

    log.error('Tests failed: ' + failCount + ' issue(s)');
    process.exit(1); // code != 0 means error here
}

run();
