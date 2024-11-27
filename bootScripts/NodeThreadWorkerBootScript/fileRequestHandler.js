const MimeType = require("../browser/util/MimeType");

const handle = async (dsu, req, res, seed, requestedPath, dsuCodeFileCacheHandler) => {
    const {url} = req;

    console.log(`Handling request for file: ${requestedPath}`);
    let file = requestedPath.split("?")[0]; // remove query params since this is a file request
    if (!file || file === "/" || file.indexOf(".") === -1) {
        file = "/index.html";
    }

    if (file.indexOf("/") !== 0) {
        file = `/${file}`;
    }
    console.log(`Looking for file: ${file}`);

    // console.log(`Handling iframe with KeySSI: ${seed} and file: ${file}`);

    let fileExtension = file.substring(file.lastIndexOf(".") + 1);
    let mimeType = MimeType.getMimeTypeFromExtension(fileExtension);

    const sendFile = (data) => {
        res.setHeader("Content-Type", mimeType.name);
        res.statusCode = 200;
        let content = data;

        if (!mimeType.binary) {
            content = data.toString();

            if (["htm", "html", "xhtml"].includes(fileExtension)) {
                const baseIndex = url.indexOf("/cloud-wallet");

                const base58Pattern = /^[A-HJ-NP-Za-km-z1-9]+$/;
                const base64Pattern = /^[A-Za-z0-9+/=]+$/;

                if (!base58Pattern.test(seed) && !base64Pattern.test(seed)) {
                    res.statusCode = 400;
                    return res.end("Invalid seed format");
                }

                const encodedSeed = encodeURIComponent(seed);

                const baseUrl = `${url.substr(0, baseIndex)}/cloud-wallet/${encodedSeed}/`;

                const sanitizeBaseUrl = (unsafe) => {
                    const { URL } = require('url');
                    const parsedUrl = new URL(unsafe, "http://localhost");

                    let pathname = parsedUrl.pathname
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                    return pathname;
                };

                const sanitizedBaseUrl = sanitizeBaseUrl(baseUrl);

                res.setHeader(
                    "Content-Security-Policy",
                    "default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self';"
                );

                content = content.replace(
                    "PLACEHOLDER_THAT_WILL_BE_REPLACED_BY_SW_OR_SERVER_WITH_BASE_TAG",
                    `<base href="${sanitizedBaseUrl}">`
                );
            }
        }

        res.end(content);
    };


    dsu.readFile(`/app${file}`, async (err, fileContent) => {
        if (err) {
            if (dsuCodeFileCacheHandler) {
                try {
                    const fileContent = await dsuCodeFileCacheHandler.getFileContent(file);
                    if (fileContent) {
                        return sendFile(fileContent);
                    }
                } catch (error) {
                    console.log("An error has occurred while getting file from cache", file);
                }
            }

            dsu.readFile(`/code${file}`, (err, fileContent) => {
                if (err) {
                    //console.log(`Error reading file /code${file}`, err);
                    res.statusCode = 404;
                    return res.end("Error reading file");
                }

                sendFile(fileContent);
            });
            return;
        }

        sendFile(fileContent);
    });
};

module.exports = {
    handle,
};
