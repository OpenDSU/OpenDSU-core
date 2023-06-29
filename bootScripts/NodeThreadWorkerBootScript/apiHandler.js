const querystring = require("querystring");

const handle = (dsu, res, requestedPath) => {
    const apiQuery = requestedPath.substr("/api?".length);
    let {name: functionName, arguments: args} = querystring.parse(apiQuery);

    try {
        args = JSON.parse(args);
    } catch (err) {
        res.statusCode = 400;
        return res.end("Invalid arguments provided");
    }

    dsu.refresh((err) => {
        if (err) {
            res.statusCode = 500;
            return res.end(err.message);
        }

        dsu.call(functionName, ...args, (...result) => {
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(result));
        });
    });
};

module.exports = {
    handle,
};
