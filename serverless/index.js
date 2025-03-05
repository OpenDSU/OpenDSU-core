function createServerlessAPIClient(userId, endpoint, namespace, interfaceDefinition) {
    if (!endpoint) {
        throw new Error('Endpoint URL is required');
    }
    endpoint += "/executeCommand";

    // Create the client instance
    const client = {};

    // Define the private execute command function
    const __executeCommand = async (commandName, args) => {
        args = args || [];

        const command = {
            forWhom: userId,
            name: commandName,
            namespace,
            args: args
        };

        try {
            const response = await fetch(endpoint, {
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
                throw new Error(`Command ${commandName} execution failed: ${JSON.stringify(errorMessage)}` );
            }

            return res.result;
        } catch (error) {
            throw error;
        }
    };

    // Create methods based on interface definition
    for (const methodName of interfaceDefinition) {
        client[methodName] = async function (...args) {
            // Execute the command with the specified configuration
            return await __executeCommand(
                methodName,
                args
            );
        };
    }

    return client;
}

module.exports = {
    createServerlessAPIClient
}
