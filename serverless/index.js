function createServerlessAPIClient(userId, endpoint, pluginName) {
    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }

    // Store the base endpoint and create the command endpoint
    const baseEndpoint = endpoint;
    const commandEndpoint = `${endpoint}/executeCommand`;

    // Define the private execute command function
    const __executeCommand = async (commandName, args) => {
        args = args || [];

        const command = {
            forWhom: userId,
            name: commandName,
            pluginName,
            args: args
        };

        try {
            const response = await fetch(commandEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(command)
            });

            // Handle unsuccessful responses
            let res = await response.json()
            if (!res || res.err) {
                const errorMessage = res.err ? res.err : "Unknown error";
                throw new Error(`Command ${commandName} execution failed: ${JSON.stringify(errorMessage)}`);
            }

            return res.result;
        } catch (error) {
            throw error;
        }
    };

    // Create a special registerPlugin method
    const registerPlugin = async (pluginName, pluginPath) => {
        try {
            const response = await fetch(`${baseEndpoint}/registerPlugin`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pluginName,
                    pluginPath
                })
            });

            if(response.status >= 400) {
                const res = await response.json();
                if (!res || res.err) {
                    const errorMessage = res.err ? res.err : "Unknown error";
                    throw new Error(`Plugin registration failed: ${JSON.stringify(errorMessage)}`);
                }

                return res.result;
            }
        } catch (error) {
            throw error;
        }
    };

    // Create a base object with the special method
    const baseClient = {
        registerPlugin
    };

    // Create a Proxy to handle any method calls
    return new Proxy(baseClient, {
        get: (target, prop) => {
            // If the property exists on the target (our special methods), return it
            if (prop in target) {
                return target[prop];
            }

            // Otherwise return a function that will execute the command with the property name
            return async (...args) => {
                return await __executeCommand(prop, args);
            };
        }
    });
}

module.exports = {
    createServerlessAPIClient
}