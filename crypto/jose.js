/**
 * This module provides functions for creating and verifying HMAC JWTs.
 * @module jose
 */

const pskcrypto = require("pskcrypto");


/**
 * Creates a signed HMAC JWT with the provided payload and secret key.
 * @param {Object} payload - The payload to be included in the JWT.
 * @param {string} secretKey - The secret key to sign the JWT with.
 * @returns {Promise} A promise that resolves with the signed JWT.
 */
const createSignedHmacJWT = (payload, secretKey) => {
    if (typeof secretKey === "string") {
        secretKey = $$.Buffer.from(secretKey);
    }
    return new pskcrypto.joseAPI.SignJWT(payload)
        .setProtectedHeader({alg: 'HS256'})
        .sign(secretKey);
}

/**
 * Creates a new HMAC key.
 * @returns {Promise} A promise that resolves with the generated secret key.
 */
const createHmacKey = async () => {
    return await pskcrypto.joseAPI.generateSecret('HS256');
}

/**
 * Verifies and retrieves the payload of an HMAC JWT.
 * @param {string} jwt - The JWT to verify.
 * @param {string} secretKey - The secret key to verify the JWT with.
 */
const verifyAndRetrievePayloadHmacJWT = async (jwt, secretKey) => {
    if (typeof secretKey === "string") {
        secretKey = $$.Buffer.from(secretKey);
    }
    return await pskcrypto.joseAPI.jwtVerify(jwt, secretKey);
}

module.exports = {
    createSignedHmacJWT,
    createHmacKey,
    verifyAndRetrievePayloadHmacJWT
}