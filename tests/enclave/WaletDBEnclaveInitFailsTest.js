require("../../../../builds/output/testsRuntime");
$$.debug.verbosity("info")
const tir = require("../../../../psknode/tests/util/tir");
$$.debug.useStdoutOnceForErrorWithCode(0x401);
const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const keySSISpace = openDSU.loadAPI("keyssi");

assert.callback('WalletDBEnclave init fail test', async (testFinished) => {
    const DOMAIN = "default";
    const rootFolder = await $$.promisify(dc.createTestFolder)("createDSU");
    await tir.launchConfigurableApiHubTestNodeAsync({rootFolder});
    const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(DOMAIN);
    console.log(seedSSI.getIdentifier());
    const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave(seedSSI);
    walletDBEnclave.on("error", (err) => {
        assert.true(err !== undefined);
        testFinished();
    })
}, 500000);

