require('../../../../builds/output/testsRuntime');

const assert = require('double-check').assert;
const errorSpace = require('../../error');

assert.callback('Verify error messages test', (callback) => {
  errorSpace.observeUserRelevantMessages('dev', (err) => {
    assert.true(err.message === 'reportDevRelevantInfo message');
    callback();
  });
  errorSpace.reportDevRelevantInfo('reportDevRelevantInfo message');
});
