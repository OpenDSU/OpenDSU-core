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
        const keySSIIdentifier = keySSI.getIdentifier();
        utils.getKeySSIMapping(keySSI, async (err, keySSIMapping) => {
            if (err) {
                return callback(err);
            }

            for (let keySSIType in keySSIMapping) {
                for(let ssi in keySSIMapping[keySSIType]){
                    try {
                        await $$.promisify(storageStrategy.insertRecord)(keySSIType, ssi, {keySSI: keySSIMapping[keySSIType][ssi]});
                    } catch (e) {
                        return callback(e);
                    }
                }
            }
            callback();
        });
    }

    this.getReadKeySSI = (keySSI, callback) => {
        if(typeof keySSI === "string"){
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
        storageStrategy.getRecord(openDSU.constants.KEY_SSIS.SREAD_SSI, keySSI.getIdentifier(), (err, sReadSSIRecord) => {
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
        if(typeof keySSI === "string"){
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
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

const getSeedSSIMapping = (storageStrategy) => {
    return new SeedSSIMapping(storageStrategy);
}

module.exports = {
    getSeedSSIMapping
};