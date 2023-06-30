require('../../../../../builds/output/testsRuntime');
const tir = require('../../../../../psknode/tests/util/tir');

const dc = require('double-check');
const assert = dc.assert;
const openDSU = require("../../../index");
$$.__registerModule("opendsu", openDSU);
const scAPI = openDSU.loadAPI("sc");

const generateDBRecord = () => {

};

const applyDBOperations = async () => {
    const mainEnclave = await $$.promisify(scAPI.getMainEnclave)();

}

