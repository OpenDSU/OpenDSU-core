require('../../../../builds/output/testsRuntime');
const testIntegration = require('../../../../psknode/tests/util/tir');
const dc = require('double-check');
const assert = dc.assert;

const httpSpace = require('../../http');

assert.callback(
  'doPut test',
  (endTest) => {
    const dlDomain = 'default';

    dc.createTestFolder('testFolder', (err, folder) => {
      if (err) {
        assert.true(false, 'Error creating test folder');
        throw err;
      }
      testIntegration.launchApiHubTestNode(10, folder, async (err, port) => {
        if (err) {
          assert.true(false);
          throw err;
        }

        try {
          const randomString = 'adasd21q4asfds342qreaasd';
          const response = await httpSpace.fetch(
            `http://localhost:${port}/bricking/${dlDomain}/get-brick/${randomString}`
          );

          assert.true(response, 'No response');
          assert.true(response.ok === false, 'Response error');

          endTest();
        } catch (error) {
          assert.true(false, 'Error during communication');
          endTest();
        }
      });
    });
  },
  20000
);
