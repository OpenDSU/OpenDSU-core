const FastSVD = require("fast-svd").FastSVD

class FsSVDStorage {
    constructor(directory) {
        this.persistence = FastSVD.createFSPersistence(directory);
        this.factory = new FastSVD.createFactory(this.persistence);
    }
    registerType(typeName, typeDescription) {
        this.factory.registerType(typeName, typeDescription);
    }
    createSession() {
        return new FastSVD.createSession(this.factory);
    }
}

const createFsSVDStorage = (directory) => {
    return new FsSVDStorage(directory);
}
module.exports = {
    createFsSVDStorage
}