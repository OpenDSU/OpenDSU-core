const UserProfileSVD = require("../UserProfileSVD");
const {userId} = require("../UserProfileSVD");
let fsSVDStorage;
function initSVD(remoteEnclaveServer) {
    const fastSVD = require("opendsu").loadApi("svd");
    fsSVDStorage = fastSVD.createFsSVDStorage("./SVDS");
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
function updateUser(userId, name, email, phone, publicDescription, isPrivate, callback){
    const self = this;

    fsSVDStorage.createTransaction(function (err, transaction){
        transaction.lookup(userId, (err, userSVD) => {
            if(err){
                return callback(err);
            }
            //const user = $$.promisify(self.getRecord)("", "users", userId);

               if(err){
                   return callback(err);
               }
               userSVD.update(email, name, email, phone, publicDescription, isPrivate);
               if(userSVD.email!==email){
                   self.deleteRecord("", "users", userId, (err) => {
                       if (err) {
                           return callback(err);
                       }
                       const userSvdUid = "svd:user:" + crypto.generateRandom(32);
                       self.insertRecord("", "users", userSvdUid, { user: email }, (err) => {
                           if (err) {
                               return callback(err);
                           }
                           transaction.commit((commitError) => {
                               console.log("@@Commit error", commitError);
                               callback(commitError, userSvdUid);
                           });
                       });
                   });
               }else {
                   transaction.commit((commitError) => {
                       console.log("@@Commit error", commitError);
                       callback(commitError, {userId:userId});
                   });
               }
        });
    });
}
function addNewUser(name, email, phone, publicDescription, isPrivate, callback){
    const self = this;
    const crypto = require("opendsu").loadApi("crypto");
    const userSvdUid = "svd:user:" + crypto.generateRandom(32).toString("hex");
    fsSVDStorage.createTransaction(function (err, transaction){
        let user = transaction.create(userSvdUid, userSvdUid, name, email, phone, publicDescription, isPrivate);
        self.insertRecord("", "users", userSvdUid, { userId: userSvdUid }, (err) => {
            if (!err) {
                transaction.commit((commitError) => {
                    console.log("@@Commit error", commitError);
                    callback(commitError, {userId:userSvdUid});
                })
            }
            else {
                callback(err);
            }
        });
    });
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
        initSVD(remoteEnclaveServer);
        remoteEnclaveServer.addEnclaveMethod("helloWorld", helloWorld, "read");
        remoteEnclaveServer.addEnclaveMethod("helloWorldWithAudit", helloWorldWithAudit, "read");
        remoteEnclaveServer.addEnclaveMethod("addNewUser", addNewUser, "write");
        remoteEnclaveServer.addEnclaveMethod("updateUser", updateUser, "write");
        remoteEnclaveServer.addEnclaveMethod("addBrandToFollowed", addBrandToFollowed, "write");
        remoteEnclaveServer.addEnclaveMethod("removeBrandFromFollowed", removeBrandFromFollowed, "write");
    }
}