let stores = {};
const config = require("opendsu").loadApi("config");
const constants = require("../moduleConstants");

const IndexedDBCache = require("./IndexeDBCache").IndexedDBCache;
const FSCache = require("./FSCache").FSCache;
const MemoryCache = require("./MemoryCache").MemoryCache;

let memoryCache = true;
if ($$) {
    $$.enableClassicVaultCache = function () {
        memoryCache = false;
    }
}

function getCacheForVault(storeName, lifetime) {
    if (typeof stores[storeName] === "undefined") {
        switch (config.get(constants.CACHE.VAULT_TYPE)) {
            case constants.CACHE.INDEXED_DB:
                stores[storeName] = new IndexedDBCache(storeName, lifetime);
                break;
            case constants.CACHE.FS:
                stores[storeName] = new FSCache(storeName, lifetime);
                break;
            case constants.CACHE.MEMORY:
                stores[storeName] = new MemoryCache(true);
                break;
            case constants.CACHE.NO_CACHE:
                break;
            default:
                throw Error("Invalid cache type");
        }
    }

    return stores[storeName];
}

function getMemoryCache(storeName) {
    return stores[storeName] = new MemoryCache();
}

function getWeakRefMemoryCache(storeName) {
    let cache = stores[storeName];
    if (!cache) {
        cache = new MemoryCache(true);
        stores[storeName] = cache;
    }
    return cache;
}

module.exports = {
    getCacheForVault,
    getMemoryCache,
    getWeakRefMemoryCache
}