function createServerlessAPIClient(userId, endpoint, pluginName) {
    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }

    // Store the base endpoint and create the command endpoint
    const baseEndpoint = endpoint;
    const commandEndpoint = `${endpoint}/executeCommand`;

    // Define the private execute command function
    const __executeCommand = async (commandName, args = []) => {
        const command = {
            forWhom: userId,
            name: commandName,
            pluginName,
            args
        };

        try {
            const response = await fetch(commandEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(command)
            });

            let res = await response.json();
            if (!res || res.err) {
                const errorMessage = res?.err || "Unknown error";
                throw new Error(`Command ${commandName} execution failed: ${JSON.stringify(errorMessage)}`);
            }

            return res.result;
        } catch (error) {
            throw error;
        }
    };

    // Define the private registerPlugin method
    const registerPlugin = async (newPluginName, pluginPath) => {
        try {
            const response = await fetch(`${baseEndpoint}/registerPlugin`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pluginName: newPluginName, pluginPath })
            });

            if(response.status >= 400) {
                const res = await response.json();
                const errorMessage = res?.err || "Unknown error";
                throw new Error(`Plugin registration failed: ${JSON.stringify(errorMessage)}`);
            }

            // Possibly return something meaningful here (e.g., response.json())
            return;
        } catch (error) {
            throw error;
        }
    };

    // The target object to wrap by proxy
    const targetObject = {
        registerPlugin
    };

    // Create and return the proxy
    return new Proxy(targetObject, {
        get(target, prop, receiver) {
            // If the property is registerPlugin, return it directly
            if (prop === 'registerPlugin') {
                return Reflect.get(target, prop, receiver);
            }

            // If the user is trying to access a 'then' property (e.g. for an async call),
            // we avoid returning any function that would confuse consumption in async contexts
            if (prop === 'then') {
                return undefined;
            }

            // For all other properties, assume they are command names
            return async (...args) => {
                return await __executeCommand(prop, args);
            };
        }
    });
}

module.exports = {
    createServerlessAPIClient
};
