function setSSAppContext() {
    const baseUrl = typeof document !== "undefined" ? (document.getElementsByTagName("base")[0] || {}).href : undefined;
    let seed;
    if (baseUrl && baseUrl.indexOf("/cloud-wallet/") !== -1) {
        seed = baseUrl.substr(baseUrl.indexOf("/cloud-wallet/") + "/cloud-wallet/".length);
        const seedMatch = seed.match(/^([\w\d]*).*$/);
        seed = seedMatch ? seedMatch[1] : null;

        if (seed) {
            // check if seed is actually a SSI
            const pskcrypto = require("pskcrypto");
            const decodedValue = pskcrypto.pskBase58Decode(seed);
            const isValidSeed = decodedValue && (decodedValue.toString() || "").indexOf("ssi") === 0;
            if (!isValidSeed) {
                seed = null;
            }
        }
    }

    $$.SSAPP_CONTEXT = {
        BASE_URL: baseUrl,
        SEED: seed,
    };
}

setSSAppContext();