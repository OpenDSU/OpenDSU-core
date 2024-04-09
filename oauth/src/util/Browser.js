function parseUrlHash(hash) {
    return parseUrlParams(hash.substring(1));
}


function parseUrlQuery(query) {
    return parseUrlParams(query.substring(1));
}


function parseUrlParams(value) {
    const params = {};
    const searchParams = new URLSearchParams(value);
    for (let [key, value] of searchParams.entries()) {
        params[key] = value;
    }
    return params;
}


function getCurrentLocation() {
    return location.href.substring(location.origin.length)
}


function isItMe() {
    if (window.opener) {
        return false;
    } else if (window.top !== window.self) {
        return false
    } else {
        return true;
    }
}


module.exports = {
    parseUrlHash,
    parseUrlQuery,
    getCurrentLocation,
    isItMe
};