require('../../../../builds/output/testsRuntime');
const dc = require('double-check');
const assert = dc.assert;

const httpSpace = require('../../http');
const tir = require("../../../../psknode/tests/util/tir");

assert.callback('doPut test', (endTest) => {
        const dlDomain = 'default';
        dc.createTestFolder('testFolder', async (err, folder) => {
            if (err) {
                assert.true(false, 'Error creating test folder');
                throw err;
            }
            const vaultDomainConfig = {
                "anchoring": {
                    "type": "FS",
                    "option": {}
                }
            }
            const {port} = await tir.launchConfigurableApiHubTestNodeAsync({
                domains: [{name: "vault", config: vaultDomainConfig}],
                rootFolder: folder
            });

            const randomString = require("crypto").randomBytes(32).toString('hex');
            const response = await httpSpace.fetch(`http://localhost:${port}/bricking/${dlDomain}/get-brick/${randomString}`);
            const data = await response.json();
            assert.true(data.message, 'Brick not found');
            endTest();
        });
    },
    20000
);
