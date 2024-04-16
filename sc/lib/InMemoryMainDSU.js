function InMemoryMainDSU() {
    const obj = {};
    let batchInProgress = false;
    obj["/environment.json"] = Buffer.from(JSON.stringify({
        vaultDomain: "vault",
        didDomain: "vault"
    }))

    obj["environment.json"] = obj["/environment.json"];

    const preventUpdateOutsideBatch = (updateFn, ...args) => {
        if ($$.LEGACY_BEHAVIOUR_ENABLED) {
            return updateFn(...args);
        }

        if (!this.batchInProgress()) {
            const callback = args.pop();
            return callback(Error("Batch not started. Use safeBeginBatch() or safeBeginBatchAsync before calling this method."));
        }

        updateFn(...args);
    }
    const convertUpdateFnToAsync = (updateFn, ...args) => {
        if (!this.batchInProgress()) {
            throw Error("No batch has been started");
        }

        return $$.promisify(updateFn)(...args);
    }

    const convertGetFunctionToAsync = (getFn, ...args) => {
        return $$.promisify(getFn)(...args);
    }

    this.writeFile = (path, data, callback) => {
        if (!path.startsWith("/")) {
            path = `/${path}`;
        }

        const _writeFile = (path, data, callback) => {
            obj[path] = data;
            callback();
        }
        preventUpdateOutsideBatch(_writeFile, path, data, callback);
    }

    this.writeFileAsync = async (path, data) => {
        return convertUpdateFnToAsync(this.writeFile, path, data);
    }

    this.readFile = (path, callback) => {
        if (!path.startsWith("/")) {
            path = `/${path}`;
        }
        callback(undefined, obj[path]);
    }

    this.readFileAsync = async (path) => {
        return convertGetFunctionToAsync(this.readFile, path);
    }

    this.batchInProgress = () => {
        return batchInProgress;
    }

    this.safeBeginBatch = (wait, callback) => {
        if (typeof wait === "function") {
            callback = wait;
            wait = false;
        }
        if (this.batchInProgress()) {
            return callback(Error("Batch already in progress"));
        }
        batchInProgress = true;
        callback();
    }

    this.startOrAttachBatch = (callback) => {
        return this.safeBeginBatch(true, callback);
    }

    this.startOrAttachBatchAsync = () => {
        return convertGetFunctionToAsync(this.startOrAttachBatch);
    }

    this.safeBeginBatchAsync = async (wait) => {
        return convertGetFunctionToAsync(this.safeBeginBatch, wait);
    }

    this.commitBatch = (batchId, callback) => {
        if (typeof callback === "undefined") {
            callback = batchId;
            batchId = undefined;
        }
        batchInProgress = false;
        callback();
    }

    this.commitBatchAsync = async () => {
        convertUpdateFnToAsync(this.commitBatch);
    }

    this.refresh = (callback) => {
        callback();
    }
}

module.exports = InMemoryMainDSU;