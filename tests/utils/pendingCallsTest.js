require("../../../../builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;


assert.callback('Testing the pending call behavior, delay initialization', async () => {

    function TestingCache() {

        const init = () => {
            setTimeout(() => {
                this.finishInitialisation();
            }, 3000)
        }
        this.get = () => {

        };

        this.put = (key, value, callback) => {
            console.log(key, value);
            callback();
        };

        bindAutoPendingFunctions(this);
        init();
    }

    const dict = new TestingCache()
    for (let i = 0; i < 5; i++) {
        await $$.promisify(dict.put)(i, "some" + i);
    }

}, 5000);
