const { launchApiHubTestNode } = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const { assert } = dc;
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const logger = $$.getLogger("VersionlessDSUTestUtils", "apihub/versionlessDSU");

const DOMAIN = "default";

const opendsu = require("opendsu");
const keySSIApi = opendsu.loadAPI("keyssi");
const resolver = opendsu.loadApi("resolver");

async function assertBlockFailure(fn) {
    let isFailed = true;
    try {
        const result = fn();
        if (result && result instanceof Promise) {
            await result;
        }
        isFailed = false;
    } catch (error) {
        logger.error("Received error as expected", error);
    }

    if (!isFailed) {
        assert.true(false);
    }
}

let folderNonce = 1;
let versionlessDSUNonce = 1;

class TwoDSUTester {
    constructor(standardDSU, versionlessDSU, testFolder, templateSeedSSI, port, encrypted, useStandardDSUForInnerDSU) {
        this.standardDSU = standardDSU;
        this.versionlessDSU = versionlessDSU;
        this.testFolder = testFolder;
        this.templateSeedSSI = templateSeedSSI;
        this.apiHubUrl = `http://localhost:${port}`;
        this.encrypted = encrypted;
        this.useStandardDSUForInnerDSU = useStandardDSUForInnerDSU;
    }

    async callMethod(methodName, params) {
        const callParams = params ? params : [];
        let isStandardRequestFailed = false;
        let isVersionlessRequestFailed = false;
        let standardDSUResult;
        let versionlessDSUResult;

        try {
            standardDSUResult = await $$.promisify(this.standardDSU[methodName].bind(this.standardDSU))(...callParams);
            logger.info(`standardDSU.${methodName} - ${JSON.stringify(params || [])}`, JSON.stringify(standardDSUResult));
        } catch (error) {
            logger.info(`standardDSU.${methodName} - ${JSON.stringify(params || [])} FAILED`);
            isStandardRequestFailed = true;
        }

        try {
            versionlessDSUResult = await $$.promisify(this.versionlessDSU[methodName].bind(this.versionlessDSU))(...callParams);
            logger.info(
                `versionlessDSUResult.${methodName} - ${JSON.stringify(params || [])}`,
                JSON.stringify(versionlessDSUResult)
            );
        } catch (error) {
            logger.info(`versionlessDSUResult.${methodName} - ${JSON.stringify(params || [])} FAILED`);
            isVersionlessRequestFailed = true;
        }

        if (isStandardRequestFailed && isVersionlessRequestFailed) {
            return ["FAILED", "FAILED"];
        }
        if (isStandardRequestFailed || isVersionlessRequestFailed) {
            logger.info(
                `isStandardRequestFailed: ${isStandardRequestFailed}, isVersionlessRequestFailed: ${isVersionlessRequestFailed} `
            );
            assert.true(false, "One request failed!");

            return [
                isStandardRequestFailed ? "FAILED" : standardDSUResult,
                isVersionlessRequestFailed ? "FAILED" : versionlessDSUResult,
            ];
        }

        return [standardDSUResult, versionlessDSUResult];
    }

    async callStandardDSUMethod(methodName, params) {
        const callParams = params ? params : [];
        let isStandardRequestFailed = false;
        let standardDSUResult;

        try {
            standardDSUResult = await $$.promisify(this.standardDSU[methodName].bind(this.standardDSU))(...callParams);
            logger.info(`standardDSUResult.${methodName} - ${JSON.stringify(params || [])}`, JSON.stringify(standardDSUResult));
        } catch (error) {
            logger.info(`standardDSUResult.${methodName} - ${JSON.stringify(params || [])} FAILED`);
            isStandardRequestFailed = true;
        }

        if (isStandardRequestFailed) {
            logger.info(`isStandardRequestFailed: ${isStandardRequestFailed} `);
            assert.true(false, "StandardDSU request failed!");
        }
        return standardDSUResult;
    }

    async callVersionlessDSUMethod(methodName, params) {
        const callParams = params ? params : [];
        let isVersionlessRequestFailed = false;
        let versionlessDSUResult;

        try {
            versionlessDSUResult = await $$.promisify(this.versionlessDSU[methodName].bind(this.versionlessDSU))(...callParams);
            logger.info(
                `versionlessDSUResult.${methodName} - ${JSON.stringify(params || [])}`,
                JSON.stringify(versionlessDSUResult)
            );
        } catch (error) {
            logger.info(`versionlessDSUResult.${methodName} - ${JSON.stringify(params || [])} FAILED`);
            isVersionlessRequestFailed = true;
        }

        if (isVersionlessRequestFailed) {
            logger.info(`isVersionlessRequestFailed: ${isVersionlessRequestFailed} `);
            assert.true(false, "VersionlessDSU request failed!");
        }
        return versionlessDSUResult;
    }

