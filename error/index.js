const constants = require("../moduleConstants");

function detectRootCauseType(arr, priorityList) {
    for (let errorType of priorityList) {
        const index = arr.findIndex(e => {
            return e.rootCause && e.rootCause !== errorType
        });
        if (index !== -1) {
            return arr[index].rootCause;
        }
    }

    return constants.ERROR_ROOT_CAUSE.UNKNOWN_ERROR;
}

function ErrorWrapper(message, err, otherErrors, rootCause) {
    if (typeof rootCause === "undefined" && typeof otherErrors === "string") {
        rootCause = otherErrors;
        otherErrors = undefined;
    }
    let newErr = {};
    err = err || {rootCause: constants.ERROR_ROOT_CAUSE.UNKNOWN_ERROR};
    if (!err.rootCause) {
        err.rootCause = constants.ERROR_ROOT_CAUSE.UNKNOWN_ERROR;
    }

    if (!rootCause && otherErrors) {
        const errorTypes = constants.ERROR_ROOT_CAUSE;
        rootCause = detectRootCauseType(otherErrors, [errorTypes.DATA_INPUT_ERROR, errorTypes.MISSING_DATA_ERROR, errorTypes.BUSINESS_ERROR, errorTypes.THROTTLER_ERROR, errorTypes.NETWORK_ERROR]);
    }

    if (err.message || otherErrors) {
        if (err.originalMessage) {
            newErr.originalMessage = err.originalMessage;
        } else {
            newErr.originalMessage = err.message;
            if (otherErrors) {
                if (typeof otherErrors === "string") {
                    newErr.originalMessage += otherErrors;
                }

                if (Array.isArray(otherErrors)) {
                    otherErrors.forEach(e => newErr.originalMessage += `[${e.message}]`);
                }
            }
            if (typeof newErr.originalMessage === "string") {
                newErr.originalMessage = newErr.originalMessage.replace(/\n/g, " ");
            }
        }

    }

    try {
        if (err.originalMessage) {
            newErr = new Error(message + `(${err.originalMessage})`);
            newErr.originalMessage = err.originalMessage;
        } else {
            newErr = new Error(newErr.originalMessage);
            newErr.originalMessage = newErr.message;
        }
        throw newErr;
    } catch (e) {
        newErr = e;
    }
    newErr.previousError = err;
    newErr.debug_message = message;
    if (err.rootCause) {
        newErr.rootCause = err.rootCause;
    }
    if (rootCause) {
        newErr.rootCause = rootCause;
    }
    if (err.stack) {
        newErr.debug_stack = err.stack;
    }
    if (otherErrors) {
        newErr.otherErrors = otherErrors;
    }

    function dumpErrorWrapper(ew, showIntermediateErrors) {
        let level = 0;
        let str = `Top level error: ${ew.debug_message} ${ew.debug_stack}`
        let firstError;
        ew = ew.previousError;
        while (ew) {
            if (showIntermediateErrors && ew.previousError) {
                str += `\nError at layer ${level}: ${ew.debug_message} ${ew.debug_stack}`;
            }
            level++;
            firstError = ew;
            ew = ew.previousError;
        }
        str += `\n\tFirst error in the ErrorWrapper at level ${level} :${firstError}\n`;
        return str
    }

    newErr.toString = function () {
        return dumpErrorWrapper(newErr, true);
    };

    return newErr;
}

function createOpenDSUErrorWrapper(message, err, otherErrors, rootCause) {
    if (typeof message !== "string") {
        if (typeof err != "undefined") {
            err = message;
            message = "Wrong usage of createErrorWrapper";
        } else {
            message = "Wrong usage of createErrorWrapper";
        }
    }
    if (otherErrors && !Array.isArray(otherErrors) && typeof otherErrors !== "string") {
        otherErrors = [otherErrors];
    }
    return ErrorWrapper(message, err, otherErrors, rootCause);
}

function registerMandatoryCallback(callback, timeout) {
    if (timeout == undefined) {
        timeout = 5000; //5 seconds
    }
    let callStackErr = false;
    try {
        throw new Error("Callback should be called");
    } catch (err) {
        callStackErr = err;
    }
    const timeoutId = setTimeout(function () {
        reportUserRelevantError("Expected callback not called after " + timeout + " seconds. The calling stack is here: ", callStackErr);
    }, timeout);

    return function (...args) {
        clearTimeout(timeoutId);
        callback(...args);
    };
}

function OpenDSUSafeCallback(callback) {
    if (callback && typeof callback === 'function') {
        return callback;
    } else return function (err, res) {
        if (err) {
            reportUserRelevantError("Unexpected error happened without proper handling:", err);
        } else {
            reportUserRelevantWarning("Ignored result. Please add a proper callback when using this function! " + res)
        }
    }
}

