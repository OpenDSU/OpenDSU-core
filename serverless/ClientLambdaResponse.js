const NotificationManager = require('./NotificationManager');

function ClientLambdaResponse(webhookUrl, initialCallId, operationType) {
    let progressCallback = null;
    let endCallback = null;
    let callId = initialCallId;
    let currentOperationType = operationType;
    const notificationManager = new NotificationManager(webhookUrl);
    let resolvePromise, rejectPromise;
    
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    this._updateOperationType = (newType) => {
        currentOperationType = newType;
        // Add onEnd method if switching to observableLambda
        if (newType === 'observableLambda' && !this.onEnd) {
            this.onEnd = (callback) => {
                endCallback = callback;
                return this;
            };
        }
    };

    this._setCallId = (newCallId) => {
        callId = newCallId;
        // Start polling once we have a callId
        notificationManager.waitForResult(callId, {
            onProgress: (progress) => {
                if (progressCallback) {
                    progressCallback(progress);
                }
            },
            onEnd: () => {
                if (currentOperationType === 'observableLambda' && endCallback) {
                    endCallback();
                }
            }
        }).then(result => {
            // Pass the result when resolving
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

    // Only add onEnd method initially for observableLambda type
    if (currentOperationType === 'observableLambda') {
        this.onEnd = (callback) => {
            endCallback = callback;
            return this;
        };
    }

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

module.exports = ClientLambdaResponse; 