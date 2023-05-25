require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const { testHandlerMethod } = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;

assert.callback(
    "getHandler listFolders",
    (testFinished) => {
        testHandlerMethod(
            { handlerMethod: "listFiles", handlerMethodArgs: ["/"] },
            (handlerResponse, loadedDSUResponse) => {
                assert.arraysMatch(handlerResponse, loadedDSUResponse);
                testFinished();
            }
        );
    },
    10000
);
