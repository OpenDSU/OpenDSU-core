const FILE_CHUNK_SIZE = 1024 * 1024;

const extractSReadSSIAndFilePathFromRequest = (request) => {
    const requestedPath = request.url;
    let urlAfterAppend = requestedPath.substr("/append/".length);
    let sReadSSI;
    let filePath;
    if (urlAfterAppend.indexOf("/") !== -1) {
        const urlParts = urlAfterAppend.split("/", 2);
        sReadSSI = urlParts[0];
        filePath = urlParts[1];
    } else {
        sReadSSI = urlAfterAppend;
        filePath = "/";
    }
    if (!filePath) {
        filePath = "/";
    }
    if (!filePath.startsWith("/")) {
        filePath = `/${filePath}`;
    }

    return { sReadSSI, filePath };
};

const isAvailableSpaceInLastBrick = (sizeSSI) => {
    const totalSize = sizeSSI.getTotalSize();
    const bufferSize = sizeSSI.getBufferSize();
    return totalSize % bufferSize !== 0;
};

const createDSU = async (wallet, response) => {
    try {
        const opendsu = require("opendsu");
        const dbSpace = opendsu.loadApi("db");
        const keySSISpace = opendsu.loadApi("keyssi");
        const keySSI = await $$.promisify(wallet.getKeySSIAsObject)();
        const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(keySSI.getDLDomain());

        const enclaveDB = await $$.promisify(dbSpace.getMainEnclaveDB)();
        console.log("Creating DSU from main enclave...");
        const dsu = await $$.promisify(enclaveDB.createDSU)(seedSSI);

        let sReadSSI = await $$.promisify(dsu.getKeySSIAsObject)();
        sReadSSI = await $$.promisify(sReadSSI.derive)();
        const sReadSSIId = sReadSSI.getIdentifier();

        await $$.promisify(wallet.refresh);

        response.statusCode = 200;
        response.end(sReadSSIId);
    } catch (error) {
        console.log("Error creating DSU", error);
        response.statusCode = 500;
        return response.end(error.message);
    }
};

