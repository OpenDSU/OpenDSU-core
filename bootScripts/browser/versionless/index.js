const {getCookie, setCookie} = require("../util/cookies.js");
const opendsu = require("opendsu");
const keyssi = opendsu.loadApi("keyssi");
const resolver = opendsu.loadApi("resolver");
const swarmUtils = require("swarmutils");
const cookieName = "VERSIONLESS_WALLET";
let walletSSI = getCookie(cookieName);
let domain = undefined /*replace with  environment.domain once the versionless persistence fix*/;

if(!walletSSI){
    const path = `/${swarmUtils.generateUid(32).toString('hex')}`;
    let versionLessSSI = keyssi.createVersionlessSSI(domain, path);
    setCookie(cookieName, versionLessSSI.getIdentifier());
    resolver.createDSUForExistingSSI(versionLessSSI, (err, wallet)=>{
        if(err){
            alert(`Not able to create Wallet using the VersionLess DSU. ${err.message}`);
            return;
        }
        window.rawDossier = wallet;

        const enclavePath = `/${swarmUtils.generateUid(32).toString('hex')}`;
        environment.enclaveKeySSI = keyssi.createVersionlessSSI(domain, enclavePath);
        wallet.writeFile("/environment.json", JSON.stringify(environment), (err)=>{
            if(err){
                return alert(`Failed to write environment file in wallet. ${err.message}`);
            }
            console.log("Wallet was initialised");
        });
    });
}else{
    //remove this once the persistence of versionless dsu is fixed
    walletSSI = keyssi.parse(walletSSI).getIdentifier(true).replace("undefined", "");

    resolver.loadDSU(walletSSI, (err, wallet) => {
        if(err){
            alert(`Unable to load Wallet`);
        }
        window.rawDossier = wallet;
    });
}