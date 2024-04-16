const constants = require("../moduleConstants").ERROR_ROOT_CAUSE;

function handlePromise(promise, message) {
    return promise.then(res => {
        let rootCause;
        switch (res.status) {
            case 200 :
                return true;
            case 409 :
                return false;
            case 500 :
                rootCause = constants.NETWORK_ERROR;
                break;
            case 404 :
                rootCause = constants.MISSING_DATA_ERROR;
                break;
            case 400 :
                rootCause = constants.BUSINESS_ERROR;
                break;
            default:
                rootCause = constants.UNKNOWN_ERROR;
        }
        let err = new Error(message);
        err.code = res.status;
        err = createOpenDSUErrorWrapper(message, err, rootCause);
        throw err;
    }).catch(err => {
        if (err.rootCause) {
            throw err;
        }
        throw createOpenDSUErrorWrapper(message, err, constants.NETWORK_ERROR);
    });
}

function lockAsync(id, secret, period) {
    const originUrl = require("../bdns").getOriginUrl();
    const http = require("../http");

    return handlePromise(http.fetch(`${originUrl}/lock?id=${id}&secret=${secret}&period=${period}`), "Failed to acquire lock");
}

function unlockAsync(id, secret) {
    const originUrl = require("../bdns").getOriginUrl();
    const http = require("../http");
    return handlePromise(http.fetch(`${originUrl}/unlock?id=${id}&secret=${secret}`), "Failed to unlock");
}

let exposed = {lockAsync, unlockAsync};
exposed.lock = function (id, secret, period, callback) {
    callback = $$.makeSaneCallback(callback);
    lockAsync(id, secret, period).then(callback).catch(callback);
};

exposed.unlock = function (id, secret, callback) {
    callback = $$.makeSaneCallback(callback);
    unlockAsync(id, secret).then(callback).catch(callback);
};
module.exports = exposed;
