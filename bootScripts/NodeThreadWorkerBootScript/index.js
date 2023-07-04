const http = require("http");
const worker_threads = "worker_threads";
const { parentPort, workerData } = require(worker_threads);
let cookie = workerData.cookie;
const openDSU = require("opendsu");
const resolver = openDSU.loadApi("resolver");

const walletHandler = require("./walletHandler");
const apiHandler = require("./apiHandler");
const apiStandardHandler = require("./apiStandardHandler");
const uploadHandler = require("./uploadHandler");
const downloadHandler = require("./downloadHandler");
const fileRequestHandler = require("./fileRequestHandler");
const mainDSUSSIHandler = require("./mainDSUSSIHandler");
const DSUCodeFileCacheHandler = require("./DSUCodeFileCacheHandler");

//we inject a supplementary tag in order make it more clear the source of the log
let originalLog = console.log;
console.log = function (...args) {
    originalLog("\t[CloudWallet]", ...args);
};

const initialiseEnclave = (enclaveType, keySSI) => {
    const enclaveAPI = openDSU.loadAPI("enclave");
    const scAPI = openDSU.loadAPI("sc");
    return new Promise((resolve, reject) => {
        if (!keySSI) {
            console.log(`KeySSI not specified for enclave ${enclaveType}`);
            return reject();
        }
        const enclave = enclaveAPI.initialiseWalletDBEnclave(keySSI);
        enclave.on("initialised", async () => {
            try {
                await $$.promisify(scAPI.setEnclave)(enclave, enclaveType);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
};

function boot() {
    const sendErrorAndExit = (error) => {
        parentPort.postMessage({ error });
        setTimeout(() => {
            process.exit(1);
        }, 100);
    };

    process.on("uncaughtException", (error) => {
        console.error("uncaughtException inside worker", error);
        sendErrorAndExit(error);
    });

    if (!workerData) {
        return sendErrorAndExit("invalid data");
    }

    if (!workerData.seed || typeof workerData.seed !== "string") {
        return sendErrorAndExit("missing or invalid seed");
    }
    if (!workerData.authorizationKey) {
        return sendErrorAndExit("missing authorizationKey");
    }

    let { seed, authorizationKey, cacheContainerPath, walletAnchorId } = workerData;
    let dsuCodeFileCacheHandler; // used to construct local FS cache from DSU mounted at /code

    const startHttpServer = (dsu) => {
        let httpServer = http.createServer(function (req, res) {
            const { method, url } = req;

            if (!req.headers || req.headers.authorization !== authorizationKey) {
                res.statusCode = 403;
                return res.end("Unauthorized request");
            }

            if(req.headers.cookie){
                cookie = req.headers.cookie;
            }

            const requestedPath = url;

            console.log(`Handling url: ${requestedPath}`);

            if (method === "PUT" && requestedPath.indexOf("/create-dsu") === 0) {
                return walletHandler.createDSU(dsu, res);
            }

            if (method === "PUT" && requestedPath.indexOf("/append/") === 0) {
                return walletHandler.appendToDSU(dsu, req, res);
            }

            if (requestedPath.indexOf("/api-standard") === 0) {
                return apiStandardHandler.handle(dsu, res, requestedPath);
            }

            if (requestedPath.indexOf("/api?") === 0) {
                return apiHandler.handle(dsu, res, requestedPath);
            }

            if (requestedPath.indexOf("/upload") === 0) {
                return uploadHandler.handle(dsu, req, res, requestedPath);
            }

            if (requestedPath.indexOf("/download") === 0) {
                return downloadHandler.handle(dsu, res, requestedPath);
            }

            if (requestedPath.indexOf("/getSSIForMainDSU") === 0) {
                return mainDSUSSIHandler.handle(seed, res);
            }
            const seedForHtmlContent = walletAnchorId || seed;
            fileRequestHandler.handle(dsu, req, res, seedForHtmlContent, requestedPath, dsuCodeFileCacheHandler);
        });

        httpServer.listen(0, function () {
            const serverPort = httpServer.address().port;
            parentPort.postMessage({ port: serverPort, status: "started" });
        });
    };

    try {
        console.log("Trying to load DSU for seed ===============================================", seed);
        const keySSISpace = openDSU.loadAPI("keyssi");
        const SSITypes = require("key-ssi-resolver").SSITypes;
        const seedSSI = keySSISpace.parse(seed);
        const isWallet = seedSSI.getTypeName() === SSITypes.WALLET_SSI;
        const http = openDSU.loadAPI("http");
        http.registerInterceptor((data, callback)=>{
            let {url, headers} = data;
            if (cookie) {
                if(!headers){
                    headers = {};
                }
                headers.cookie = cookie;
            }
            callback(undefined, {url, headers})
        });
        resolver.loadDSU(seed, async (err, dsu) => {
            if (err) {
                console.log(`Error loading DSU`, err);
                return sendErrorAndExit(err);
            }

            if (isWallet) {
                try {
                    console.log(`Wallet detected for seed ${seed}`);
                    const writableDSU = dsu.getWritableDSU();

                    dsu.writeFile = (path, data, callback) => {
                        writableDSU.writeFile(path, data, callback);
                    };
                    dsu.readFile = (path, callback) => {
                        writableDSU.readFile(path, callback);
                    };

                    const constants = openDSU.constants;
                    const environmentConfig = JSON.parse(await $$.promisify(dsu.readFile)(constants.ENVIRONMENT_PATH));
                    console.log(`Loaded environment config for wallet ${seed}`, environmentConfig);

                    await initialiseEnclave("MAIN_ENCLAVE", environmentConfig[constants.MAIN_ENCLAVE.KEY_SSI]);
                    await initialiseEnclave("SHARED_ENCLAVE", environmentConfig[constants.SHARED_ENCLAVE.KEY_SSI]);
                } catch (error) {
                    console.log(`Error loading wallet`, error);
                    return sendErrorAndExit(error);
                }
            }

            if (cacheContainerPath) {
                try {
                    dsuCodeFileCacheHandler = new DSUCodeFileCacheHandler(dsu, cacheContainerPath);

                    // construct the cache in parallel since it takes a bit of time
                    setTimeout(async () => {
                        try {
                            await dsuCodeFileCacheHandler.constructCache();
                        } catch (error) {
                            console.log("Failed to construct DSU cache", error);
                        }
                    });
                } catch (error) {
                    console.log("Failed to create DSU code handler", error)
                }
            }

            rawDossier = dsu;
            startHttpServer(dsu);
        });
    } catch (error) {
        parentPort.postMessage({ error, status: "failed" });
        process.exit(-1);
    }
}

boot();
