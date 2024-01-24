function SeedSSIMapping(storageStrategy) {
    const utils = require("../../utils/utils");
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    this.storeKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
        utils.getDerivedKeySSIs(keySSI, async (err, derivedKeySSIs) => {
            if (err) {
                return callback(err);
            }

            for (let keySSIType in derivedKeySSIs) {
                let record;
                try {
                    record = await $$.promisify(storageStrategy.getRecord)(keySSIType, keySSI.getIdentifier());
                } catch (e) {
                    //error means that the record does not exist
                }
                if (!record) {
                    try {
                        await $$.promisify(storageStrategy.insertRecord)(keySSIType, keySSI.getIdentifier(), {keySSI: derivedKeySSIs[keySSIType]});
                    } catch (e) {
                        return callback(e);
                    }
                }
            }
        });
    }

    this.getReadKeySSI = (keySSI, callback) => {
        storageStrategy.getRecord(openDSU.constants.KEY_SSIS.SEED_SSI, keySSI.getIdentifier(), (err, sReadSSIRecord) => {
            if (err) {
                return callback(err);
            }
            if (!sReadSSIRecord) {
                return callback(Error(`No read key SSI found for keySSI <${keySSI.getIdentifier()}>`));
            }

            callback(undefined, sReadSSIRecord.keySSI);
        })
    }

    this.getWriteKeySSI = (keySSI, callback) => {
        storageStrategy.getRecord(openDSU.constants.KEY_SSIS.SEED_SSI, keySSI.getIdentifier(), (err, sWriteSSIRecord) => {
            if (err) {
                return callback(err);
            }
            if (!sWriteSSIRecord) {
                return callback(Error(`No write key SSI found for keySSI <${keySSI.getIdentifier()}>`));
            }

            callback(undefined, sWriteSSIRecord.keySSI);
        });
    }
}

let seedSSIMapping;
const getSeedSSIMapping = (storageStrategy) => {
    if (!seedSSIMapping) {
        seedSSIMapping = new SeedSSIMapping(storageStrategy);
    }
    return seedSSIMapping;
}

module.exports = {
    getSeedSSIMapping
};