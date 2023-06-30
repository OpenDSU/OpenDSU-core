/**
 * a constructor that implements the {@link VersionlessStorageStrategy} interface and stores data multiple {@link VersionlessDSU}.
 * When a new record is inserted a new {@link VersionlessDSU} is created and the data is stored in it.
 * When a record is updated, the data is stored in the same {@link VersionlessDSU} as the previous version of the record.
 * The paths of all the {@link VersionlessDSU}s are stored in a {@link VersionlessDSU} called RootVersionlessDSU that is created using the {@link createVersionlessDSU} method of the {@link resolver} module.
 * A versionless DSU is created using the {@link createVersionlessDSU} method of the {@link resolver} module.
 * The path of the VersionlessDSU is databaseName/tableName/pk
 */
const Query = require("./Query");
const operators = require("./operators");
const {getCompareFunctionForObjects} = require("./utils");

function VersionlessStorageStrategy() {
    const self = this;
    let rootDSU;
    let dbName;
    const DATA_PATH = "data";

    const openDSU = require("opendsu");
    const resolver = openDSU.loadAPI("resolver");
    const ObservableMixin = openDSU.loadAPI("utils").ObservableMixin;

    ObservableMixin(this);

    this.initialise = function (_rootDSU, _dbName) {
        rootDSU = _rootDSU;
        dbName = _dbName;
        this.dispatchEvent("initialised");
    }


    this.beginBatch = () => {

    }

    this.safeBeginBatch = (callback) => {
    }

    this.safeBeginBatchAsync = async () => {
    }

    this.cancelBatch = (callback) => {
    }

    this.cancelBatchAsync = async () => {
    }

    this.commitBatch = (callback) => {
    }

    this.commitBatchAsync = async () => {
    }

    this.batchInProgress = () => {
    }

    function getPrimaryKeys(tableName, callback) {
        rootDSU.listFiles(getRecordsPath(tableName), (err, data) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get primary keys for table ${tableName}`, err));
            }
            callback(undefined, data);
        });
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

    // Get the whole content of the table
    this.getAllRecords = (tableName, callback) => {
        readTheWholeTable(tableName, (err, tbl) => {
            if (err) {
                return callback(err);
            }

            return callback(undefined, Object.values(tbl));
        })
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

            const {getCompareFunctionForObjects} = require("./utils");
            filteredRecords.sort(getCompareFunctionForObjects(sort, conditionsArray[0].split(" ")[0]))
            callback(undefined, filteredRecords.slice(0, limit));
        });
    };

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

        filterTable(tableName, conditionsArray, sort, limit, callback);
    }

    this.addIndex = function (tableName, fieldName, forceReindex, callback) {
        callback();
    }

    this.getIndexedFields = function (tableName, callback) {
        callback(undefined, []);
    };

    /*
      Insert a record
    */
    this.insertRecord = function (tableName, key, record, callback) {
        this.updateRecord(tableName, key, undefined, record, callback);
    };

    const getVersionlessDSUPath = (tableName, key) => {
        return dbName + "/" + tableName + "/" + key;
    }

    const getRecordsPath = (tableName) => {
        return dbName + "/" + tableName + "/" + "records";
    }

    const getVersionlessDSUPathInRootDSU = (tableName, key) => {
        return getRecordsPath(tableName) + "/" + key;
    }
    /*
        Update a record
     */
    this.updateRecord = function (tableName, key, oldRecord, newRecord, callback) {
        let versionlessDSUPath = getVersionlessDSUPath(tableName, key);
        resolver.createVersionlessDSU(versionlessDSUPath, (err, versionlessDSU) => {
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

                    [err, res] = await $$.call(rootDSU.writeFile, getVersionlessDSUPathInRootDSU(tableName, key), versionlessSSI);

                    if(err) {
                        return callback(err);
                    }
                }

                callback(undefined, newRecord);
            });
        });
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function (tableName, key, callback) {
        let versionlessDSUPath = getVersionlessDSUPath(tableName, key);
        rootDSU.readFile(getVersionlessDSUPathInRootDSU(tableName, key), async (err, versionlessDSUSSI) => {
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
            [err, record] = await $$.call(versionlessDSU.readFile, DATA_PATH);
            if(err) {
                return callback(err);
            }

            callback(undefined, JSON.parse(record));
        });
    };

    const READ_WRITE_KEY_TABLE = "KeyValueTable";
    this.writeKey = function (key, value, callback) {

    };

    this.readKey = function (key, callback) {

    }
}

module.exports.VersionlessStorageStrategy = VersionlessStorageStrategy;