const appendToDSU = async (wallet, request, response) => {
    if (!request || !request.pipe || typeof request.pipe !== "function") {
        response.statusCode = 500;
        return response.end("File not provided");
    }

    const { sReadSSI, filePath } = extractSReadSSIAndFilePathFromRequest(request);
    console.log(`Appending file to sReadSSI: ${sReadSSI} at path ${filePath}...`);

    const Transform = require("stream").Transform;
    const Writable = require("stream").Writable;

    const keyssiApi = require("opendsu").loadApi("keyssi");
    const walletKeySSI = await $$.promisify(wallet.getKeySSIAsObject)();
    const dsuDomain = walletKeySSI.getDLDomain();
    const templateSeedSSI = keyssiApi.createTemplateSeedSSI(dsuDomain);

    const resolver = require("opendsu").loadApi("resolver");
    const dsu = await $$.promisify(resolver.loadDSU)(sReadSSI);
    console.log("Refreshing DSU...")
    await $$.promisify(dsu.refresh)();

    let bricksMeta;
    try {
        bricksMeta = await $$.promisify(dsu.getBigFileBricksMeta)(filePath);
    } catch (error) {
        // bricksMeta is not available if the file doesn't exist
        console.log(`Failed to get bricksMeta for file ${filePath}`, error);
    }

    let buffer = Buffer.alloc(0);

    let sizeSSI;
    if (bricksMeta && bricksMeta.length && bricksMeta[0].size) {
        try {
            sizeSSI = keyssiApi.parse(bricksMeta[0].size);
        } catch (error) {
            console.error(`Failed to parse sizeSSI ${bricksMeta[0].size} from DSU ${sReadSSI}`, error);
        }
        if (sizeSSI && isAvailableSpaceInLastBrick(sizeSSI)) {
            // we need to load the last brick and append it to the initially read buffer
            // so that we can overwrite the last brick from the file
            const brickingApi = require("opendsu").loadApi("bricking");
            let lastBrickHashLink = bricksMeta[bricksMeta.length - 1].hashLink;
            try {
                lastBrickHashLink = keyssiApi.parse(lastBrickHashLink);
            } catch (error) {
                console.error(`Failed to parse hashlinkSSI ${lastBrickHashLink} from DSU ${sReadSSI}`, error);
            }
            const lastBrick = await $$.promisify(brickingApi.getBrick)(lastBrickHashLink);
            buffer = $$.Buffer.from(lastBrick);
            console.log(`Found available space in the last brick having existing ${lastBrick.byteLength} byte(s)`);
        }
    }

    const chunkTransform = new Transform({
        async transform(data, encoding, callback) {
            var allData = Buffer.concat([buffer, data]);
            console.log(`Transforming chunk of ${data.byteLength} byte(s)`);
            var totalLength = allData.length;
            var remainder = totalLength % FILE_CHUNK_SIZE;
            var cutoff = totalLength - remainder;
            for (var i = 0; i < cutoff; i += FILE_CHUNK_SIZE) {
                var chunk = allData.slice(i, i + FILE_CHUNK_SIZE);
                console.log(`Extracting chunk from start ${i} and end ${i + FILE_CHUNK_SIZE} and total size ${chunk.byteLength}`);
                this.push(chunk);
            }
            buffer = allData.slice(cutoff, totalLength);
            callback();
        },
        flush(callback) {
            this.push(buffer);
            console.log(`Extracting remaining ${buffer.byteLength} byte(s)`);
            callback();
        },
    });

    let shouldAppendToExistingFile = !!bricksMeta && !!bricksMeta.length && !!sizeSSI;
    const writeStream = new Writable({
        async write(data, encoding, callback) {
            try {
                console.log(`Writing ${data.byteLength} byte(s) to brick...`);
                const bricking = require("opendsu").loadApi("bricking");
                const options = {
                    maxBrickSize: FILE_CHUNK_SIZE * 5, // ensure only 1 brick is constructed for chunk
                };
                const buffer = data;
                const result = await $$.promisify(bricking.constructBricksFromData)(templateSeedSSI, buffer, options);
                if (result.length !== 1) {
                    // we should have exactly one brick for each buffer size
                    console.error(
                        `Saved data of chunk size ${FILE_CHUNK_SIZE} didn't generate exactly one brick (but ${result.length})`
                    );
                    throw new Error("Invalid brick count for data chunk");
                }

                const brickToAppend = result[0];
                if (shouldAppendToExistingFile) {
                    const totalSize = sizeSSI.getTotalSize();
                    const bufferSize = sizeSSI.getBufferSize();
                    const newTotalSize = isAvailableSpaceInLastBrick(sizeSSI)
                        ? Math.floor(totalSize / bufferSize) * bufferSize + data.byteLength
                        : totalSize + data.byteLength;
                    sizeSSI = keyssiApi.createSizeSSI(dsuDomain, newTotalSize, bufferSize);

                    console.log(`Setting new sizeSSI of totalSize: ${newTotalSize} / buffer size ${bufferSize}`);

                    await $$.promisify(dsu.appendBigFileBrick)(filePath, sizeSSI.getIdentifier(), brickToAppend);
                } else {
                    console.log(`Setting sizeSSI of totalSize: ${data.byteLength} / buffer size ${FILE_CHUNK_SIZE}`);
                    sizeSSI = keyssiApi.createSizeSSI(dsuDomain, data.byteLength, FILE_CHUNK_SIZE);
                    const bricks = [{ size: sizeSSI.getIdentifier() }, brickToAppend];
                    await $$.promisify(dsu.writeFileFromBricks)(filePath, bricks);

                    // new file was created so now we can append to it
                    shouldAppendToExistingFile = true;
                }

                callback();
            } catch (error) {
                console.log(`Failed to write ${data.byteLength} byte(s) to brick`, error);
                callback(error);
            }
        },
    });

    writeStream.on("finish", async () => {
        response.statusCode = 200;
        response.end();
    });

    writeStream.on("error", (err) => {
        console.log("Encountered write error", err);
        response.statusCode = 500;
        response.end(err.message);
    });

    request.pipe(chunkTransform).pipe(writeStream);
};

module.exports = {
    createDSU,
    appendToDSU,
};
