require("../../../../../builds/output/testsRuntime");
const {getNonEncryptedAndEncryptedDSUTester} = require("./utils");
$$.LEGACY_BEHAVIOUR_ENABLED = true;
const dc = require("double-check");
const {assert} = dc;
const crypto = require("crypto");

assert.callback(
    "VersionlessDSU folders with mounts and unmounts test",
    getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
        const FILE_CONTENT_SIZE = 1024;
        const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);
        const FILE_CONTENT_1 = crypto.randomBytes(FILE_CONTENT_SIZE);

        await dsuTester.callMethod("createFolder", ["/demo", {ignoreMounts: true}]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/demo"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["demo"]);

        await dsuTester.callMethod("writeFile", ["demo.txt", FILE_CONTENT]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/demo"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["demo"]);

        const dsuToMount = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();

        await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

        // create folder to dsuToMount
        await $$.promisify(dsuToMount.createFolder)("/demo2");

        // write file to main DSUs that write into mounted DSU
        await dsuTester.callMethod("writeFile", ["/mount-path/demo2.txt", FILE_CONTENT_1]);
        await dsuTester.callMethod("createFolder", ["/mount-path/demo3"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/", {ignoreMounts: true, recursive: false}]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/", {recursive: false}]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/non-existing"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["non-existing"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/non-existing"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/non-existing"]);

        const dsuToMount2 = await dsuTester.createInnerDSU();
        const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();

        await $$.promisify(dsuToMount.mount)("/inner-mount", dsuKeySSIToMount2);

        await dsuTester.callVersionlessDSUMethod("createFolder", ["/mount-path/inner-mount/demo4"]);
        await dsuTester.callMethod("writeFile", ["/mount-path/inner-mount/demo4.txt", FILE_CONTENT_1]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/", {ignoreMounts: true, recursive: false}]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/", {recursive: false}]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount/non-existing"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/inner-mount/non-existing"]);

        // unmount inner mount
        await $$.promisify(dsuToMount.unmount)("/inner-mount");


        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/inner-mount"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path"]);

        // unmount first mount
        await dsuTester.callMethod("unmount", ["/mount-path"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path/inner-mount"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path/inner-mount"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/mount-path"]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["mount-path"]);

        await dsuTester.callMethodWithResultComparison("listFolders", ["/", {ignoreMounts: true, recursive: false}]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/", {recursive: false}]);
        await dsuTester.callMethodWithResultComparison("listFolders", ["/"]);
        getNonEncryptedAndEncryptedDSUTester(async (dsuTester) => {
            const FILE_CONTENT_SIZE = 1024;
            const FILE_CONTENT = crypto.randomBytes(FILE_CONTENT_SIZE);
            const FILE_CONTENT_1 = crypto.randomBytes(FILE_CONTENT_SIZE);
            const FILE_CONTENT_2 = crypto.randomBytes(FILE_CONTENT_SIZE);

            await dsuTester.callMethod("writeFile", ["demo.txt", FILE_CONTENT]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/", {ignoreMounts: true, recursive: false}]);

            const dsuToMount = await dsuTester.createInnerDSU();
            const dsuKeySSIToMount = await $$.promisify(dsuToMount.getKeySSIAsString)();

            await dsuTester.callMethod("mount", ["/mount-path", dsuKeySSIToMount]);

            // write file to dsuToMount
            await $$.promisify(dsuToMount.writeFile)("demo.txt", FILE_CONTENT_1);

            // write file to main DSUs that write into mounted DSU
            await dsuTester.callMethod("writeFile", ["/mount-path/demo2.txt", FILE_CONTENT_2]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/", {ignoreMounts: true, recursive: false}]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/", {recursive: false}]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

            const dsuToMount2 = await dsuTester.createInnerDSU();
            const dsuKeySSIToMount2 = await $$.promisify(dsuToMount2.getKeySSIAsString)();

            await $$.promisify(dsuToMount.mount)("/inner-mount", dsuKeySSIToMount2);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/", {ignoreMounts: true, recursive: false}]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/", {recursive: false}]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

            // unmount inner mount
            await $$.promisify(dsuToMount.unmount)("/inner-mount");


            await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path/inner-mount"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path/inner-mount"]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

            // unmount first mount
            await dsuTester.callMethod("unmount", ["/mount-path"]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path/inner-mount"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path/inner-mount"]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/mount-path"]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["mount-path"]);

            await dsuTester.callMethodWithResultComparison("listFiles", ["/", {ignoreMounts: true, recursive: false}]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/", {recursive: false}]);
            await dsuTester.callMethodWithResultComparison("listFiles", ["/"]);
        })

    }),
    60000
);

