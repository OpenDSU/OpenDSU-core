const NotificationManager = require('./NotificationManager');

function LambdaClientResponse(webhookUrl, initialCallId, operationType) {
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
        console.log(`LambdaClientResponse: Updating operation type from ${currentOperationType} to ${newType}`);
        currentOperationType = newType;
    };

    this._setCallId = (newCallId) => {
        console.log(`LambdaClientResponse: Setting callId to ${newCallId}`);
        callId = newCallId;
        // Start polling once we have a callId
        notificationManager.waitForResult(callId, {
            onProgress: (progress) => {
                if (progressCallback) {
                    progressCallback(progress);
                }
            },
            onEnd: () => {
                console.log(`LambdaClientResponse: Received onEnd notification for callId ${callId}`);
                console.log(`LambdaClientResponse: currentOperationType=${currentOperationType}, endCallback=${!!endCallback}`);
                if (currentOperationType === 'observableLambda' && endCallback) {
                    console.log('LambdaClientResponse: Calling endCallback');
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

    // Add onEnd method by default for all operation types
    this.onEnd = (callback) => {
        console.log('LambdaClientResponse: onEnd callback registered');
        endCallback = callback;
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

module.exports = LambdaClientResponse; 