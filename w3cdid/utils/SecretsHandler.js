function SecretsHandler(){

  const opendsu = require("opendsu");
  const w3cdid = opendsu.loadApi("w3cdid");

  const knownDIDs = {};

  let didDocument;
  this.setDIDDocument = async (currentDID)=>{
    didDocument = await $$.promisify(w3cdid.resolveDID)(currentDID);
    return;
  }

  async function base58DID(did){
    const crypto = opendsu.loadApi("crypto");
    let document = await $$.promisify(w3cdid.resolveDID)(did);
    let identifier = document.getIdentifier();
    return crypto.encodeBase58(identifier);
  }

  async function storeSecret(userDID, secret){
    let origin = window.top.location.origin;
    let request = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: secret
    }

    if(typeof request.body !== "string"){
      request.body = JSON.stringify(request.body);
    }
    let encodedDID = await base58DID(userDID);
    return await fetch(`${origin}/putDIDSecret/${encodedDID}/credential`, request);
  }

  async function clearSecret(did){
    let origin = window.top.location.origin;
    let request = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      }
    }
    let encodedDID = await base58DID(did);
    return await fetch(`${origin}/removeDIDSecret/${encodedDID}/credential`, request);
  }

  async function getSecret(did){
    let origin = window.top.location.origin;
    let request = {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    }
    let encodedDID = await base58DID(did);
    return await fetch(`${origin}/getDIDSecret/${encodedDID}/credential`, request).then(result=>{
      if(result.ok){
        return result.json();
      }
      let err = Error("Failed to get secret");
      err.code = result.status;
      throw err;
    });
  }

  this.authorizeUser = async (userDID, groupCredential, enclave) => {
    let secret = {groupCredential, enclave};
    let userDidDocument = await $$.promisify(w3cdid.resolveDID)(userDID);
    let encryptedSecret = await $$.promisify(didDocument.encryptMessage)(userDidDocument, JSON.stringify(secret))
    return await storeSecret(userDID, encryptedSecret);
  }

  this.unAuthorizeUser = async (did) => {
    return await clearSecret(did);
  }

  this.checkIfUserIsAuthorized = async (did) => {
    let secret = await getSecret(did);
    if(secret){
      let userDidDocument;
      if(!knownDIDs[did]){
        userDidDocument = await $$.promisify(w3cdid.resolveDID)(did);
        knownDIDs[did] = userDidDocument;
      }else{
        userDidDocument = knownDIDs[did];
      }

      if(typeof secret !== "object"){
        secret = JSON.parse(secret);
      }
      let decryptedSecret = await $$.promisify(userDidDocument.decryptMessage)(secret);
      let creds = JSON.parse(decryptedSecret);
      return creds;
    }
    return;
  }
}

let instance;
async function getInstance(currentDID){
  if($$.environmentType !== "browser"){
    throw Error("Implementation is meant to be used on browser environment for the moment!");
  }
  if(instance){
    return instance;
  }

  instance = new SecretsHandler();
  await instance.setDIDDocument(currentDID);

  return instance;
}

module.exports = {getInstance};