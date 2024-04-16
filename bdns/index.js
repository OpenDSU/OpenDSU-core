const PendingCallMixin = require("../utils/PendingCallMixin");
const getBaseURL = require("../utils/getBaseURL");

function BDNS() {
    PendingCallMixin(this);
    let bdnsCache;
    const http = require("opendsu").loadApi("http");
    let isInitialized = false;

    let retrieveHosts = () => {
        const url = `${getBaseURL()}/bdns#x-blockchain-domain-request`;
        http.fetch(url)
            .then((response) => {
                return response.json()
            }).then((bdnsHosts) => {
            bdnsHosts = JSON.stringify(bdnsHosts);
            bdnsHosts = bdnsHosts.replace(/\$ORIGIN/g, getBaseURL());
            bdnsCache = JSON.parse(bdnsHosts);
            isInitialized = true;
            this.executePendingCalls();
        }).catch((err) => {
            console.error("Failed to retrieve BDNS hosts", err);
            throw err;
        })
    };

    retrieveHosts();

    const getSection = (dlDomain, section, callback) => {
        function load_or_default() {
            if (typeof dlDomain === "undefined") {
                return callback(Error(`The provided domain is undefined`));
            }

            if (typeof bdnsCache[dlDomain] === "undefined") {
                return callback(Error(`BDNS: The provided domain <${dlDomain}> is not configured. Check if the domain name is correct and if BDNS contains info for this specific domain.`));
            }

            const config = bdnsCache[dlDomain][section] ? bdnsCache[dlDomain][section] : [getBaseURL()];
            callback(undefined, config);
        }

        if (!isInitialized) {
            return this.addPendingCall(() => {
                if (dlDomain === undefined) {
                    return callback(new Error("The domain is not defined"));
                }
                return load_or_default();
            })
        }
        if (dlDomain === undefined) {
            return callback(new Error("The domain is not defined"));
        }
        load_or_default();
    }

    this.getRawInfo = (dlDomain, callback) => {

        if (dlDomain && typeof dlDomain === "function") {
            callback = dlDomain;
            dlDomain = null;
        }

        if (!isInitialized) {
            return this.addPendingCall(() => {
                callback(undefined, dlDomain ? bdnsCache[dlDomain] : bdnsCache);
            })
        }
        callback(undefined, dlDomain ? bdnsCache[dlDomain] : bdnsCache);
    };

    this.getBrickStorages = (dlDomain, callback) => {
        getSection(dlDomain, "brickStorages", callback);
    };

    this.getAnchoringServices = (dlDomain, callback) => {
        getSection(dlDomain, "anchoringServices", callback);
    };

    this.getContractServices = (dlDomain, callback) => {
        getSection(dlDomain, "contractServices", callback);
    };

    this.getReplicas = (dlDomain, callback) => {
        getSection(dlDomain, "replicas", callback);
    };

    this.getNotificationEndpoints = (dlDomain, callback) => {
        getSection(dlDomain, "notifications", callback);
    }

    this.getMQEndpoints = (dlDomain, callback) => {
        getSection(dlDomain, "mqEndpoints", callback);
    }

    this.setBDNSHosts = (bdnsHosts) => {
        isInitialized = true;
        bdnsCache = bdnsHosts;
    }


    this.getOrigin = () => {
        return getBaseURL();
    };

    // returns the origin placeholder (value that will be used to define the generic origin)
    this.getOriginPlaceholder = () => {
        return "ORIGIN";
    };
    this.getOriginUrl = getBaseURL;
}


module.exports = new BDNS();
