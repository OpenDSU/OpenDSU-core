require("../../../../../builds/output/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
assert.begin("LegacyDSU refresh testing", 7000);
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");

const FILEPATH = process.argv[3];
const INITIAL_FILE_CONTENT = process.argv[4];
const NEW_FILE_CONTENT = process.argv[5];

async function modifyLegacyDSU(){
  const keySSI = process.argv[2];
  const dsu = await $$.promisify(resolver.loadDSU)(keySSI);
  await dsu.safeBeginBatchAsync();
  let content = await dsu.readFileAsync(FILEPATH);

  if(content.toString() !== INITIAL_FILE_CONTENT){
    process.exit(1);
  }

  await dsu.writeFileAsync(FILEPATH, NEW_FILE_CONTENT, {});
  await dsu.commitBatchAsync();
  assert.end();
  process.exit(0);
}

modifyLegacyDSU();