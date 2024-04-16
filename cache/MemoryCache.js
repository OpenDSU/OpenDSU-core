function MemoryCache(useWeakRef) {
    let storage = {};
    const self = this;

    self.get = function (key, callback) {
        if (typeof key !== "string") {
            throw new Error("Keys should be strings");
        }

        let value = storage[key];
        if (value && useWeakRef) {
            value = value.deref();
        }
        if (callback) {
            callback(undefined, value);
        }
        return value;
    };

    self.put = function (key, value, callback) {
        if (typeof key !== "string") {
            throw new Error("Keys should be strings");
        }
        if (useWeakRef) {
            value = value ? new WeakRef(value) : value;
        }
        storage[key] = value;
        if (callback) {
            callback(undefined, true)
        }
    }

    self.set = self.put;

    self.clear = function (callback) {
        storage = {};
        callback(undefined);
    }
}


module.exports.MemoryCache = MemoryCache;