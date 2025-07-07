const NotificationManager = require('./NotificationManager');

function LambdaClientResponse(webhookUrl, initialCallId, operationType) {
    let progressCallback = null;
    let endCallback = null;
    let callId = initialCallId;
    let currentOperationType = operationType;
    const notificationManager = new NotificationManager(webhookUrl);
    let resolvePromise, rejectPromise;
    let isResolved = false;

    // Store the actual result
    this.result = null;

    const promise = new Promise((resolve, reject) => {
        resolvePromise = (value) => {
            if (!isResolved) {
                isResolved = true;
                resolve(value);
            }
        };
        rejectPromise = (error) => {
            if (!isResolved) {
                isResolved = true;
                reject(error);
            }
        };
    });

    this._updateOperationType = (newType) => {
        console.log(`LambdaClientResponse: Updating operation type from ${currentOperationType} to ${newType}`);
        currentOperationType = newType;
    };

    this._isLongRunningOperation = (operationType) => {
        const longRunningOperations = [
            'slowLambda',
            'observableLambda',
            'cmbSlowLambda',
            'cmbObservableLambda'
        ];
        return longRunningOperations.includes(operationType);
    };

    this._setCallId = (newCallId) => {
        console.log(`LambdaClientResponse: Setting callId to ${newCallId}`);
        callId = newCallId;

        // For long-running operations, resolve immediately and delay polling
        if (this._isLongRunningOperation(currentOperationType)) {
            // Create a wrapper object that doesn't implement Promise interface
            const wrapper = {
                onProgress: (callback) => {
                    progressCallback = callback;
                    return wrapper;
                },
                onEnd: (callback) => {
                    endCallback = callback;
                    return wrapper;
                },
                result: null
            };

            // Store wrapper reference for later use
            this._wrapper = wrapper;

            resolvePromise(wrapper);

            // Delay the start of polling to ensure callbacks are registered
            setTimeout(() => {
                this._startPolling();
            }, 1);
        } else {
            // For sync operations, start polling immediately
            this._startPolling();
        }
    };

    this._startPolling = () => {
        // Start polling for the result
        notificationManager.waitForResult(callId, {
            onProgress: (progress) => {
                if (progressCallback) {
                    progressCallback(progress);
                }
            },
            onEnd: (result) => {
                if (this._isLongRunningOperation(currentOperationType) && endCallback) {
                    endCallback(result);
                }
            },
            infinite: this.infinite !== undefined ? this.infinite : this._isLongRunningOperation(currentOperationType),
            maxAttempts: this.maxAttempts !== undefined ? this.maxAttempts : (this._isLongRunningOperation(currentOperationType) ? Infinity : 30)
        }).then(result => {
            // Store the result
            this.result = result;
            // Update wrapper result if it exists
            if (this._wrapper) {
                this._wrapper.result = result;
            }
            // Only resolve here for non-long-running operations
            if (!this._isLongRunningOperation(currentOperationType)) {
                resolvePromise(result);
            }
        }).catch(error => {
            rejectPromise(error);
        }).finally(() => {
            notificationManager.cancelAll();
        });
    };

    this._resolve = (result) => {
        this.result = result;
        // Only resolve for sync operations, long-running operations resolve when callId is set
        if (!this._isLongRunningOperation(currentOperationType)) {
            resolvePromise(result);
        }
    };
    this._reject = rejectPromise;

    this.setTimeout = (duration) => {
        return this;
    };

    this.setInfinite = (infinite = true) => {
        this.infinite = infinite;
        return this;
    };

    this.setMaxAttempts = (maxAttempts) => {
        this.maxAttempts = maxAttempts;
        return this;
    };

    this.onProgress = (callback) => {
        progressCallback = callback;
        return this;
    };

    this.onEnd = (callback) => {
        endCallback = callback;
        return this;
    };

    this.then = function (onFulfilled, onRejected) {
        return promise.then(onFulfilled, onRejected);
    };

    this.catch = function (onRejected) {
        return promise.catch(onRejected);
    };

    this.finally = function (onFinally) {
        return promise.finally(onFinally);
    };
}

module.exports = LambdaClientResponse; 