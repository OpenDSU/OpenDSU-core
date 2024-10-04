const querystring = require("querystring");

const USER_DETAILS = "user-details.json";

const getAppSeed = function (dsu, path, appName, res) {
    dsu.listMountedDossiers(path, (err, result) => {
        if (err) {
            const errorMessage = "Error listing mounted DSU";
            console.log(errorMessage, err);
            res.statusCode = 500;
            return res.end(errorMessage);
        }

        let selectedDsu = result.find((dsu) => dsu.path === appName);
        if (!selectedDsu) {
            const errorMessage = `Dossier with the provided appName was not found in the mounted points!`;
            console.log(errorMessage, err);
            res.statusCode = 500;
            return res.end(errorMessage);
        }

        res.statusCode = 200;
        res.end(selectedDsu.identifier);
    });
};

const getUserDetails = function (dsu, res) {
    dsu.readFile(USER_DETAILS, (err, fileContent) => {
        if (err) {
            const errorMessage = "Error getting user details";
            console.log(errorMessage, err);
            res.statusCode = 500;
            return res.end(errorMessage);
        }

        const dataSerialization = fileContent.toString();
        res.statusCode = 200;
        res.end(dataSerialization);
    });
};

const handle = (dsu, res, requestedPath) => {
    const requestedApiPath = requestedPath.substr("/api-standard".length + 1);
    const requestedApiPathInfoMatch = requestedApiPath.match(/^([^/?]*)[/?](.*)$/);

    const apiMethod = requestedApiPathInfoMatch ? requestedApiPathInfoMatch[1] : requestedApiPath;
    const apiParameter = requestedApiPathInfoMatch ? requestedApiPathInfoMatch[2] : undefined;

    switch (apiMethod) {
        case "app-seed": {
            const {path, name} = querystring.parse(apiParameter);
            getAppSeed(dsu, path, name, res);
            return;
        }
        case "user-details": {
            getUserDetails(dsu, res);
            return;
        }
    }

    res.statusCode = 403;
    res.end("Unknow api-standard method");
};

module.exports = {
    handle,
};
