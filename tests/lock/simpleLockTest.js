require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

assert.callback('SimpleLockTest', (testFinished) => {
    dc.createTestFolder('SimpleLockTest', async (err, folder) => {
        tir.launchApiHubTestNode(100, folder, async err => {
            if (err) {
                throw err;
            }

            const lock = require("opendsu").loadApi("lock");
            const crypto = require("opendsu").loadApi("crypto")
            const lockID = "123";
            let period = 1000;
            const lockSecret = crypto.encodeBase58(crypto.generateRandom(32));

            let aquiredLock = await lock.lockAsync(lockID, lockSecret, period);

            assert.true(aquiredLock, "Failed to acquire lock");

            let secondAttempt = await lock.lockAsync(lockID, crypto.encodeBase58(crypto.generateRandom(32)), period*10);
            assert.false(secondAttempt, "This should fail. The expected result is false");

            setTimeout(async ()=>{
                let secret = crypto.encodeBase58(crypto.generateRandom(32));
                let attemptToLockAfterExpiration = await lock.lockAsync(lockID, secret, period);
                assert.true(attemptToLockAfterExpiration, "Failed to acquire a lock after previous lock expiration");

                await lock.unlockAsync(lockID, secret);

                let errCaught;
                try{
                    await lock.unlockAsync(lockID, secret);
                }catch(err){
                    errCaught = err;
                }

                assert.true(errCaught.rootCause==="missingData", "we should get an error back if we try to remove a lock that is not there");

                testFinished();
            }, period*2);

        });
    });
}, 100000);