const ENVIRONMENT_TYPES = require("../overwrite-require/src/moduleConstants");

let cachedKeySSIResolver = undefined;


module.exports = {
    ENVIRONMENT_TYPES,
    CODE_FOLDER: "/code",
    CONSTITUTION_FOLDER: '/code/constitution',
    BLOCKCHAIN_FOLDER: '/blockchain',
    APP_FOLDER: '/app',
    DOMAIN_IDENTITY_FILE: '/domain_identity',
    ASSETS_FOLDER: "/assets",
    TRANSACTIONS_FOLDER: "/transactions",
    APPS_FOLDER: "/apps",
    DATA_FOLDER: "/data",
    MANIFEST_FILE: "/manifest",
    BDNS_ROOT_HOSTS: "BDNS_ROOT_HOSTS",
    ENVIRONMENT_PATH: "/environment.json",
    SECURITY_CONTEXT_KEY_SSI: "scKeySSI",
    VAULT_DOMAIN: "vaultDomain",
    DOMAIN: "domain",
    DID_DOMAIN: "didDomain",
    MAIN_APP_DID: "mainAppDID",
    NOTIFICATION_TYPES: {
        ERROR: "error",
        WARN: "warn",
        INFO: "info",
        DEV: "dev"
    },
    MAIN_ENCLAVE: {
        TYPE: "enclaveType",
        DID: "enclaveDID",
        KEY_SSI: "enclaveKeySSI"
    },
    SHARED_ENCLAVE: {
        TYPE: "sharedEnclaveType",
        DID: "sharedEnclaveDID",
        KEY_SSI: "sharedEnclaveKeySSI",
    },
    ENCLAVE_TYPES: {
        WALLET_DB_ENCLAVE: "WalletDBEnclave",
        MEMORY_ENCLAVE: "MemoryEnclave",
        VERSIONLESS_DSU_ENCLAVE: "VersionlessDSUEnclave",
        CLOUD_ENCLAVE: "CloudEnclave",
        LIGHT_DB_ENCLAVE: "LightDBEnclave",
    },
    CACHE: {
        FS: "fs",
        MEMORY: "memory",
        INDEXED_DB: "cache.indexedDB",
        VAULT_TYPE: "cache.vaultType",
        BASE_FOLDER: "internal-volume/cache",
        BASE_FOLDER_CONFIG_PROPERTY: "fsCache.baseFolder",
        ENCRYPTED_BRICKS_CACHE: "encrypted-bricks-cache",
        ANCHORING_CACHE: "anchoring-cache",
        NO_CACHE: "no-cache"
    },
    DOMAINS: {
        VAULT: "vault"
    },
    VAULT: {
        BRICKS_STORE: "bricks",
        ANCHORS_STORE: "anchors"
    },
    BRICKS_DOMAIN_KEY: "bricksDomain",
    LOADER_ENVIRONMENT_JSON: {
        AGENT: "agent",
        SERVER: "server",
        VAULT: "vault",
        MOBILE: "mobile",
    },
    BOOT_CONFIG_FILE: 'boot-cfg.json',
    ERROR_ROOT_CAUSE: {
        UNKNOWN_ERROR: "unknown",
        NETWORK_ERROR: "network",
        THROTTLER_ERROR: "throttler",
        BUSINESS_ERROR: "business",
        DATA_INPUT_ERROR: "dataInput",
        MISSING_DATA_ERROR: "missingData",
        DSU_INVALID_OPERATION: "dsuInvalidOperation",
        SECURITY_ERROR: "security",
        RESOURCE_ERROR: "resource"
    },
    get KEY_SSIS() {
        if (cachedKeySSIResolver === undefined) {
            cachedKeySSIResolver = require("key-ssi-resolver");
        }
        return cachedKeySSIResolver.SSITypes;
    },
    get DSUTypes() {
        if (cachedKeySSIResolver === undefined) {
            cachedKeySSIResolver = require("key-ssi-resolver");
        }
        return cachedKeySSIResolver.DSUTypes;
    },
    get KEY_SSI_FAMILIES() {
        if (cachedKeySSIResolver === undefined) {
            cachedKeySSIResolver = require("key-ssi-resolver");
        }
        return cachedKeySSIResolver.SSIFamilies;
    },
    get CRYPTO_FUNCTION_TYPES() {
        if (cachedKeySSIResolver === undefined) {
            cachedKeySSIResolver = require("key-ssi-resolver");
        }
        return cachedKeySSIResolver.CryptoFunctionTypes;
    }
}



