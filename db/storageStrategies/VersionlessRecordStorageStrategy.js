function VersionlessRecordStorageStrategy(rootDSU) {
    const openDSU = require("opendsu");
    const resolver = openDSU.loadAPI("resolver");

    this.storeRecord = (recordPath, newRecord, oldRecord, callback) => {
        let base64Path = $$.Buffer.from(recordPath).toString("base64url");
        resolver.createVersionlessDSU(base64Path, (err, versionlessDSU) => {
            if (err) {
                return callback(err);
            }
            const filename = recordPath.split("/").pop();
            versionlessDSU.writeFile(filename, JSON.stringify(newRecord), async (err) => {
                if (err) {
                    return callback(err);
                }

                if (!oldRecord) {
                    let versionlessSSI;
                    [err, versionlessSSI] = await $$.call(versionlessDSU.getKeySSIAsString);
                    if (err) {
                        return callback(err);
                    }

                    [err, res] = await $$.call(rootDSU.writeFile, recordPath, versionlessSSI);

                    if (err) {
                        return callback(err);
                    }
                }

                callback(undefined, newRecord);
            });
        });
    }

    this.getRecord = (recordPath, callback) => {
        const base64Path = $$.Buffer.from(recordPath).toString("base64url");
        rootDSU.readFile(base64Path, async (err, versionlessDSUSSI) => {
            if (err) {
                try{
                    versionlessDSUSSI = await $$.promisify(rootDSU.readFile)(recordPath);
                } catch (e) {
                    return callback(e);
                }
            }

            versionlessDSUSSI = versionlessDSUSSI.toString();
            let versionlessDSU;
            [err, versionlessDSU] = await $$.call(resolver.loadDSU, versionlessDSUSSI);
            if (err) {
                return callback(err);
            }

            const filename = recordPath.split("/").pop();
            let record;
            [err, record] = await $$.call(versionlessDSU.readFile, filename);
            if (err) {
                return callback(err);
            }

            callback(undefined, JSON.parse(record));
        });
    }
}

module.exports = VersionlessRecordStorageStrategy;