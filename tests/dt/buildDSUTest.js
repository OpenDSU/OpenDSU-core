require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const dt = openDSU.loadAPI("dt");
const resolver = openDSU.loadAPI("resolver");

assert.callback('Build DSU test', (testFinished) => {

    dc.createTestFolder('buildDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        const getCommands = function (data) {
            if (!data)
                return [];
            return data.split(/\r?\n/).filter(cmd => !!cmd.trim());
        };

        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: "vault", config: vaultDomainConfig}],
            rootFolder: folder
        });
        process.env.BUILD_SECRET = "secret";
        process.env.SSO_SECRETS_ENCRYPTION_KEY = "+WG9HhIoXGGSVq6cMlhy2P3vuiqz1O/WAaiF5JhXmnc="
        await $$.promisify(dt.initialiseBuildWallet)();
        const dossierBuilder = dt.getDossierBuilder();
        const path = require("path");
        const fs = require("fs");
        fs.mkdirSync("code", {recursive: true});
        fs.writeFileSync(path.join("code", "file"), "some data");
        const commandData = "delete /\naddfolder code\n";
        const bundlesPath = "./../../../../builds/output";
        const config = {
            "seed": path.join(folder, "seed"),
            "domain": "vault",
            "bundles": bundlesPath
        }
        let commands = getCommands(commandData);
        let data = await $$.promisify(dossierBuilder.buildDossier)(config, commands);
        let dsu = await $$.promisify(resolver.loadDSU)(data);
        let fileData = await $$.promisify(dsu.readFile)("/file");
        assert.true(fileData.toString() === "some data");

        commands = getCommands(commandData);
        data = await $$.promisify(dossierBuilder.buildDossier)(config, commands);
        dsu = await $$.promisify(resolver.loadDSU)(data);
        fileData = await $$.promisify(dsu.readFile)("/file");
        assert.true(fileData.toString() === "some data");

        fs.rmSync("code", {recursive: true});
        testFinished();
    });
}, 500000);

