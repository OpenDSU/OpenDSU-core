const fs = require("fs");
const path = require("path");

const readFileAsync = $$.promisify(fs.readFile.bind(fs));
const writeFileAsync = $$.promisify(fs.writeFile.bind(this));
const mkdirAsync = $$.promisify(fs.mkdir.bind(this));

const pathExistsAsync = async (path) => {
    try {
        await $$.promisify(fs.access.bind(fs))(path);
        return true;
    } catch (error) {
        return false;
    }
};

function isFileInsideFolderStructure(file) {
    return file.indexOf("/") !== -1;
}

class DSUCodeFileCacheHandler {
    constructor(dsu, cacheFolderBasePath) {
        this.dsu = dsu;
        this.cacheFolderBasePath = cacheFolderBasePath;
    }

    async constructCache(isBoot) {
        const openDSU = require("opendsu");
        const keySSISpace = openDSU.loadAPI("keyssi");
        const resolver = openDSU.loadApi("resolver");

        const mountedDSUs = await $$.promisify(this.dsu.listMountedDossiers)("/");

        let codeFolderName = openDSU.constants.CODE_FOLDER;
        if (codeFolderName[0] === "/") {
            codeFolderName = codeFolderName.substring(1);
        }
        const codeMount = mountedDSUs.find((mount) => mount.path === codeFolderName);
        const codeDSU = await $$.promisify(resolver.loadDSU)(codeMount.identifier);
        const codeFiles = await $$.promisify(codeDSU.listFiles)("/");
        let lastVersion = await $$.promisify(codeDSU.getLastHashLinkSSI)();
        lastVersion = lastVersion.getIdentifier();
        const cacheFolderPath = path.join(this.cacheFolderBasePath, lastVersion);
        this.cacheFolderPath = cacheFolderPath;

        const readDSUFileAsync = await $$.promisify(codeDSU.readFile);

        const isHashLinkFolderAlreadyPresent = await pathExistsAsync(cacheFolderPath);

        if (!isHashLinkFolderAlreadyPresent) {
            console.log(`Creating cache folder for DSU ${lastVersion}: ${cacheFolderPath}`);
            try {
                await mkdirAsync(cacheFolderPath, {recursive: true});
            } catch (error) {
                console.log(`Failed created cacheFolderPath ${cacheFolderPath}`, error);
            }
        }

        const createdFoldersMap = {};
        const availableFilesMap = {};

        for (const codeFile of codeFiles) {
            if (isFileInsideFolderStructure(codeFile)) {
                const codeFolder = codeFile.substr(0, codeFile.lastIndexOf("/"));
                if (!createdFoldersMap[codeFolder]) {
                    try {
                        await mkdirAsync(path.join(cacheFolderPath, codeFolder), {recursive: true});
                    } catch (error) {
                        if (error.code !== "EEXIST") {
                            console.log(`Failed to create cache folder ${codeFolder}`, error);
                        }
                    }
                    createdFoldersMap[codeFolder] = true;
                }
            }

            try {
                const filePath = path.join(cacheFolderPath, codeFile);

                let mustWriteFile = true;
                if (isHashLinkFolderAlreadyPresent) {
                    mustWriteFile = !(await pathExistsAsync(filePath));
                }

                if (mustWriteFile) {
                    const fileContent = await readDSUFileAsync(codeFile);
                    await writeFileAsync(filePath, fileContent);
                }

                let relativeFilePath = codeFile;
                if (relativeFilePath[0] !== "/") {
                    relativeFilePath = `/${relativeFilePath}`;
                }
                availableFilesMap[relativeFilePath] = true;
            } catch (error) {
                console.log(`read ${codeFile} error`, error);
            }
        }

        this.availableFilesMap = availableFilesMap;
    }

    async getFileContent(filePath) {
        if (!this.availableFilesMap) {
            // Strategy is still constructing cache
            return null;
        }

        const fullPath = path.join(this.cacheFolderPath, filePath);
        if (!this.availableFilesMap[filePath]) {
            console.log(`File ${fullPath} not present inside DSU cache`);
            return null;
        }

        console.log(`Serving file ${fullPath} from DSU cache`);
        const fileContent = await readFileAsync(fullPath);

        return fileContent;
    }
}

module.exports = DSUCodeFileCacheHandler;
