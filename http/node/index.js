const {setContentTypeByData, buildOptions, getNetworkForOptions} = require("./common.js");
const {httpToRootCauseErrorCode, createOpenDSUErrorWrapper} = require("../../error");
const constants = require("opendsu").constants;

function generateMethodForRequestWithData(httpMethod) {
    return function (url, data, reqOptions, callback) {
        if (typeof reqOptions === "function") {
            callback = reqOptions;
            reqOptions = {};
        }

        const options = buildOptions(url, httpMethod, reqOptions);
        const network = getNetworkForOptions(options);

        setContentTypeByData(options, data);

        const req = network.request(options, (res) => {
            const {statusCode} = res;

            let error;
            if (statusCode >= 400) {
                error = new Error('Request Failed.\n' +
                    `Status Code: ${statusCode}\n` +
                    `URL: ${options.hostname}:${options.port}${options.path}`);

                error = createOpenDSUErrorWrapper("HTTP request failed", error, httpToRootCauseErrorCode(res));
            }

            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                if (error) {
                    error = createOpenDSUErrorWrapper(rawData, error, httpToRootCauseErrorCode(res));
                    error.statusCode = statusCode;
                    callback(error);
                    return;
                }

                callback(undefined, rawData, res.headers);
                //trying to prevent getting ECONNRESET error after getting our response
                // req.abort();
            });
        }).on("error", (error) => {
            const errorWrapper = createOpenDSUErrorWrapper(`Network error`, error, constants.ERROR_ROOT_CAUSE.NETWORK_ERROR);
            console.log(`[${httpMethod}] ${url}`, errorWrapper);
            callback(errorWrapper);
        })

        if (data && data.pipe && typeof data.pipe === "function") {
            data.pipe(req);
            return;
        }

        if (typeof data !== 'string' && !$$.Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
            data = JSON.stringify(data);
        }

        if (data) {
            req.write(data);
        }
        req.end();
    };
}

function doGet(url, options, callback) {
    let fnc = generateMethodForRequestWithData('GET');
    return fnc(url, undefined, options, callback);
}

module.exports = {
    fetch,
    doGet,
    doPost: generateMethodForRequestWithData('POST'),
    doPut: generateMethodForRequestWithData('PUT')
}
