function LightDBStorageStrategy(lightDBEnclave) {
    this.insertRecord = (table, pk, record, callback) => {
        lightDBEnclave.insertRecord($$.SYSTEM_IDENTIFIER, table, pk, record, callback);
    }

    this.updateRecord = (table, pk, plainRecord, encryptedRecord, callback) => {
        lightDBEnclave.updateRecord($$.SYSTEM_IDENTIFIER, table, pk, plainRecord, encryptedRecord, callback);
    }

    this.getRecord = (table, pk, callback) => {
        lightDBEnclave.getRecord($$.SYSTEM_IDENTIFIER, table, pk, callback);
    }

    this.getAllRecords = (table, callback) => {
        lightDBEnclave.getAllRecords($$.SYSTEM_IDENTIFIER, table, callback);
    }

    this.parseKeySSI = (identifier, options) => {
        return lightDBEnclave.parseKeySSI(identifier, options);
    }
}

module.exports = LightDBStorageStrategy;