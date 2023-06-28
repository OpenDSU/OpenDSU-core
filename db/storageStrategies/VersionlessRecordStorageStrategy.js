function VersionlessRecordStorageStrategy(rootDSU) {
    const DATA_PATH = "data";
    const openDSU = require("opendsu");
    const resolver = openDSU.loadAPI("resolver");


    this.storeRecord = (recordPath, newRecord, oldRecord, callback) => {
        resolver.createVersionlessDSU(recordPath, (err, versionlessDSU) => {
            if (err) {
                return callback(err);
            }
            versionlessDSU.writeFile(DATA_PATH, JSON.stringify(newRecord), async (err) => {
                if (err) {
                    return callback(err);
                }

                if(!oldRecord){
                    let versionlessSSI;
                    [err, versionlessSSI] = await $$.call(versionlessDSU.getKeySSIAsString);
                    if(err) {
                        return callback(err);
                    }

                    [err, res] = await $$.call(rootDSU.writeFile, DATA_PATH, versionlessSSI);

                    if(err) {
                        return callback(err);
                    }
                }

                callback(undefined, newRecord);
            });
        });
    }

    this.getRecord = (recordPath, callback) => {
        rootDSU.readFile(recordPath, async (err, versionlessDSUSSI) => {
            if (err) {
                return callback(err);
            }

            versionlessDSUSSI = versionlessDSUSSI.toString();
            let versionlessDSU;
            [err, versionlessDSU] = await $$.call(resolver.loadDSU, versionlessDSUSSI);
            if(err) {
                return callback(err);
            }

            let record;
            [err, record] = await $$.call(versionlessDSU.readFile, `${recordPath}/${DATA_PATH}`);
            if(err) {
                return callback(err);
            }

            callback(undefined, JSON.parse(record));
        });
    }
}

module.exports = VersionlessRecordStorageStrategy;