let didDocuments = {};

function CommunicationHub() {
    const pubSub = require("soundpubsub").soundPubSub;
    const didAPI = require("opendsu").loadAPI("w3cdid");
    const connectedToMQ = {};
    let strongPubSub;
    const ERROR_CHANNEL = "errorChannel";
    const getChannelName = (did, messageType) => {
        return `${did.getIdentifier()}/${messageType}`;
    }

    const ensureDIDDocumentIsLoadedThenExecute = (did, fnToExecute) => {
        if (typeof did === "string") {
            if (didDocuments[did]) {
                return fnToExecute(undefined, didDocuments[did]);
            }
            return didAPI.resolveDID(did, (err, resolvedDID) => {
                if (err) {
                    fnToExecute(err);
                    return;
                }

                didDocuments[did] = resolvedDID;
                did = resolvedDID;
                fnToExecute(undefined, did);
            });
        }
        let identifier = did.getIdentifier();
        if (!didDocuments[identifier]) {
            didDocuments[identifier] = did;
        }
        fnToExecute(undefined, didDocuments[identifier]);
    }

    this.subscribe = (did, messageType, callback) => {
        const __subscribe = (err, did) => {
            if (!connectedToMQ[did.getIdentifier()]) {
                connectedToMQ[did.getIdentifier()] = true;
                did.waitForMessages((err, message) => {
                    if (err) {
                        pubSub.publish(getChannelName(did, ERROR_CHANNEL), {err});
                        console.error(err);
                        return;
                    }

                    try {
                        message = JSON.parse(message);
                    } catch (e) {
                        pubSub.publish(getChannelName(did, ERROR_CHANNEL), {err: e, message});
                        console.error(e);
                        return;
                    }

                    const channelName = getChannelName(did, message.messageType);
                    if (!pubSub.hasChannel(channelName)) {
                        pubSub.addChannel(channelName);
                    }

                    pubSub.publish(channelName, message);
                });
            }
            const channel = getChannelName(did, messageType);
            pubSub.subscribe(channel, callback);
        }

        ensureDIDDocumentIsLoadedThenExecute(did, __subscribe);
    };

    this.unsubscribe = (did, messageType, callback) => {
        const stopWaitingForMessages = (err, did) => {
            did.stopWaitingForMessages();
            const channel = getChannelName(did, messageType);
            delete connectedToMQ[did.getIdentifier()];
            pubSub.unsubscribe(channel, callback);
        }

        ensureDIDDocumentIsLoadedThenExecute(did, stopWaitingForMessages);
    };

    const subscribers = {};
    // soundpubSub keeps WeakRefs
    this.strongSubscribe = (did, messageType, callback) => {
        const __strongSubscribe = (err, did) => {
            const channelName = getChannelName(did, messageType);
            if (!subscribers[channelName]) {
                subscribers[channelName] = [];
            }

            const index = subscribers[channelName].findIndex(sub => sub === callback);
            if (index === -1) {
                subscribers[channelName].push(callback);
            }

            this.subscribe(did, messageType, callback);
        }

        ensureDIDDocumentIsLoadedThenExecute(did, __strongSubscribe);
    }

    this.strongUnsubscribe = (did, messageType, callback) => {
        const channelName = getChannelName(did, messageType);
        const __strongUnsubscribe = (err, did) => {
            if (!subscribers[channelName]) {
                return callback();
            }

            const index = subscribers[channelName].findIndex(sub => sub === callback);
            if (index === -1) {
                return callback();
            }

            subscribers[channelName].splice(index);
            if (subscribers[channelName].length === 0) {
                delete subscribers[channelName];
                return callback();
            }

            this.unsubscribe(did, messageType, callback);
        }

        ensureDIDDocumentIsLoadedThenExecute(did, __strongUnsubscribe);
    }

    this.getPubSub = () => {
        return pubSub;
    }

    const createStrongPubSub = (_pubSub) => {
        const strongPubSub = Object.assign({}, _pubSub);
        strongPubSub.subscribe = (target, callback, waitForMore, filter) => {
            if (!subscribers[target]) {
                subscribers[target] = [];
            }

            const index = subscribers[target].findIndex(sub => sub === callback);
            if (index === -1) {
                subscribers[target].push(callback);
            }

            if (!_pubSub.hasChannel(target)) {
                _pubSub.addChannel(target);
            }

            _pubSub.subscribe(target, callback, waitForMore, filter);
        }

        strongPubSub.unsubscribe = (target, callback, filter) => {
            if (!strongPubSub[target]) {
                return callback();
            }

            const index = subscribers[target].findIndex(sub => sub === callback);
            if (index === -1) {
                return callback();
            }

            subscribers[target].splice(index);
            if (subscribers[target].length === 0) {
                delete subscribers[target];
                return callback();
            }

            _pubSub.unsubscribe(target, callback, filter);
        }

        return strongPubSub;
    }

    this.getStrongPubSub = () => {
        if (!strongPubSub) {
            strongPubSub = createStrongPubSub(pubSub);
        }

        return strongPubSub;
    }

    this.stop = (did) => {
        ensureDIDDocumentIsLoadedThenExecute(did, (err, didDocument) => {
            didDocument.stopWaitingForMessages();
        });
    }

    this.registerErrorHandler = (did, handler) => {
        ensureDIDDocumentIsLoadedThenExecute(did, (err, didDocument) => {
            pubSub.subscribe(getChannelName(didDocument, ERROR_CHANNEL), handler);
        });
    }

    this.unRegisterErrorHandler = (did, handler) => {
        ensureDIDDocumentIsLoadedThenExecute(did, (err, didDocument) => {
            pubSub.unsubscribe(getChannelName(didDocument, ERROR_CHANNEL), handler);
        });
    }
}

const getCommunicationHub = () => {
    if (!$$.CommunicationHub) {
        $$.CommunicationHub = new CommunicationHub();
    }

    return $$.CommunicationHub;
}

module.exports = {
    getCommunicationHub
}
