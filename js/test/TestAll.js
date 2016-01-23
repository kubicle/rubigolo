'use strict';

function addAllTests(testSeries) {
    testSeries.add(require('./TestAi'));
    testSeries.add(require('./TestBoardAnalyser'));
    testSeries.add(require('./TestBreeder'));
    testSeries.add(require('./TestGameLogic'));
    testSeries.add(require('./TestGoban'));
    testSeries.add(require('./TestGrid'));
    testSeries.add(require('./TestGroup'));
    testSeries.add(require('./TestPotentialTerritory'));
    testSeries.add(require('./TestScoreAnalyser'));
    testSeries.add(require('./TestSgfReader'));
    testSeries.add(require('./TestSpeed'));
    testSeries.add(require('./TestStone'));
    testSeries.add(require('./TestZoneFiller'));
}
module.exports = addAllTests;
