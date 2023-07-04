require("../../../../../builds/output/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../../resolver');
const keySSI = require("../../../keyssi")

$$.LEGACY_BEHAVIOUR_ENABLED = true;
assert.callback('Create DSU on already configured domain', (testfinished) => {

    dc.createTestFolder('createDSU', (err, folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            if (err) {
                throw err;
            }

            const keyssitemplate = keySSI.createTemplateKeySSI('seed', 'default', undefined, undefined, 'vn0', {hint: 'hint'});

            resolver.createDSU(keyssitemplate, (err, dsu) => {
                if (err) {
                    throw err;
                }

                dsu.getKeySSIAsString((err, key) => {
                    if (err) {
                        throw err;
                    }
                    loadDsuAndCheck(key, () => {
                        testfinished();
                    });
                })
            });
        })
    })

}, 5000);


function loadDsuAndCheck(dsuKeySSI, testFinishedCallback) {

    console.log('Created DSU keySSI : ', dsuKeySSI);
    let alteredKeySSI;
    dsuKeySSI = keySSI.parse(dsuKeySSI);
    alteredKeySSI = keySSI.createTemplateKeySSI(dsuKeySSI.getTypeName(), dsuKeySSI.getDLDomain(), dsuKeySSI.getSpecificString(), dsuKeySSI.getControlString(), dsuKeySSI.getVn(), {hint: "someHint"})

    console.log('Altered DSU keySSI : ', alteredKeySSI);
    resolver.loadDSU(alteredKeySSI, (err, dsu) => {
        if (err) {
            throw err;
        }

        assertFileWasWritten(dsu, '/file1.txt', 'Lorem 1', () => {
            assertFileWasWritten(dsu, '/file2.txt', 'Lorem 2', () => {
                assertFileWasAnchored(dsu, '/file1.txt', 'Lorem 1', () => {
                    assertFileWasAnchored(dsu, '/file2.txt', 'Lorem 2', () => {
                        testFinishedCallback();
                    })
                })
            })
        });
    });
}

function assertFileWasWritten(dsu, filename, data, callback) {
    dsu.writeFile(filename, data, (err, hash) => {
        assert.true(typeof err === 'undefined', 'DSU is writable');

        dsu.readFile(filename, (err, dt) => {
            assert.true(typeof err === 'undefined', 'DSU is readable');
            assert.true(dt.toString() === data, 'File was read correctly');

            callback();
        })
    })
}

function assertFileWasAnchored(dsu, path, expectedData, callback) {
    dsu.readFile(path, (err, data) => {
        assert.true(typeof err === 'undefined', 'DSU is readable');
        assert.true(data.toString() === expectedData, 'File was read correctly');

        callback();
    })

}

