const path = require("path");
const MimeType = require("../browser/util/MimeType");

function validatePath (user_input) {
    if (user_input.indexOf('\0') !== -1) {
        throw 'Access denied';
    }
    if (!/^[a-z0-9]+$/.test(user_input)) {
        throw 'Access denied';
    }
    let path = require('path');
    let safe_input = path.normalize(user_input).replace(/^(\.\.(\/|\\|$))+/, '');

    return safe_input;
}

const handle = (dsu, res, requestedPath) => {
    function extractPath() {
        let pathSegments = requestedPath.split("/").slice(2); // remove the "/delete" or "/download" part
        pathSegments = pathSegments
            .filter((segment) => segment.length > 0)
            .map((segment) => decodeURIComponent(segment));
        return pathSegments;
    }

    let pathSegments = extractPath();
    if (!pathSegments.length) {
        res.statusCode = 404;
        return res.end("File not found");
    }

    const basePath = "/";
    let requestedFullPath = path.join(basePath, ...pathSegments);

    try{
        requestedFullPath = validatePath(requestedFullPath);
    }catch(err){
        res.statusCode = 403;
        return res.end("Access forbidden");
    }

    dsu.refresh((err) => {
        if (err) {
            res.statusCode = 500;
            return res.end(err.message);
        }
        dsu.readFile(requestedFullPath, {root: './'}, (err, stream) => {
            if (err) {
                if (err instanceof Error) {
                    if (err.message.indexOf("could not be found") !== -1) {
                        res.statusCode = 404;
                        return res.end("File not found");
                    }

                    res.statusCode = 500;
                    return res.end(err.message);
                }

                res.statusCode = 500;
                console.debug(Object.prototype.toString.call(err));
                return res.end();
            }

            // Extract the filename
            const filename = pathSegments[pathSegments.length - 1];
            const fileExt = filename.substring(filename.lastIndexOf(".") + 1);
            res.setHeader("Content-Type", MimeType.getMimeTypeFromExtension(fileExt).name);
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.statusCode = 200;
            res.end(stream);
        });
    });
};

module.exports = {
    handle,
};
