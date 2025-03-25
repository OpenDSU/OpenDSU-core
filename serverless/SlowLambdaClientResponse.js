const NotificationManager = require('./NotificationManager');

function SlowLambdaClientResponse(webhookUrl, initialCallId) {
    let progressCallback = null;
    let callId = initialCallId;
    const notificationManager = new NotificationManager(webhookUrl);
    let resolvePromise, rejectPromise;
    
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    this._setCallId = (newCallId) => {
        callId = newCallId;
        // Start polling once we have a callId
        notificationManager.waitForResult(callId, {
            onProgress: (progress) => {
                if (progressCallback) {
                    progressCallback(progress);
                }
            }
        }).then(result => {
            resolvePromise(result);
        }).catch(error => {
            rejectPromise(error);
        }).finally(() => {
            notificationManager.cancelAll();
        });
    };

    this._resolve = resolvePromise;
    this._reject = rejectPromise;

    this.setTimeout = (duration) => {
        return this;
    };

    this.onProgress = (callback) => {
        progressCallback = callback;
        return this;
    };

    this.then = function(onFulfilled, onRejected) {
        return promise.then(onFulfilled, onRejected);
    };
    
    this.catch = function(onRejected) {
        return promise.catch(onRejected);
    };
    
    this.finally = function(onFinally) {
        return promise.finally(onFinally);
    };
}

module.exports = SlowLambdaClientResponse;