    callSyncMethod(methodName, params) {
        const callParams = params ? params : [];
        let isStandardRequestFailed = false;
        let isVersionlessRequestFailed = false;
        let standardDSUResult;
        let versionlessDSUResult;

        try {
            standardDSUResult = this.standardDSU[methodName].apply(this.standardDSU, callParams);
            logger.info(`standardDSU.${methodName} - ${JSON.stringify(callParams)}`, JSON.stringify(standardDSUResult));
        } catch (error) {
            logger.info(`standardDSU.${methodName} - ${JSON.stringify(callParams)} FAILED`);
            isStandardRequestFailed = true;
        }

        try {
            versionlessDSUResult = this.versionlessDSU[methodName].apply(this.versionlessDSU, callParams);
            logger.info(
                `versionlessDSUResult.${methodName} - ${JSON.stringify(callParams)}`,
                JSON.stringify(versionlessDSUResult)
            );
        } catch (error) {
            logger.info(`versionlessDSUResult.${methodName} - ${JSON.stringify(callParams)} FAILED`);
            isVersionlessRequestFailed = true;
        }

        if (isStandardRequestFailed && isVersionlessRequestFailed) {
            return ["FAILED", "FAILED"];
        }
        if (isStandardRequestFailed || isVersionlessRequestFailed) {
            logger.info(
                `isStandardRequestFailed: ${isStandardRequestFailed}, isVersionlessRequestFailed: ${isVersionlessRequestFailed} `
            );
            assert.true(false, "One request failed!");

            return [
                isStandardRequestFailed ? "FAILED" : standardDSUResult,
                isVersionlessRequestFailed ? "FAILED" : versionlessDSUResult,
            ];
        }

        return [standardDSUResult, versionlessDSUResult];
    }

    compareMethodResults(methodName, standardDSUResult, versionlessDSUResult) {
        if (methodName === "stat") {
            // versionless DSU has posix information added
            assert.objectHasFields(versionlessDSUResult, standardDSUResult);
            return;
        }

        if (Array.isArray(standardDSUResult) || Array.isArray(versionlessDSUResult)) {
            assert.arraysMatch(standardDSUResult, versionlessDSUResult);
        } else if ($$.Buffer.isBuffer(standardDSUResult) && $$.Buffer.isBuffer(versionlessDSUResult)) {
            assert.true(standardDSUResult.equals(versionlessDSUResult), "Buffers don't match");
        } else if (typeof standardDSUResult === "object" && typeof versionlessDSUResult === "object") {
            assert.equal(JSON.stringify(standardDSUResult), JSON.stringify(versionlessDSUResult), "Objects don't match");
        } else {
            assert.equal(standardDSUResult, versionlessDSUResult);
        }
        logger.info("Results match");
    }

    async callMethodWithResultComparison(methodName, params) {
        const callMethodResults = await this.callMethod(methodName, params);
        const [standardDSUResult, versionlessDSUResult] = callMethodResults;
        this.compareMethodResults(methodName, standardDSUResult, versionlessDSUResult);
        return callMethodResults;
    }

    callSyncMethodWithResultComparison(methodName, params) {
        const callMethodResults = this.callSyncMethod(methodName, params);
        const [standardDSUResult, versionlessDSUResult] = callMethodResults;
        this.compareMethodResults(methodName, standardDSUResult, versionlessDSUResult);
        return callMethodResults;
    }

    async createInnerDSU() {
        if (this.useStandardDSUForInnerDSU) {
            const standardDSU = await $$.promisify(resolver.createDSU)(this.templateSeedSSI);
            logger.info("Created standardDSU");
            return standardDSU;
        }
        const versionlessDSU = await createVersionlessDSU();
        logger.info("Created versionlessDSU");
        return versionlessDSU;
    }

    async refreshDSU(dsu) {
        await $$.promisify(dsu.refresh)();
        // refresh doesn't work as expected so we need to load the DSU again manually, without caching
        const dsuKeySSI = await $$.promisify(dsu.getKeySSIAsString)();
        dsu = await $$.promisify(resolver.loadDSU)(dsuKeySSI, { skipCache: true });
        return dsu;
    }

