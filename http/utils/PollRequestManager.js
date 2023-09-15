function PollRequestManager(fetchFunction,  connectionTimeout = 10000, pollingTimeout = 1000){

	const requests = new Map();

	function Request(url, options, delay = 0, abortController) {

		let timeout;
		this.url = url;

		this.execute = function() {
			let currentState;
			options.signal = abortController.signal; // Always overwrite request options to prevent external overwriting
			if (!timeout && delay) {
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

		this.abort = () => {
			clearTimeout(timeout);
			timeout = undefined;
			abortController.abort();
		}
	}

	this.createRequest = function (url, options, delayedStart = 0, abortController) {
		if (!abortController)
			abortController = new AbortController();

		const request = new Request(url, options, delayedStart, abortController);

		const promise = new Promise((resolve, reject) => {
			createPollingTask(request).then((response) => {
				resolve(response);
			}).catch((err) => {
				reject(err);
			})
		});
		promise.abort = () => {
			this.cancelRequest(promise);
		};

		requests.set(promise, request);
		return promise;
	};

	this.cancelRequest = function(promiseOfRequest){
		if(typeof promiseOfRequest === "undefined"){
			console.log("No active request found.");
			return;
		}

		const request = requests.get(promiseOfRequest);
		if (request) {
			request.abort();
			requests.delete(promiseOfRequest);
		} else {
			console.warn("No active request found.");
		}
	}

	this.setConnectionTimeout = (_connectionTimeout)=>{
		connectionTimeout = _connectionTimeout;
	}

	/* *************************** polling zone ****************************/
	function createPollingTask(request) {
		return new Promise((resolve, reject) => {
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
				request.execute().then( (response) => {
					if (!response.ok) {
						endSafePeriod(true);

						//todo check for http errors like 404
						if (response.status === 403) {
							reject(Error("Token expired"));
							return
						}

						if (response.status === 503){
							let err = Error(response.statusText || "Service unavailable");
							err.code = 503;
							throw err;
							return;
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

					resolve(response);
				}).catch( (err) => {
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
						case "ABORT_ERR":
							endSafePeriod(true);
							reject(err);
							break;
						default:
							console.log("abnormal error: ", err);
							endSafePeriod(true);
							reject(err);
					}
				});

			}

			beginSafePeriod();

		})
	}

}

module.exports = PollRequestManager;
