const UserProfileSVD = require("../UserProfileSVD");
let fsSVDStorage;
function initSVD() {
    const fastSVD = require("opendsu").loadApi("svd");
    fsSVDStorage = fastSVD.createFsSVDStorage("./SVDS/");
    fsSVDStorage.registerType("user", UserProfileSVD);


}
function helloWorld (...args) {
    const callback = args.pop();
    callback(undefined, args);
}

function helloWorldWithAudit (...args) {
    const callback = args.pop();
    this.audit(...args);
    callback(undefined, args);
}
function addNewUser(shadowUserId, name, email, phone, publicDescription, isPrivate, callback){
    const self = this;
    if(email){
        fsSVDStorage.createTransaction(function (err, transaction){
            transaction.lookup(shadowUserId, (err, shadowUser) => {
                if(err){
                    return callback(err);
                }
                shadowUser.update(email, name, email, phone, publicDescription, isPrivate);
                transaction.commit((commitError) => {
                    console.log("@@Commit error", commitError);
                    return callback(commitError);
                });
            });

        });
    }else {
        const userSvdUid = "svd:user:user" + Math.floor(Math.random() * 100000);
        fsSVDStorage.createTransaction(function (err, transaction){
            let user = transaction.create(userSvdUid, userSvdUid, "", "", "", "", "");
            self.insertRecord("", "users", userSvdUid, { user: user.read() }, (err, res) => {
                if (!err) {
                    transaction.commit((commitError) => {
                        console.log("@@Commit error", commitError);
                        callback(commitError, res);
                    })
                }
                else {
                    callback(err);
                }
            });
        });
    }
}

function addBrandToFollowed(brandId, userId, callback) {
    const self = this;
    const user=self.getRecord("users", userId, callback);
    if(user){
        user.addBrandToFollowed(brandId);
    }
}

function removeBrandFromFollowed(brandId, userId, callback){
    const self = this;
    const user=self.getRecord("users", userId, callback);
    if(user){
        user.removeBrandFromFollowed(brandId);
    }
}

module.exports = {
    registerLambdas: async (remoteEnclaveServer) => {
        initSVD();
        remoteEnclaveServer.addEnclaveMethod("helloWorld", helloWorld, "read");
        remoteEnclaveServer.addEnclaveMethod("helloWorldWithAudit", helloWorldWithAudit, "read");
        remoteEnclaveServer.addEnclaveMethod("addNewUser", addNewUser, "write");
        remoteEnclaveServer.addEnclaveMethod("addBrandToFollowed", addBrandToFollowed, "write");
        remoteEnclaveServer.addEnclaveMethod("removeBrandFromFollowed", removeBrandFromFollowed, "write");
    }
}