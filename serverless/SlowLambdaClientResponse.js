const NotificationManager = require('./NotificationManager');

function SlowLambdaClientResponse(webhookUrl, callId) {
    let progressCallback = null;
    const notificationManager = new NotificationManager(webhookUrl);
    
    this.promise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;

        // Start polling immediately
        notificationManager.waitForResult(callId, {
            onProgress: (progress) => {
                if (progressCallback) {
                    progressCallback(progress);
                }
            }
        }).then(result => {
            this._resolve(result);
        }).catch(error => {
            this._reject(error);
        }).finally(() => {
            notificationManager.cancelAll();
        });
    });

    this.setTimeout = (duration) => {
        // Can be used to configure NotificationManager's maxAttempts if needed
        return this;
    };

    this.onProgress = (callback) => {
        progressCallback = callback;
        return this;
    };

    // Make the instance thenable by delegating to the internal promise
    this.then = (...args) => this.promise.then(...args);
    this.catch = (...args) => this.promise.catch(...args);
    this.finally = (...args) => this.promise.finally(...args);
}

module.exports = SlowLambdaClientResponse;