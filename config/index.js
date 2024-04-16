const constants = require("../moduleConstants");
const config = {trustLevel: 1};

function set(key, value) {
    config[key] = value;
}

function get(key) {
    return config[key];
}

function readEnvFile(callback) {
    const sc = require("opendsu").loadAPI("sc");
    sc.getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to get main DSU`, err));
        }

        mainDSU.readFile(constants.ENVIRONMENT_PATH, (err, env) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get main DSU`, err));
            }

            try {
                env = JSON.parse(env.toString());
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed parse env file`, e));
            }

            callback(undefined, env);
        });
    });
}

function setEnv(key, value, callback) {
    //update environment.json
    readEnvFile((err, env) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to read env file`, err));
        }
        const scAPI = require("opendsu").loadAPI("sc");
        if (env[key] !== value) {
            env[key] = value;
            scAPI.configEnvironment(env, callback);
            return;
        }
        callback(undefined, scAPI.getSecurityContext());
    });
}

function getEnv(key, callback) {
    readEnvFile((err, env) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to read env file`, err));
        }

        callback(undefined, env[key]);
    });
}

const autoconfigFromEnvironment = require("./autoConfigFromEnvironment");

function disableLocalVault() {
    set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
}

module.exports = {
    set,
    get,
    setEnv,
    getEnv,
    autoconfigFromEnvironment,
    disableLocalVault,
    readEnvFile
};

