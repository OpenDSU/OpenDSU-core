const registry = require("../apisRegistry");

/*
* based on jsonIndications Object {attributeName1: "DSU_file_path", attributeName2: "DSU_file_path"}
* the this of the mapping will be populated with the data extracted from the DSU
* */
registry.defineApi("loadJSONS", async function (dsu, jsonIndications) {
    for (let prop in jsonIndications) {
        try {
            let data;
            data = await dsu.readFile(jsonIndications[prop]);
            this[prop] = JSON.parse(data);
        } catch (e) {
            console.log("Failed to load JSON due to ", e.message);
        }
    }
});

/*
* based on jsonIndications Object {attributeName1: "DSU_file_path", attributeName2: "DSU_file_path"}
* the data from the this of the mapping will be saved into the DSU
* */
registry.defineApi("saveJSONS", async function (dsu, jsonIndications) {
    for (let prop in jsonIndications) {
        let data = JSON.stringify(this[prop]);
        await dsu.writeFile(jsonIndications[prop], data);
    }
});

function promisifyDSUAPIs(dsu) {
    //this API method list will be promisify on the fly with the help of the registerDSU method and a Proxy over DSU instance
    const promisifyAPIs = [
        "addFile",
        "addFiles",
        "addFolder",
        "appendToFile",
        "batch",
        "beginBatch",
        "cancelBatch",
        "cloneFolder",
        "createFolder",
        "delete",
        "dsuLog",
        "extractFile",
        "extractFolder",
        "getKeySSI",
        "getKeySSIAsObject",
        "getKeySSIAsString",
        "getSSIForMount",
        "init",
        "listFiles",
        "listFolders",
        "listMountedDossiers",
        "load",
        "mount",
        "readDir",
        "readFile",
        "rename",
        "stat",
        "unmount",
        "writeFile",
        "listMountedDSUs",
        "refresh"
    ];

    const promisifyHandler = {
        get: function (target, prop) {
            if (promisifyAPIs.indexOf(prop) !== -1) {
                return $$.promisify(target[prop]);
            }
            return target[prop];
        }
    };

    //we create a proxy over the normal DSU / Archive instance
    //in order to promisify on the fly the public API to be easier to work with in the mapping functions
    return new Proxy(dsu, promisifyHandler);
}

//all DSUs that are created with different exposed APIs need to be registered
// in order to control the batch operations and promisify the API on them
async function registerDSU(mappingInstance, dsu) {
    if (typeof dsu === "undefined" || typeof dsu.beginBatch !== "function") {
        throw Error("registerDSU needs a DSU instance");
    }
    if (typeof mappingInstance.registeredDSUs === "undefined") {
        mappingInstance.registeredDSUs = [];
    }

    if (dsu.batchInProgress()) {
        $$.debug.logDSUEvent(dsu, `Already in batch mode in active mapping execution`);
        return promisifyDSUAPIs(dsu);
    }
    let batchId;
    const keySSI = await dsu.getKeySSIAsObjectAsync();
    const openDSU = require("opendsu");
    const SSITypes = openDSU.constants.KEY_SSI_FAMILIES;
    const resolver = openDSU.loadAPI("resolver");
    if (keySSI.getFamilyName() === SSITypes.CONST_SSI_FAMILY) {
        $$.debug.logDSUEvent(dsu, `Const DSU in active mapping execution`);
        const dsuExists = await $$.promisify(resolver.dsuExists)(keySSI);
        if (dsuExists) {
            $$.debug.logDSUEvent(dsu, `Const DSU already exists in active mapping execution`);
            return promisifyDSUAPIs(dsu);
        }
        batchId = await dsu.startOrAttachBatchAsync();
        dsu.secretBatchId = batchId;
        mappingInstance.registeredDSUs.push(dsu);
        return promisifyDSUAPIs(dsu);
    }
    batchId = await dsu.startOrAttachBatchAsync();
    dsu.secretBatchId = batchId;
    mappingInstance.registeredDSUs.push(dsu);
    return promisifyDSUAPIs(dsu);
}

registry.defineApi("testIfDSUExists", async function (keySSI, callback) {
    const keySSISpace = require("opendsu").loadApi("keyssi");
    const anchoringX = require("opendsu").loadApi("anchoring").getAnchoringX();
    if (typeof keySSI !== "object") {
        keySSI = keySSISpace.parse(keySSI);
    }
    let anchorId = await $$.promisify(keySSI.getAnchorId)();
    let alreadyExists = false;
    let error;
    try {
        let versions = await $$.promisify(anchoringX.getAllVersions)(anchorId);
        if (versions && versions.length > 0) {
            alreadyExists = true;
        }
    } catch (err) {
        error = err;
    }
    return callback(error, alreadyExists);
});

registry.defineApi("loadConstSSIDSU", async function (constSSI, options) {

    let dsu = await $$.weakDSUCache.get(constSSI);
    const resolver = await this.getResolver();
    if (!dsu) {
        let exists = await $$.promisify(this.testIfDSUExists)(constSSI);
        try {
            dsu = await resolver.loadDSU(constSSI);
        } catch (e) {
            if (exists) {
                throw createOpenDSUErrorWrapper("Failed to load Const DSU that exists", e);
            }
        }
    }

    if (dsu) {
        //take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
        return {dsu: await registerDSU(this, dsu), alreadyExists: true};
    }

    dsu = await resolver.createDSUForExistingSSI(constSSI, options);

    //take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
    return {dsu: await registerDSU(this, dsu), alreadyExists: false};
});

