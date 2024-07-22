function SeedSSIMapping(storageStrategy, saveMapping = false) {
    const utils = require("../../utils/utils");
    const openDSU = require("opendsu");
    let mapping;

    const addMapping = async (pathSSI) => {
        if (typeof pathSSI === "string") {
            pathSSI = storageStrategy.parseKeySSI(pathSSI);
        }
        const identifier = pathSSI.getIdentifier();
        if (mapping[identifier]) {
            return;
        }
        mapping[identifier] = {};
        let keySSIMapping;
        try {
            keySSIMapping = await $$.promisify(utils.getKeySSIMapping)(pathSSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to load keySSI mapping for pathSSI <${pathSSI}>`, e);
        }
        for (let key in keySSIMapping[openDSU.constants.KEY_SSIS.PATH_SSI]) {
            if (!mapping[key]) {
                mapping[key] = {};
            }
            mapping[key][openDSU.constants.KEY_SSIS.PATH_SSI] = keySSIMapping[openDSU.constants.KEY_SSIS.PATH_SSI][key];
            mapping[key][openDSU.constants.KEY_SSIS.SEED_SSI] = keySSIMapping[openDSU.constants.KEY_SSIS.SEED_SSI][key];
            mapping[key][openDSU.constants.KEY_SSIS.SREAD_SSI] = keySSIMapping[openDSU.constants.KEY_SSIS.SREAD_SSI][key];
            mapping[key][openDSU.constants.KEY_SSIS.SZERO_ACCESS_SSI] = keySSIMapping[openDSU.constants.KEY_SSIS.SZERO_ACCESS_SSI][key];
        }
    }

    const ensureMappingIsLoaded = async () => {
        if (mapping) {
            return mapping;
        }

        let pathSSIs;
        try {
            pathSSIs = await $$.promisify(storageStrategy.getAllRecords)(openDSU.constants.KEY_SSIS.PATH_SSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to load path SSIs`, e);
        }
        mapping = {};
        if (!pathSSIs || !pathSSIs.length) {
            return {};
        }
        pathSSIs = pathSSIs.map(record => record.keySSI);
        for (let i = 0; i < pathSSIs.length; i++) {
            const pathSSI = pathSSIs[i];
            await addMapping(pathSSI);
        }
        return mapping;
    };

    this.storeKeySSI = (keySSI, callback) => {
        callback = $$.makeSaneCallback(callback);
        if (typeof keySSI === "string") {
            try {
                keySSI = storageStrategy.parseKeySSI(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
        if (saveMapping) {
            return utils.getKeySSIMapping(keySSI, async (err, keySSIMapping) => {
                if (err) {
                    return callback(err);
                }

                for (let keySSIType in keySSIMapping) {
                    for (let ssi in keySSIMapping[keySSIType]) {
                        let record;
                        try {
                            record = await $$.promisify(storageStrategy.getRecord)(keySSIType, ssi);
                        } catch (e) {
                            // ignore error
                        }

                        if (!record) {
                            try {
                                await $$.promisify(storageStrategy.insertRecord)(keySSIType, ssi, {keySSI: keySSIMapping[keySSIType][ssi]});
                            } catch (e) {
                                return callback(e);
                            }
                        }
                    }
                }
                callback();
            });
        }
        ensureMappingIsLoaded().then(async () => {
            let existingRecord;
            try {
                existingRecord = await $$.promisify(storageStrategy.getRecord)(openDSU.constants.KEY_SSIS.PATH_SSI, keySSI.getIdentifier());
            } catch (e) {
                // no record found
            }

            if (!existingRecord) {
                try {
                    await addMapping(keySSI.getIdentifier());
                    await $$.promisify(storageStrategy.insertRecord)(openDSU.constants.KEY_SSIS.PATH_SSI, keySSI.getIdentifier(), {keySSI: keySSI.getIdentifier()});
                    callback();
                } catch (e) {
                    callback(e);
                }
            } else {
                callback();
            }
        });
    }

    this.getReadKeySSI = (keySSI, callback) => {
        callback = $$.makeSaneCallback(callback);
        if (typeof keySSI === "string") {
            try {
                keySSI = storageStrategy.parseKeySSI(keySSI);
            } catch (e) {
                return callback(e);
            }
        }

        if (saveMapping) {
            return storageStrategy.getRecord(openDSU.constants.KEY_SSIS.SREAD_SSI, keySSI.getIdentifier(), (err, sReadSSIRecord) => {
                if (err) {
                    return callback(err);
                }
                if (!sReadSSIRecord) {
                    return callback(Error(`No read key SSI found for keySSI <${keySSI.getIdentifier()}>`));
                }

                callback(undefined, sReadSSIRecord.keySSI);
            })
        }

        ensureMappingIsLoaded().then(() => {
            if (!mapping[keySSI.getIdentifier()]) {
                return callback(Error(`No read key SSI found for keySSI <${keySSI.getIdentifier()}>`));
            }

            callback(undefined, mapping[keySSI.getIdentifier()][openDSU.constants.KEY_SSIS.SREAD_SSI]);
        }).catch(callback);
    }

    this.getWriteKeySSI = (keySSI, callback) => {
        callback = $$.makeSaneCallback(callback);
        if (typeof keySSI === "string") {
            try {
                keySSI = storageStrategy.parseKeySSI(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
        if (saveMapping) {
            return storageStrategy.getRecord(openDSU.constants.KEY_SSIS.SEED_SSI, keySSI.getIdentifier(), (err, sWriteSSIRecord) => {
                if (err) {
                    return callback(err);
                }
                if (!sWriteSSIRecord) {
                    return callback(Error(`No write key SSI found for keySSI <${keySSI.getIdentifier()}>`));
                }

                callback(undefined, sWriteSSIRecord.keySSI);
            });
        }
        ensureMappingIsLoaded().then(() => {
            if (!mapping[keySSI.getIdentifier()]) {
                return callback(Error(`No write key SSI found for keySSI <${keySSI.getIdentifier()}>`));
            }

            callback(undefined, mapping[keySSI.getIdentifier()][openDSU.constants.KEY_SSIS.SEED_SSI]);
        }).catch(callback);
    }
}

const getSeedSSIMapping = (storageStrategy, saveMapping) => {
    return new SeedSSIMapping(storageStrategy, saveMapping );
}

module.exports = {
    getSeedSSIMapping
};