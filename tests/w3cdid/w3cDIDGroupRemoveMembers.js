require("../../../../builds/output/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
assert.callback('key DID SSI test', (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{name: "vault", config: vaultDomainConfig}],
            rootFolder: folder
        });
        let error;
        sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const ids = ["first", "second", "third"];
                const didDocuments = [];
                const groupDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:group", domain, "group_name")
                for (let i = 0; i < ids.length; i++) {
                    const didDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, ids[i])
                    didDocuments.push(didDocument);
                    await $$.promisify(groupDIDDocument.addMember)(didDocument.getIdentifier());
                }

                await $$.promisify(groupDIDDocument.removeMember)(didDocuments[1].getIdentifier());
                const members = await $$.promisify(groupDIDDocument.listMembersByIdentity)();
                assert.arraysMatch(members, ['did:ssi:name:default:first', 'did:ssi:name:default:third']);
            } catch (e) {
                error = e;
            }
            assert.true(typeof error === "undefined")
            testFinished();
        });
    });
}, 500000);

