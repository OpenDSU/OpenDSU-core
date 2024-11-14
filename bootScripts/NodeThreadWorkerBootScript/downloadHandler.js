const path = require("path");
const MimeType = require("../browser/util/MimeType");

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
    const requestedFullPath = path.join(basePath, ...pathSegments);
    const normalizedPath = path.normalize(requestedFullPath);

    if (!normalizedPath.startsWith(basePath)) {
        res.statusCode = 403;
        return res.end("Access forbidden");
    }

    dsu.refresh((err) => {
        if (err) {
            res.statusCode = 500;
            return res.end(err.message);
        }
        dsu.readFile(normalizedPath, (err, stream) => {
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