    async refreshStandardDSU() {
        await $$.promisify(this.standardDSU.refresh)();
        // refresh doesn't work as expected so we need to load the DSU again manually, without caching
        const standardDSUKeySSI = await $$.promisify(this.standardDSU.getKeySSIAsString)();
        this.standardDSU = await $$.promisify(resolver.loadDSU)(standardDSUKeySSI, { skipCache: true });
    }

    async refreshVersionlessDSU() {
        await $$.promisify(this.versionlessDSU.refresh)();
        // refresh doesn't work as expected so we need to load the DSU again manually, without caching
        const versionlessDSUKeySSI = await $$.promisify(this.versionlessDSU.getKeySSIAsString)();
        this.versionlessDSU = await $$.promisify(resolver.loadDSU)(versionlessDSUKeySSI, { skipCache: true });
    }

    async getVersionlessDSUContent() {
        const keySSIObject = await $$.promisify(this.versionlessDSU.getKeySSIAsObject)();
        const filePath = keySSIObject.getFilePath();

        const openDSU = require("opendsu");
        const { SmartUrl } = openDSU.loadAPI("utils");
        let smartUrl = new SmartUrl(this.apiHubUrl);
        let path = "/versionlessdsu";
        if(filePath.startsWith("/")){
            path = path.concat(filePath);
        } else {
            path = path.concat("/").concat(filePath);
        }
        smartUrl = smartUrl.concatWith(path);

        return smartUrl.fetch().then((response) => response.text());
    }

    async writeFileAsync(relativePath, fileContentSize) {
        if (!fileContentSize) {
            fileContentSize = 1024;
        }
        const fileContent = crypto.randomBytes(fileContentSize);
        const filePath = path.join(this.testFolder, relativePath);
        logger.info(`Generating file at ${filePath}`);
        ensureDirectoryExistence(filePath);
        await $$.promisify(fs.writeFile.bind(fs))(filePath, fileContent);
        return filePath;
    }
}

function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

async function createVersionlessDSU(encrypt) {
    const path = `/path-${encrypt ? "encrypted" : "non-encrypted"}-${versionlessDSUNonce++}`;
    let encryptionKey;
    if (encrypt) {
        const crypto = require("opendsu").loadApi("crypto");
        const encryptionKeyBytes = crypto.generateRandom(32);
        // specific string must have 32 characters required for versionlessDSU encrypt
        encryptionKey = crypto.encodeBase58(encryptionKeyBytes).substring(0, 32);
    }
    console.log("createVersionlessDSU", path, encryptionKey);
    const versionlessDSU = await $$.promisify(resolver.createVersionlessDSU)(path, encryptionKey);
    return versionlessDSU;
}

async function getDSUTesters(useStandardDSUForInnerDSUConfig) {
    if (!useStandardDSUForInnerDSUConfig) {
        useStandardDSUForInnerDSUConfig = [true, false];
    }
    const testFolder = await $$.promisify(dc.createTestFolder)(`versionlesstest-${folderNonce++}`);
    const port = await $$.promisify(launchApiHubTestNode)(10, testFolder);

    const dsuTesters = [];
    for (const encrypted of [false, true]) {
        for (const useStandardDSUForInnerDSU of useStandardDSUForInnerDSUConfig) {
            const templateSeedSSI = keySSIApi.createTemplateSeedSSI(DOMAIN);
            const standardDSU = await $$.promisify(resolver.createDSU)(templateSeedSSI);
            logger.info("Created standardDSU");
            const versionlessDSU = await createVersionlessDSU(encrypted);
            logger.info("Created versionlessDSU");

            const dsuTester = new TwoDSUTester(
                standardDSU,
                versionlessDSU,
                testFolder,
                templateSeedSSI,
                port,
                encrypted,
                useStandardDSUForInnerDSU
            );
            dsuTesters.push(dsuTester);
        }
    }

    return dsuTesters;
}

function getNonEncryptedAndEncryptedDSUTester(runTest) {
    return (testFinished) => {
        (async () => {
            const dsuTesters = await getDSUTesters();
            for (const dsuTester of dsuTesters) {
                try {
                    logger.info(
                        `Using DSU Tester encrypted = ${dsuTester.encrypted} and inner mounted DSU ${
                            dsuTester.useStandardDSUForInnerDSU ? "standard" : "versionless"
                        }`
                    );
                    await runTest(dsuTester);
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            }

            testFinished();
        })();
    };
}

module.exports = {
    assertBlockFailure,
    getNonEncryptedAndEncryptedDSUTester,
    getDSUTesters,
};
