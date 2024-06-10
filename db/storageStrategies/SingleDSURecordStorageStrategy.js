function SingleDSURecordStorageStrategy(storageDSU) {
    this.storeRecord = (recordPath, newRecord, oldRecord, callback) => {
        if (!storageDSU.batchInProgress()) {
            storageDSU.safeBeginBatch(async err => {
                if (err) {
                    return callback(err);
                }
                try {
                    await $$.promisify(storageDSU.writeFile)(recordPath, JSON.stringify(newRecord));
                } catch (err) {
                    return callback(err);
                }

                storageDSU.commitBatch(callback);
            });
            return;
        }
        storageDSU.writeFile(recordPath, JSON.stringify(newRecord), callback);
    }

    this.getRecord = (recordPath, callback) => {
        storageDSU.readFile(recordPath, function (err, res) {
            let record;
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to read record in ${recordPath}`, err);
            } else {
                try {
                    record = JSON.parse(res);
                } catch (newErr) {
                    retErr = createOpenDSUErrorWrapper(`Failed to parse record in ${recordPath}: ${res}`, retErr);
                    //let's try to check if the res contains the record twice... at some point there was a bug on this topic
                    let serializedRecord = res;
                    if (ArrayBuffer.isView(serializedRecord) || serializedRecord.buffer) {
                        serializedRecord = new TextDecoder().decode(serializedRecord);
                    }
                    let halfOfRes = serializedRecord.slice(0, serializedRecord.length / 2);
                    let isDuplicated = (serializedRecord === halfOfRes + halfOfRes);
                    if (isDuplicated) {
                        try {
                            record = JSON.parse(halfOfRes);
                            console.log("We caught an error during record retrieval process and fix it. (duplicate content)");
                            //we ignore the original error because we were able to fix it.
                            retErr = undefined;
                        } catch (err) {
                            console.log("We caught an error during record retrieval process and we failed to fix it!");
                        }
                    } else {
                        console.log(retErr);
                    }
                }
            }
            callback(retErr, record);
        });
    }
}

module.exports = SingleDSURecordStorageStrategy;