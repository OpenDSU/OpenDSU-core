require("../../../../../builds/output/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../../resolver");
const {createTestFolderWithDSU, isHashLinkSSI} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;

assert.callback(
    "getHandler writeFile",
    (testFinished) => {
        createTestFolderWithDSU("dsu-writeFile", (keySSI) => {
            resolver.getDSUHandler(keySSI).writeFile("dummy", "dummy-content", (error, result) => {
                if (error) {
                    throw error;
                }

                assert.true(isHashLinkSSI(result), "expected result to be a HashLinkSSI");

                testFinished();
            });
        });
    },
    10000
);
