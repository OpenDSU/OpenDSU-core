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
function updateUser(userId, name, email, phone, publicDescription, secretToken, userDID, isPrivate, callback){

    fsSVDStorage.createTransaction(function (err, transaction){
        transaction.lookup(userId, (err, userSVD) => {
            if(err){
                return callback(err);
            }
            userSVD.update(email, name, email, phone, publicDescription, secretToken, userDID, isPrivate);
            transaction.commit((commitError) => {
                if(commitError){
                    return callback(commitError);
                }
                callback({userId:userId, secretToken:secretToken});
            });

        });
    });
}
function addNewUser(name, email, phone, publicDescription, secretToken, userDID, isPrivate, callback){
    const self = this;
    const crypto = require("opendsu").loadApi("crypto");
    const userSvdUid = "svd:user:" + crypto.getRandomSecret(32);
    fsSVDStorage.createTransaction(function (err, transaction){
        let user = transaction.create(userSvdUid, userSvdUid, name, email, phone, publicDescription, secretToken, userDID, isPrivate);
        self.insertRecord("", "users", userSvdUid, { email: email }, (err) => {
            if (err) {
                return callback(err);
            }
            transaction.commit((commitError) => {
                if(commitError){
                    return callback(commitError);
                }
                callback({userId:userSvdUid, secretToken:secretToken});
            })
        });
    });
}
function getUserSVD(userId,callback){

    fsSVDStorage.createTransaction(function (err, transaction){
        transaction.lookup(userId, (err, userSVD) => {
            if(err){
                return callback(err);
            }
            transaction.commit((commitError) => {
                if(commitError){
                    return callback(commitError);
                }


            });
            callback(userSVD.getState());
        });

    });
}
function getUserIdByEmail(email, callback){
    const self = this;
    self.getAllRecords("", "users", (err, users)=>{
        if(err){
            return callback(err);
        }
        users.forEach((user)=>{
            if(user.email===email){
                return callback({userId:user.pk});
            }

        });
        return callback(`No userId found for email: ${email}`);
    });
}
function addBrandToFollowed(brandId, userId, callback) {

    fsSVDStorage.createTransaction(function (err, transaction){
        transaction.lookup(userId, (err, userSVD) => {
            if(err){
                return callback(err);
            }
            userSVD.addBrandToFollowed(brandId);
            transaction.commit((commitError) => {
                if(commitError){
                    return callback(commitError);
                }
                callback({brandId:brandId});
            });

        });
    });
}

function removeBrandFromFollowed(brandId, userId, callback){

    fsSVDStorage.createTransaction(function (err, transaction){
        transaction.lookup(userId, (err, userSVD) => {
            if(err){
                return callback(err);
            }
            userSVD.removeBrandFromFollowed(brandId);
            transaction.commit((commitError) => {
                if(commitError){
                    return callback(commitError);
                }
                callback({brandId:brandId});
            });

        });
    });
}

module.exports = {
    registerLambdas: async (remoteEnclaveServer) => {
        initSVD(remoteEnclaveServer);
        remoteEnclaveServer.addEnclaveMethod("helloWorld", helloWorld, "read");
        remoteEnclaveServer.addEnclaveMethod("helloWorldWithAudit", helloWorldWithAudit, "read");
        remoteEnclaveServer.addEnclaveMethod("addNewUser", addNewUser, "write");
        remoteEnclaveServer.addEnclaveMethod("updateUser", updateUser, "write");
        remoteEnclaveServer.addEnclaveMethod("getUserIdByEmail", getUserIdByEmail, "read");
        remoteEnclaveServer.addEnclaveMethod("addBrandToFollowed", addBrandToFollowed, "write");
        remoteEnclaveServer.addEnclaveMethod("removeBrandFromFollowed", removeBrandFromFollowed, "write");
        remoteEnclaveServer.addEnclaveMethod("getUserSVD", getUserSVD, "read");
    }
}