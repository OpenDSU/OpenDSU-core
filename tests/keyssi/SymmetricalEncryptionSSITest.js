require('../../../../builds/output/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');

assert.callback('Test SymmetricalEncryptionSSI ', (callback) => {
    const seSSI = keySSISpace.buildSymmetricalEncryptionSSI('default', 'encryptionKey', 'control', 'vn');
    const type = seSSI.getTypeName();
    const DLDomain = seSSI.getDLDomain();

    assert.true(type === 'se', 'Invalid seed property');
    assert.true(DLDomain === 'default', 'Invalid domain property');

    callback();
});
