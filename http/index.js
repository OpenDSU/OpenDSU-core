/**
 * http API space
 */
const or = require('overwrite-require');

switch ($$.environmentType) {
	case or.constants.BROWSER_ENVIRONMENT_TYPE:
		module.exports = require("./browser");
		break;
	case or.constants.WEB_WORKER_ENVIRONMENT_TYPE:
	case or.constants.SERVICE_WORKER_ENVIRONMENT_TYPE:
		module.exports = require("./serviceWorker");
		break;
	default:
		module.exports = require("./node");
}

//enable support for http interceptors.
require("./utils/interceptors").enable(module.exports);

const PollRequestManager = require("./utils/PollRequestManager");
const rm = new PollRequestManager(module.exports.fetch);

module.exports.poll = function (url, options, connectionTimeout, delayStart, abortController) {
	connectionTimeout = connectionTimeout || 10000;
	rm.setConnectionTimeout(connectionTimeout);
	const request = rm.createRequest(url, options, delayStart, abortController);
	return request;
};

module.exports.unpoll = function(request){
	rm.cancelRequest(request);
}
