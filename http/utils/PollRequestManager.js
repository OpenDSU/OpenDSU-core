function PollRequestManager(fetchFunction, connectionTimeout = 10000) {

    const requests = new Map();

    function Request(url, options, delay = 0) {
        let promiseHandlers = {};
        let currentState = undefined;
        let timeout;
        this.url = url;
        let abortController;
        let previousAbortController;

        this.execute = function () {
            if (typeof AbortController !== "undefined") {
                if (typeof abortController === "undefined") {
                    previousAbortController = new AbortController()
                } else {
                    previousAbortController = abortController;
                }
                abortController = new AbortController();
                options.signal = previousAbortController.signal;
            }
            if (!currentState && delay) {
                currentState = new Promise((resolve, reject) => {
                    timeout = setTimeout(() => {
                        fetchFunction(url, options).then((response) => {
                            resolve(response);
                        }).catch((err) => {
                            reject(err);
                        })
                    }, delay);
                });
            } else {
                currentState = fetchFunction(url, options);
            }
            return currentState;
        }

        this.cancelExecution = function () {
            clearTimeout(timeout);
            timeout = undefined;
            if (typeof currentState !== "undefined") {
                currentState = undefined;
            }
            promiseHandlers.resolve = (...args) => {
                console.log("(not important) Resolve called after cancel execution with the following args", ...args)
            };
            promiseHandlers.reject = (...args) => {
                console.log("(not important) Reject called after cancel execution with the following args", ...args)
            };
        }

        this.setExecutor = function (resolve, reject) {
            if (promiseHandlers.resolve) {
                return reject(new Error("Request already in progress"));
            }
            promiseHandlers.resolve = resolve;
            promiseHandlers.reject = reject;
        }

        this.resolve = function (...args) {
            promiseHandlers.resolve(...args);
            this.destroy();
            promiseHandlers = {};
        }

        this.reject = function (...args) {
            if (promiseHandlers.reject) {
                promiseHandlers.reject(...args);
            }
            this.destroy();
            promiseHandlers = {};
        }

        this.destroy = function (removeFromPool = true) {
            this.cancelExecution();

            if (!removeFromPool) {
                return;
            }

            // Find our identifier
            const requestsEntries = requests.entries()
            let identifier;
            for (const [key, value] of requestsEntries) {
                if (value === this) {
                    identifier = key;
                    break;
                }
            }

            if (identifier) {
                requests.delete(identifier);
            }
        }

        this.abort = () => {
            if (typeof previousAbortController !== "undefined") {
                previousAbortController.abort();
            }
        }
    }

    this.createRequest = function (url, options, delayedStart = 0) {
        const request = new Request(url, options, delayedStart);

        const promise = new Promise((resolve, reject) => {
            request.setExecutor(resolve, reject);
            createPollingTask(request);
        });
        promise.abort = () => {
            this.cancelRequest(promise);
        };

        requests.set(promise, request);
        return promise;
    };

    this.cancelRequest = function (promiseOfRequest) {
        if (typeof promiseOfRequest === "undefined") {
            console.log("No active request found.");
            return;
        }

        const request = requests.get(promiseOfRequest);
        if (request) {
            request.destroy(false);
            requests.delete(promiseOfRequest);
        }
    }

    this.setConnectionTimeout = (_connectionTimeout) => {
        connectionTimeout = _connectionTimeout;
    }

    /* *************************** polling zone ****************************/
    function createPollingTask(request) {
        let safePeriodTimeoutHandler;
        let serverResponded = false;

        /**
         * default connection timeout in api-hub is @connectionTimeout
         * we wait double the time before aborting the request
         */
        function beginSafePeriod() {
            safePeriodTimeoutHandler = setTimeout(() => {
                if (!serverResponded) {
                    request.abort();
                }
                serverResponded = false;
                beginSafePeriod()
            }, connectionTimeout * 2);
            reArm();
        }

        function endSafePeriod(serverHasResponded) {
            serverResponded = serverHasResponded;

            clearTimeout(safePeriodTimeoutHandler);
        }

        function reArm() {
            request.execute().then((response) => {
                if (!response.ok) {
                    endSafePeriod(true);

                    //todo check for http errors like 404
                    if (response.status === 403) {
                        request.reject(Error("Token expired"));
                        return
                    }

                    if (response.status === 503) {
                        let err = Error(response.statusText || "Service unavailable");
                        err.code = 503;
                        throw err;
                    }

                    return beginSafePeriod();
                }

                if (response.status === 204) {
                    endSafePeriod(true);
                    beginSafePeriod();
                    return;
                }

                if (safePeriodTimeoutHandler) {
                    clearTimeout(safePeriodTimeoutHandler);
                }

                request.resolve(response);
            }).catch((err) => {
                switch (err.code) {
                    case "ETIMEDOUT":
                    case "ECONNREFUSED":
                        endSafePeriod(true);
                        beginSafePeriod();
                        break;
                    case 20:
                    case "ERR_NETWORK_IO_SUSPENDED":
                    //reproduced when user is idle on ios (chrome).
                    case "ERR_INTERNET_DISCONNECTED":
                        //indicates a general network failure.
                        break;
                    default:
                        console.log("abnormal error: ", err);
                        endSafePeriod(true);
                        request.reject(err);
                }
            });

        }

        beginSafePeriod();
    }

}

module.exports = PollRequestManager;
