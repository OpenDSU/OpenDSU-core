require("../../../../../builds/output/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const { testHandlerMethod } = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
assert.callback(
    "getHandler readDir",
    (testFinished) => {
        testHandlerMethod(
            {
                handlerMethod: "readDir",
                handlerMethodArgs: ["/"],
            },
            (handlerResponse, loadedDSUResponse) => {
                assert.arraysMatch([handlerResponse], [loadedDSUResponse]);
                testFinished();
            }
        );
    },
    10000
);
