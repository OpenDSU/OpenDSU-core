function SmartUrl(bdnsEntry) {
    const {fetch, doPut, doPost, doGet} = require("opendsu").loadAPI("http");
    let url = typeof bdnsEntry === "string" ? bdnsEntry : bdnsEntry.url;

    if (!url) {
        console.debug(`<${JSON.stringify(bdnsEntry)}> BDNS entry wrong configuration.`);
        throw new Error(`<${JSON.stringify(bdnsEntry)}> BDNS entry wrong configuration.`);
    }

    function getOptions(options) {
        let opts = options || {};
        if (url !== bdnsEntry && bdnsEntry.headers) {
            if (!opts.headers) {
                opts.headers = {};
            }
            Object.assign(opts.headers, bdnsEntry.headers);
        }
        return opts;
    }

    this.fetch = (options) => {
        return fetch(url, getOptions(options));
    }

    this.doPut = (body, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }
        return doPut(url, body, getOptions(options), callback);
    }

    this.doPost = (body, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }
        return doPost(url, body, getOptions(options), callback);
    }

    this.doGet = (options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }
        return doGet(url, getOptions(options), callback);
    }

    function concatUrls(base, path) {
        let returnUrl = base;
        if (returnUrl.endsWith("/") && path.startsWith("/")) {
            returnUrl = returnUrl.slice(0, returnUrl.length - 1);
        }
        returnUrl += path;
        return returnUrl;
    }

    this.concatWith = (path) => {
        return new SmartUrl(bdnsEntry === url ? concatUrls(url, path) : {
            url: concatUrls(url, path),
            headers: bdnsEntry.headers
        });
    }
}

module.exports = SmartUrl;