const ObservableMixin = require("../../utils/ObservableMixin");

function SingleDSUStorageStrategy() {
    let volatileMemory = {}
    let self = this
    let storageDSU;
    let shareableSSI;
    let dbName;

    ObservableMixin(this);

    this.initialise = function (_storageDSU, _dbName) {
        storageDSU = _storageDSU;
        dbName = _dbName;
        this.dispatchEvent("initialised");
    }

    this.refresh = (callback) => {
        storageDSU.refresh(callback);
    }

    this.beginBatch = () => {
        if (!storageDSU.batchInProgress()) {
            storageDSU.beginBatch();
        }
    }

    this.safeBeginBatch = (callback) => {
        storageDSU.safeBeginBatch(callback);
    }

    this.safeBeginBatchAsync = async () => {
        return await storageDSU.safeBeginBatchAsync();
    }

    this.cancelBatch = (callback) => {
        storageDSU.cancelBatch(callback);
    }

    this.cancelBatchAsync = async () => {
        return await storageDSU.cancelBatchAsync();
    }

    this.commitBatch = (callback) => {
        storageDSU.commitBatch(callback);
    }

    this.commitBatchAsync = async () => {
        return await storageDSU.commitBatchAsync();
    }

    this.getAllRecords = (tableName, callback) => {
        readTheWholeTable(tableName, (err, tbl) => {
            if (err) {
                return callback(err);
            }

            return callback(undefined, Object.values(tbl));
        })
    }

    function readTheWholeTable(tableName, callback) {
        getPrimaryKeys(tableName, (err, recordKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read the records in table ${tableName}`, err));
            }
            const table = {};
            if (recordKeys.length === 0) {
                return callback(undefined, table);
            }

            const TaskCounter = require("swarmutils").TaskCounter;
            const tc = new TaskCounter(() => {
                return callback(undefined, table);
            });
            tc.increment(recordKeys.length);
            recordKeys.forEach(recordKey => {
                self.getRecord(tableName, recordKey, (err, record) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get record ${recordKey} in table ${tableName}`, err));
                    }

                    table[recordKey] = record;
                    tc.decrement();
                });
            })
        });
    }


    /*
       Get the whole content of the table and asynchronously returns an array with all the  records satisfying the condition tested by the filterFunction
    */
    const filterTable = function (tableName, conditionsArray, sort, limit, callback) {
        readTheWholeTable(tableName, (err, tbl) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read table ${tableName}`, err));
            }

            const operators = require("./operators");
            const filteredRecords = [];
            const records = Object.values(tbl);
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                if (record.__deleted) {
                    continue;
                }
                let recordIsValid = true;
                for (let i = 0; i < conditionsArray.length; i++) {
                    const condition = conditionsArray[i];
                    const [field, operator, value] = condition.split(" ");
                    if (!operators[operator](record[field], value)) {
                        recordIsValid = false;
                        break;
                    }
                }

                if (recordIsValid) {
                    filteredRecords.push(record);
                }
            }
            // Object.values(tbl).forEach(record => {
            //     let recordIsValid = true;
            //     for (let i = 0; i < conditionsArray.length; i++) {
            //         const condition = conditionsArray[i];
            //         const [field, operator, value] = condition.split(" ");
            //         if (!operators[operator](record[field], value) || record.__deleted) {
            //             recordIsValid = false;
            //             break;
            //         }
            //     }
            //
            //     if (recordIsValid) {
            //         filteredRecords.push(record);
            //     }
            // })
            const {getCompareFunctionForObjects} = require("./utils");
            filteredRecords.sort(getCompareFunctionForObjects(sort, conditionsArray[0].split(" ")[0]))
            callback(undefined, filteredRecords.slice(0, limit));
        });
    };

    function checkFieldIsIndexed(tableName, fieldName, callback) {
        const path = getIndexPath(tableName, fieldName);
        storageDSU.stat(path, (err, stat) => {
            if (err || typeof stat.type === "undefined") {
                return callback(undefined, false);
            }
            callback(undefined, true);
        });
    }

    this.filter = function (tableName, conditionsArray, sort, limit, callback) {
        if (typeof conditionsArray === "function") {
            callback = conditionsArray;
            conditionsArray = undefined;
            sort = undefined;
            limit = undefined;
        }

        if (typeof conditionsArray === "undefined") {
            conditionsArray = "__timestamp > 0";
        }

        if (typeof conditionsArray === "string") {
            conditionsArray = [conditionsArray];
        } else if (!Array.isArray(conditionsArray)) {
            return callback(Error(`Condition argument of filter function need to be string or array of strings`));
        }
        let Query = require("./Query");
        let query = new Query(conditionsArray);

        if (typeof sort === "function") {
            callback = sort;
            sort = undefined;
            limit = undefined;
        }

        if (typeof limit === "function") {
            callback = limit;
            limit = undefined;
        }

        if (typeof limit === "undefined") {
            limit = Infinity;
        }

        if (typeof sort === "undefined") {
            sort = "asc";
        }

        const indexName = query.getIndexName();

        checkFieldIsIndexed(tableName, indexName, (err, status) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to add index for fields ${indexName} in table ${tableName}`, err));
            }

            const __filterIndexedTable = () => {
                storageDSU.listFiles(getIndexPath(tableName, indexName), (err, values) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed read values for field ${indexName}`, err));
                    }

                    const pks = [];
                    const uniqueIndexedValues = [];
                    values.forEach(value => {
                        const splitValue = value.split("/");
                        if (pks.indexOf(splitValue[1]) === -1) {
                            pks.push(splitValue[1]);
                            uniqueIndexedValues.push(splitValue[0]);
                        } else {
                            console.warn(`Record with pk ${splitValue[1]} already indexed on field ${indexName}`);
                        }
                    })

                    let filteredValues = query.filterValuesForIndex(uniqueIndexedValues);
                    query.sortValues(filteredValues, sort);
                    const getNextRecordForValue = getNextRecordFunction(tableName, indexName)
                    query.filter(filteredValues, getNextRecordForValue, limit, callback);
                });
            }


            if (status) {
                return __filterIndexedTable();
            }

            console.log(`Warning - You tried filtering the table <${tableName}> on field <${conditionsArray[0].split(' ')[0]}> which is not indexed. This operation can be slow. Try calling addIndex on field <${conditionsArray[0].split(' ')[0]}> first.`);
            filterTable(tableName, conditionsArray, sort, limit, callback);
        });
    }


    function getNextRecordFunction(tableName, fieldName) {
        let currentValue;
        let pksArray;
        let currentPosition;

        function getNext(callback) {
            if (currentPosition >= pksArray.length) {
                return callback(undefined, null);
            }

            self.getRecord(tableName, pksArray[currentPosition++], callback);
        }

        return function (value, callback) {
            if (value !== currentValue) {
                storageDSU.listFiles(getIndexPath(tableName, fieldName, value), (err, pks) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`No primary key found for value ${value}`, err));
                    }

                    pksArray = pks;
                    currentPosition = 0;
                    currentValue = value

                    getNext(callback);
                });
            } else {
                getNext(callback);
            }
        }

    }

    this.addIndex = function (tableName, fieldName, forceReindex, callback) {
        if (typeof forceReindex === "function") {
            callback = forceReindex;
            forceReindex = false;
        }

        if (typeof forceReindex === "undefined") {
            forceReindex = false;
        }

        if (forceReindex === false) {
            checkFieldIsIndexed(tableName, fieldName, (err, status) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to check if field ${fieldName} in table ${tableName} is indexed`, err));
                }

                if (status === true) {
                    return callback();
                }

                createIndex(tableName, fieldName, callback);
            });
        } else {
            createIndex(tableName, fieldName, callback);
        }
    }

    this.getIndexedFields = function (tableName, callback) {
        getIndexedFieldsList(tableName, callback);
    };

    function createIndex(tableName, fieldName, callback) {
        getPrimaryKeys(tableName, (err, primaryKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get primary keys for table ${tableName}`, err));
            }

            const TaskCounter = require("swarmutils").TaskCounter;
            let batchInProgress = false;
            if (storageDSU.batchInProgress()) {
                batchInProgress = true
            } else {
                storageDSU.beginBatch();
            }
            const taskCounter = new TaskCounter(() => {
                if (batchInProgress) {
                    return callback();
                }
                storageDSU.commitBatch(callback);
            })

            if (primaryKeys.length === 0) {
                return storageDSU.createFolder(getIndexPath(tableName, fieldName), (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to create empty index for field ${fieldName} in table ${tableName}`, err));
                    }

                    if (batchInProgress) {
                        return callback();
                    }
                    storageDSU.commitBatch(callback);
                });
            }

            taskCounter.increment(primaryKeys.length);
            primaryKeys.forEach(pk => {
                self.getRecord(tableName, pk, (err, record) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get record ${pk} from table ${tableName}`));
                    }

                    storageDSU.writeFile(getIndexPath(tableName, fieldName, record[fieldName], pk), undefined, (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
                        }

                        taskCounter.decrement();
                    });
                });
            })

        });
    }

    function createIndexForValue(tableName, fieldName, pk, value, callback) {
        const indexValuePath = getIndexPath(tableName, fieldName, value, pk);
        storageDSU.stat(indexValuePath, (err, stats) => {
            if (err) {
                return callback(err);
            }

            if (typeof stats.type === "undefined") {
                return storageDSU.writeFile(indexValuePath, (err) => {
                    let retErr = undefined;
                    if (err) {
                        retErr = createOpenDSUErrorWrapper(`Failed to create file ${indexValuePath}`, err);
                    }

                    callback(retErr)
                });
            }

            callback();
        });
    }

    function updateIndexesForRecord(tableName, pk, newRecord, callback) {
        if (newRecord.__deleted) {
            //deleted records don't need to be into indexes
            return callback();
        }
        const fields = Object.keys(newRecord);
        getIndexedFieldsList(tableName, (err, indexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexed fields list for table ${tableName}`, err));
            }

            if (indexedFields.length === 0) {
                return callback();
            }

            const TaskCounter = require("swarmutils").TaskCounter;
            const taskCounter = new TaskCounter(() => {
                return callback();
            })

            taskCounter.increment(fields.length);
            fields.forEach(field => {
                if (indexedFields.findIndex(indexedField => indexedField === field) !== -1) {
                    createIndexForValue(tableName, field, pk, newRecord[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update index for field ${field} in table ${tableName}`, err));
                        }

                        taskCounter.decrement();
                    });
                } else {
                    taskCounter.decrement();
                }
            })
        });
    }

    // pk and value can be undefined and you get only the path to index of fieldName
    function getIndexPath(tableName, fieldName, value, pk) {
        let path = `/${dbName}/${tableName}/indexes/${fieldName}`;
        if (typeof value !== "undefined") {
            path = `${path}/${value}`;
        }

        if (typeof pk !== "undefined") {
            path = `${path}/${pk}`;
        }
        return path;
    }

    function getRecordPath(tableName, pk) {
        return `/${dbName}/${tableName}/records/${pk}`;
    }

    function deleteValueForIndex(tableName, fieldName, pk, oldValue, newValue, callback) {
        if (oldValue === newValue) {
            return callback();
        }
        storageDSU.delete(getIndexPath(tableName, fieldName, oldValue, pk), callback);
    }

    function deleteIndexesForRecord(tableName, pk, oldRecord, newRecord, callback) {
        const fields = Object.keys(oldRecord);
        getIndexedFieldsList(tableName, (err, indexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexed fields list for table ${tableName}`, err));
            }

            if (indexedFields.length === 0) {
                return callback();
            }

            const TaskCounter = require("swarmutils").TaskCounter;
            const taskCounter = new TaskCounter(() => {
                return callback();
            })

            taskCounter.increment(fields.length);
            fields.forEach(field => {
                if (indexedFields.findIndex(indexedField => indexedField === field) !== -1) {
                    deleteValueForIndex(tableName, field, pk, oldRecord[field], newRecord[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to delete index for field ${field} in table ${tableName}`, err));
                        }

                        taskCounter.decrement();
                    });
                } else {
                    taskCounter.decrement();
                }
            })
        });
    }


    function getIndexedFieldsList(tableName, callback) {
        const indexesFilePath = `/${dbName}/${tableName}/indexes`;
        storageDSU.listFolders(indexesFilePath, (err, indexes) => {
            if (err) {
                return callback(undefined, []);
            }

            callback(undefined, indexes);
        });
    }

    /*
      Insert a record
    */
    this.insertRecord = function (tableName, key, record, callback) {
        this.updateRecord(tableName, key, undefined, record, callback);
    };

    function getPrimaryKeys(tableName, callback) {
        storageDSU.listFiles(`/${dbName}/${tableName}/records`, (err, primaryKeys) => {
            if (err) {
                return storageDSU.createFolder(`/${dbName}/${tableName}/records`, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to retrieve primary keys list in table ${tableName}`, err));
                    }
                    callback(undefined, []);
                });
            }

            callback(undefined, primaryKeys);
        });
    }

    /*
        Update a record
     */
    this.updateRecord = function (tableName, key, oldRecord, newRecord, callback) {
        if (typeof newRecord !== "object") {
            return callback(Error(`Invalid record type. Expected "object"`))
        }

        if (Buffer.isBuffer(newRecord)) {
            return callback(Error(`"Buffer" is not a valid record type. Expected "object".`))
        }

        if (Array.isArray(newRecord)) {
            return callback(Error(`"Array" is not a valid record type. Expected "object".`))
        }

        const recordPath = getRecordPath(tableName, key);
        storageDSU.writeFile(recordPath, JSON.stringify(newRecord), function (err, res) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to update record in ${recordPath}`, err));
            }

            if (typeof oldRecord !== "undefined") {
                return deleteIndexesForRecord(tableName, key, oldRecord, newRecord, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to delete index files for record ${JSON.stringify(newRecord)}`, err));
                    }

                    return updateIndexesForRecord(tableName, key, newRecord, (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update indexes for record ${newRecord}`, err));
                        }

                        callback(err, newRecord);
                    });
                });
            }

            updateIndexesForRecord(tableName, key, newRecord, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to update indexes for record ${newRecord}`, err));
                }

                callback(err, newRecord)
            });
        });
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function (tableName, key, callback) {
        const recordPath = getRecordPath(tableName, key);
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
    };

    const READ_WRITE_KEY_TABLE = "KeyValueTable";
    this.writeKey = function (key, value, callback) {
        let batchInProgress = false;
        if (storageDSU.batchInProgress()) {
            batchInProgress = true
        } else {
            storageDSU.beginBatch();
        }
        let valueObject = {
            type: typeof value,
            value: value
        };

        if (typeof value === "object") {
            if (Buffer.isBuffer(value)) {
                valueObject = {
                    type: "buffer",
                    value: value.toString()
                }
            } else {
                valueObject = {
                    type: "object",
                    value: JSON.stringify(value)
                }
            }
        }

        const recordPath = getRecordPath(READ_WRITE_KEY_TABLE, key);
        storageDSU.writeFile(recordPath, JSON.stringify(valueObject), err => {
            if (err) {
                return callback(err);
            }
            if (batchInProgress) {
                return callback(undefined);
            }
            storageDSU.commitBatch(callback);
        });
    };

    this.readKey = function (key, callback) {
        this.getRecord(READ_WRITE_KEY_TABLE, key, (err, record) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read key ${key}`, err));
            }

            let value;
            switch (record.type) {
                case "buffer":
                    value = Buffer.from(record.value);
                    break;
                case "object":
                    value = JSON.parse(record.value);
                    break;
                default:
                    value = record.value;
            }

            callback(undefined, value);
        });
    }
}

module.exports.SingleDSUStorageStrategy = SingleDSUStorageStrategy;