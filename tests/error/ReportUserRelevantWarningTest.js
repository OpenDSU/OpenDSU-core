require('../../../../builds/output/testsRuntime');

const assert = require('double-check').assert;
const errorSpace = require('../../error');

assert.callback('Verify error messages test', (callback) => {
  errorSpace.observeUserRelevantMessages('warn', () => {
    callback();
  });

  errorSpace.reportUserRelevantWarning('reportUserRelevantWarning message');
});
