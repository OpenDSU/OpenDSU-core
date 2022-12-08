function CommunicationHub() {
    const pubSub = require("soundpubsub").soundPubSub;
    const isWaitingForMessages = {};

    const getChannelName = (did, messageType) => {
        return `${did.getIdentifier()}/${messageType}`;
    }

    this.subscribe = (did, messageType, checkSecurityMethod, callback) => {
        if (!callback) {
            callback = checkSecurityMethod;
            checkSecurityMethod = () => {
                return true;
            };
        }

        if (checkSecurityMethod()) {
            if (!isWaitingForMessages[did.getIdentifier()]) {
                did.subscribe((err, message) => {
                    if (err) {
                        return callback(err);
                    }

                    try {
                        message = JSON.parse(message);
                    } catch (e) {
                        return callback(e);
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
        } else {
            callback(Error("Security check failed"));
        }
    };

    this.unsubscribe = (did, messageType, checkSecurityMethod, callback) => {
        if (!callback) {
            callback = checkSecurityMethod;
            checkSecurityMethod = () => {
                return true;
            };
        }

        if (checkSecurityMethod()) {
            did.stopWaitingForMessages();
            const channel = getChannelName(did, messageType);
            delete isWaitingForMessages[did.getIdentifier()];
            pubSub.unsubscribe(channel, callback);
        } else {
            callback(Error("Security check failed"));
        }
    };
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