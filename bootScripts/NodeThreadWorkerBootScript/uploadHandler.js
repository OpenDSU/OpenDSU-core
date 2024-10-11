const querystring = require("querystring");

const Uploader = require("../Uploader");

const handle = (dsu, req, res, requestedPath) => {
    let uploader;
    try {
        const query = requestedPath.substr(requestedPath.indexOf("?") + 1);
        const queryParams = querystring.parse(query);
        console.log({queryParams});
        uploader = Uploader.configureUploader(queryParams, dsu);
    } catch (e) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 500;
        res.end(JSON.stringify(e.message));
        return;
    }

    let data = [];
    req.on("data", (chunk) => {
        data.push(chunk);
        // data += chunk;
    });

    req.on("end", () => {
        try {
            req.body = $$.Buffer.concat(data);
            uploader.upload(req, function (err, uploadedFiles) {
                if (err && (!Array.isArray(uploadedFiles) || !uploadedFiles.length)) {
                    console.log(err);
                    let statusCode = 400; // Validation errors

                    if (err instanceof Error) {
                        // This kind of errors should indicate
                        // a serious problem with the uploader
                        // and the status code should reflect that
                        statusCode = 500; // Internal "server" errors
                    }

                    res.setHeader("Content-Type", "application/json");
                    res.statusCode = statusCode;
                    res.end(
                        JSON.stringify(err, (key, value) => {
                            if (value instanceof Error) {
                                return value.message;
                            }

                            return value;
                        })
                    );

                    return;
                }

                res.setHeader("Content-Type", "application/json");
                res.statusCode = 201;
                res.end(JSON.stringify(uploadedFiles));
            });
        } catch (err) {
            console.log("worker error", err);
            res.statusCode = 500;
            res.end();
        }
    });
};

module.exports = {
    handle,
};
