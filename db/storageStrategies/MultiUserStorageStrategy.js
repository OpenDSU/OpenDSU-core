
function MultiUserStorageStrategy(){
    let storageDSU;
    let dbName;
    let afterInitialisation;

    this.initialise = function(_storageDSU, _dbName, _onInitialisationDone){
        storageDSU              = _storageDSU;
        afterInitialisation     = _afterInitialisation;
        dbName                  = _dbName;
    }


}
module.exports = MultiUserStorageStrategy;