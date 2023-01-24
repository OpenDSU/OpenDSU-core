const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");

const mergeMappings = (dest, source) => {
    for (let ssiType in source) {
        if (typeof dest[ssiType] === "undefined") {
            dest[ssiType] = source[ssiType];
        }else{
            dest[ssiType] = {...dest[ssiType], ...source[ssiType]};
        }
    }

    return dest;
}

const getKeySSIsMappingFromPathKeys = (pathKeyMap, callback) => {
    let keySSIMap = {};
    const paths = Object.keys(pathKeyMap);
    if (paths.length === 0) {
        return callback(undefined, keySSIMap);
    }
    const TaskCounter = require("swarmutils").TaskCounter;
    const taskCounter = new TaskCounter(()=>{
        return callback(undefined, keySSIMap);
    })
    taskCounter.increment(paths.length);
    paths.forEach(pth => {
        const pathSSIIdentifier = pathKeyMap[pth];
        let keySSI;
        try {
            keySSI = keySSISpace.parse(pathSSIIdentifier);
        } catch (e) {
            return callback(e);
        }

        getKeySSIMapping(keySSI, (err, derivedKeySSIs) => {
            if (err) {
                return callback(err);
            }

            keySSIMap = mergeMappings(keySSIMap, derivedKeySSIs);
            taskCounter.decrement();
        })
    })
}

const getKeySSIMapping = (keySSI, callback) => {
    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(e);
        }
    }
    const keySSIsMap = {};

    const __getDerivedKeySSIsRecursively = (currentKeySSI, derivedKeySSIsObj, callback) => {
        derivedKeySSIsObj[currentKeySSI.getTypeName()] = currentKeySSI.getIdentifier();
        try {
            currentKeySSI.derive((err, derivedKeySSI) => {
                if (err) {
                    return callback(err);
                }

                currentKeySSI = derivedKeySSI;
                __getDerivedKeySSIsRecursively(currentKeySSI, derivedKeySSIsObj, callback);
            });
        } catch (e) {
            return callback(undefined, derivedKeySSIsObj);
        }
    }

    __getDerivedKeySSIsRecursively(keySSI, {}, (err, _derivedKeySSIsObj)=>{
        if (err) {
            return callback(err);
        }

        for (let ssiType in _derivedKeySSIsObj) {
            keySSIsMap[ssiType] = {};
            const derivedKeySSIsList = Object.values(_derivedKeySSIsObj);
            for (let i = 0; i < derivedKeySSIsList.length; i++) {
                keySSIsMap[ssiType][derivedKeySSIsList[i]] = _derivedKeySSIsObj[ssiType];
            }
        }

        callback(undefined, keySSIsMap);
    })
}

module.exports = {
    getKeySSIsMappingFromPathKeys,
    getKeySSIMapping,
    mergeMappings
}