let observable = require("./../utils/observable").createObservable();

function reportUserRelevantError(message, err) {
    genericDispatchEvent(constants.NOTIFICATION_TYPES.ERROR, message, err);
}

function reportUserRelevantWarning(message, err) {
    genericDispatchEvent(constants.NOTIFICATION_TYPES.WARN, message, err);
}


function reportUserRelevantInfo(message, err) {
    genericDispatchEvent(constants.NOTIFICATION_TYPES.INFO, message, err);
}

function reportDevRelevantInfo(message, err) {
    genericDispatchEvent(constants.NOTIFICATION_TYPES.DEV, message, err);
}

function genericDispatchEvent(type, message, err) {
    observable.dispatchEvent(type, {message, err});
    console.log(message, err ? err : "");
    if (err && typeof err.debug_message != "undefined") {
        printErrorWrapper(err, false);
    }
}


function unobserveUserRelevantMessages(type, callback) {
    switch (type) {
        case constants.NOTIFICATION_TYPES.ERROR:
            observable.off(type, callback);
            break;
        case constants.NOTIFICATION_TYPES.INFO:
            observable.off(type, callback);
            break;
        case constants.NOTIFICATION_TYPES.WARN:
            observable.off(type, callback);
            break;
        case constants.NOTIFICATION_TYPES.DEV:
            observable.off(type, callback);
            break;
        default:
            observable.off(constants.NOTIFICATION_TYPES.DEV, callback);
    }
}

function observeUserRelevantMessages(type, callback) {
    switch (type) {
        case constants.NOTIFICATION_TYPES.ERROR:
            observable.on(type, callback);
            break;
        case constants.NOTIFICATION_TYPES.INFO:
            observable.on(type, callback);
            break;
        case constants.NOTIFICATION_TYPES.WARN:
            observable.on(type, callback);
            break;
        case constants.NOTIFICATION_TYPES.DEV:
            observable.on(type, callback);
            break;
        case "unhandled":
            observable.on(type, callback);
            break;
        default:
            observable.on(constants.NOTIFICATION_TYPES.DEV, callback);
            break;
    }
}

if (typeof window !== "undefined") {
    window.onerror = (msg, url, line, call, err) => {
        observable.dispatchEvent("unhandled", err);
        console.log(msg, url, line, call);
    }

    window.addEventListener("error", window.onerror)
}

function printErrorWrapper(ew, showIntermediateErrors) {
    let level = 0;
    console.log("Top level error:", ew.debug_message, ew.debug_stack);
    let firstError;
    ew = ew.previousError;
    while (ew) {
        if (showIntermediateErrors && ew.previousError) {
            console.log("Error at layer ", level, " :", ew.debug_message, ew.debug_stack);
        }
        level++;
        firstError = ew;
        ew = ew.previousError;
    }
    console.log("\tFirst error in the ErrorWrapper at level ", level, " :", firstError);
}

function printOpenDSUError(...args) {
    for (let elem of args) {
        if (typeof elem.previousError != "undefined") {
            printErrorWrapper(elem);
        } else {
            console.log(elem);
        }
    }
}

function httpToRootCauseErrorCode(httpRes) {
    if (!httpRes) {
        return constants.ERROR_ROOT_CAUSE.UNKNOWN_ERROR;
    }

    if (!httpRes.statusCode) {
        return constants.ERROR_ROOT_CAUSE.NETWORK_ERROR;
    }

    if (httpRes.statusCode === 429) {
        return constants.ERROR_ROOT_CAUSE.THROTTLER_ERROR;
    }

    if (httpRes.statusCode === 404) {
        return constants.ERROR_ROOT_CAUSE.MISSING_DATA_ERROR;
    }

    if (httpRes.statusCode < 500) {
        return constants.ERROR_ROOT_CAUSE.BUSINESS_ERROR;
    }

    return constants.ERROR_ROOT_CAUSE.UNKNOWN_ERROR;
}

const DB_INSERT_EXISTING_RECORD_ERROR = "Trying to insert into existing record";

module.exports = {
    createOpenDSUErrorWrapper,
    reportUserRelevantError,
    reportUserRelevantWarning,
    reportUserRelevantInfo,
    reportDevRelevantInfo,
    observeUserRelevantMessages,
    unobserveUserRelevantMessages,
    OpenDSUSafeCallback,
    registerMandatoryCallback,
    printOpenDSUError,
    DB_INSERT_EXISTING_RECORD_ERROR,
    httpToRootCauseErrorCode
}
