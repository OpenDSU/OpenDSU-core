const MimeType = require("../browser/util/MimeType");

const handle = (dsu, res, requestedPath) => {
    function extractPath() {
        let path = requestedPath.split("/").slice(2); // remove the "/delete" or "/download" part
        path = path.filter((segment) => segment.length > 0).map((segment) => decodeURIComponent(segment));
        return path;
    }

    let path = extractPath();
    if (!path.length) {
        res.statusCode = 404;
        return res.end("File not found");
    }
    path = `/${path.join("/")}`;

    if(path.indexOf("..") !== -1){
        res.statusCode = 403;
        return res.end();
    }

    dsu.refresh((err) => {
        if (err) {
            res.statusCode = 500;
            return res.end(err.message);
        }
        dsu.readFile(path, (err, stream) => {
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
            const filename = path.split("/").pop();

            let fileExt = filename.substring(filename.lastIndexOf(".") + 1);
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