registry.defineApi("loadArraySSIDSU", async function (domain, arr) {
    const opendsu = require("opendsu");
    const resolver = await this.getResolver();
    const keySSISpace = opendsu.loadApi("keyssi");

    const keySSI = keySSISpace.createArraySSI(domain, arr);

    let dsu = await $$.weakDSUCache.get(keySSI);
    let exists = await $$.promisify(this.testIfDSUExists)(keySSI);

    if (dsu) {
        return {dsu: await registerDSU(this, dsu), alreadyExists: exists};
    }

    try {
        dsu = await resolver.loadDSU(keySSI);
    } catch (e) {
        if (exists) {
            throw createOpenDSUErrorWrapper("Failed to load ConstDSU that exists", e);
        }
    }

    if (dsu) {
        //take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
        return {dsu: await registerDSU(this, dsu), alreadyExists: true};
    }

    dsu = await resolver.createArrayDSU(domain, arr);
    //take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
    return {dsu: await registerDSU(this, dsu), alreadyExists: false};
});

registry.defineApi("createDSU", async function (domain, ssiType, options) {
    const template = require("opendsu").loadApi("keyssi").createTemplateKeySSI(ssiType, domain);
    let resolver = await this.getResolver();
    if (!options) {
        options = {};
    }
    options.addLog = false;
    let dsu = await resolver.createDSU(template, options);
    //take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
    return await registerDSU(this, dsu);
});

registry.defineApi("createPathSSI", async function (domain, path) {
    const scAPI = require("opendsu").loadAPI("sc");
    let enclave;
    try {
        enclave = await $$.promisify(scAPI.getSharedEnclave)();
    } catch (e) {
        enclave = await $$.promisify(scAPI.getMainEnclave)();
    }
    const pathKeySSI = await $$.promisify(enclave.createPathKeySSI)(domain, path);
    const seedSSI = await $$.promisify(pathKeySSI.derive)();

    return seedSSI;
});

registry.defineApi("createPathSSIDSU", async function (domain, path, options) {
    const seedSSI = await this.createPathSSI(domain, path, options);

    let resolver = await this.getResolver();
    if (await $$.promisify(this.testIfDSUExists)(seedSSI)) {
        throw createOpenDSUErrorWrapper("PathSSIDSU already exists");
    }
    if (!options) {
        options = {};
    }
    options.addLog = false;
    let dsu = await resolver.createDSUForExistingSSI(seedSSI, options);
    //take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
    return await registerDSU(this, dsu);
});

registry.defineApi("loadDSU", async function (keySSI, options) {
    let dsu = await $$.weakDSUCache.get(keySSI);
    if (!dsu) {
        let resolver = await this.getResolver();
        dsu = await resolver.loadDSU(keySSI, options);
        if (!dsu) {
            throw new Error("No DSU found for " + keySSI);
        }
    }

    //take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
    return await registerDSU(this, dsu);
});


//an api that returns an OpenDSU Resolver instance that has promisified methods
// to be used in mappings easier
registry.defineApi("getResolver", function () {
    return new Promise((resolve) => {

        const resolverInherited = ["createDSUx",
            "createSeedDSU",
            "createArrayDSU",
            "createDSUForExistingSSI"];

        const promisify = ["createDSU", "loadDSU"];

        const scApi = require("opendsu").loadApi("sc");
        scApi.getSharedEnclave((err, sharedEnclave) => {
            const defaultResolver = require("opendsu").loadApi("resolver");
            let resolver = defaultResolver;
            if (err) {
                console.log("SharedEnclave not available. Fallback to standard resolver.");
            } else {
                resolver = sharedEnclave;
            }

            const instance = {};
            instance.__proto__ = resolver;

            for (let i = 0; i < promisify.length; i++) {
                let methodName = promisify[i];
                if (methodName === "loadDSU") {
                    instance[methodName] = async function (keySSI, ...args) {
                        let instance = await $$.weakDSUCache.get(keySSI);
                        if (instance) {
                            return instance;
                        }
                        return await $$.promisify(resolver[methodName])(keySSI, ...args);
                    }
                } else {
                    instance[methodName] = $$.promisify(resolver[methodName]);
                }
            }

            for (let i = 0; i < resolverInherited.length; i++) {
                let methodName = resolverInherited[i];
                instance[methodName] = $$.promisify(defaultResolver[methodName]);
            }


            resolve(instance);
        });
    });

});


registry.defineApi("recoverDSU", function (ssi, recoveryFnc, callback) {
    if (!this.storageService.loadDSURecoveryMode) {
        return callback(new Error("Not able to run recovery mode due to misconfiguration of mapping engine."));
    }

    this.storageService.loadDSURecoveryMode(ssi, async (dsu, callback) => {
        //because in the recoveryFnc the content get "recovered" we need to control the batch for those operations
        let batchId = await dsu.startOrAttachBatchAsync();
        recoveryFnc(dsu, async (err, dsu) => {
            if (err) {
                return callback(err);
            }
            dsu.commitBatch(batchId, (err) => {
                if (err) {
                    return callback(err);
                }
                return callback(err, dsu);
            });
        });
    }, async (err, dsu) => {
        if (err) {
            return callback(err);
        }

        let registeredDSU = await registerDSU(this, dsu);
        setTimeout(() => {
            callback(undefined, registeredDSU);
        }, 3000);

    });
});

