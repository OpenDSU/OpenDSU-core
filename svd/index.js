const FastSVD = require("fast-svd").FastSVD

class FsSVDStorage {
    constructor(directory) {
        this.persistence = FastSVD.createFSPersistence(directory);
        this.factory = new FastSVD.createFactory(this.persistence);
    }

    registerType(typeName, typeDescription) {
        this.factory.registerType(typeName, typeDescription);
    }

    createTransaction(callback) {
        let t = new FastSVD.createTransaction(this.factory);
        t.begin(callback);
    }
}

const createFsSVDStorage = (directory) => {
    return new FsSVDStorage(directory);
}
module.exports = {
    createFsSVDStorage
}