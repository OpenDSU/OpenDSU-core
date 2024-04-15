require('../../../../builds/output/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');
assert.callback('Build array SSI test', (callback) => {
    const arraySSI = keySSISpace.createArraySSI('default', ['openDsu', 16], 'vn0');

    const vn = arraySSI.getVn();
    const type = arraySSI.getTypeName();
    const DLDomain = arraySSI.getDLDomain();

    assert.true(vn === 'vn0', 'Invalid vn0 property');
    assert.true(type === 'array', 'Invalid seed property');
    assert.true(DLDomain === 'default', 'Invalid domain property');

    callback();
});

assert.callback('Pass non-array object check', (callback) => {
    try {
        keySSISpace.createArraySSI('default', 12, 'vn0');
    } catch (err) {
        console.log(err);
        callback();
        return;
    }
    callback();
});
