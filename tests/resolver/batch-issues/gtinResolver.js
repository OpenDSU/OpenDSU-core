gtinResolverRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\builds\\tmp\\gtinResolver_intermediar.js":[function(require,module,exports){
(function (global){(function (){
global.gtinResolverLoadModules = function(){ 

	if(typeof $$.__runtimeModules["gtin-resolver"] === "undefined"){
		$$.__runtimeModules["gtin-resolver"] = require("gtin-resolver");
	}

	if(typeof $$.__runtimeModules["psk-dbf"] === "undefined"){
		$$.__runtimeModules["psk-dbf"] = require("gtin-resolver/modules/psk-dbf");
	}
};
if (true) {
	gtinResolverLoadModules();
}
global.gtinResolverRequire = require;
if (typeof $$ !== "undefined") {
	$$.requireBundle("gtinResolver");
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"gtin-resolver":"gtin-resolver","gtin-resolver/modules/psk-dbf":"gtin-resolver/modules/psk-dbf"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\DSUFabricFeatureManager.js":[function(require,module,exports){
const openDSU = require("opendsu");
const config = openDSU.loadAPI("config");

async function getDisabledFeatures() {
  let disabledFeaturesArr = [];
  try {
    let disabledFeaturesList = await $$.promisify(config.getEnv)("disabledFeatures");
    if (disabledFeaturesList) {
      let disabledCodesArr = disabledFeaturesList.split(",");
      disabledCodesArr.forEach(item => {
        disabledFeaturesArr.push(item.trim());
      })
    }
  } catch (e) {
    console.log("Couldn't load disabledFeatures")
  }
  return disabledFeaturesArr;
}
async function getEpiProtocolVersion() {
  let defaultVersion = "v1";
  let epiProtocolVersion = await $$.promisify(config.getEnv)("epiProtocolVersion");
  return epiProtocolVersion || defaultVersion;
}

module.exports = {
  getDisabledFeatures
}

},{"opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\EpiVersionTransformer.js":[function(require,module,exports){
const epiProtocolVersionMap = {
  "v1": {
    ROOT_PATH_TO_PRODUCT_DSU: "/product",
    ROOT_PATH_TO_BATCH_DSU: "/batch",
  }
}

function getVersionMap(epiProtocolVersion) {
  if (!epiProtocolVersionMap[`v${epiProtocolVersion}`]) {
    throw new Error(`No mapping found for version ${epiProtocolVersion}`);
    return;
  }
  return epiProtocolVersionMap[`v${epiProtocolVersion}`];
}

function getProductPath(epiProtocolVersion) {
  let versionMap = getVersionMap(epiProtocolVersion);
  return `${versionMap["ROOT_PATH_TO_PRODUCT_DSU"]}/product.epi_v${epiProtocolVersion}`;
}

function getProductImagePath(epiProtocolVersion) {
  let versionMap = getVersionMap(epiProtocolVersion);
  return `${versionMap["ROOT_PATH_TO_PRODUCT_DSU"]}/image.png`;
}


function getBatchPath(epiProtocolVersion) {
  let versionMap = getVersionMap(epiProtocolVersion);
  return `${versionMap["ROOT_PATH_TO_BATCH_DSU"]}/batch.epi_v${epiProtocolVersion}`;
}

module.exports = {
  getVersionMap,
  getProductPath,
  getProductImagePath,
  getBatchPath
}

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_DSU_Factory.js":[function(require,module,exports){
function GTIN_DSU_Factory(resolver) {
    this.create = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        options.dsuFactoryType = "const";
        resolver.createDSU(keySSI, options, callback);
    };


    this.load = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        options.dsuFactoryType = "const";
        resolver.loadDSU(keySSI, options, callback);
    };
}

module.exports = GTIN_DSU_Factory;

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_SSI.js":[function(require,module,exports){
const openDSU = require("opendsu");
const keyssiSpace = openDSU.loadApi("keyssi");

function GTIN_SSI(arraySSI) {
    const self = this;
    /*arraySSI.getTypeName = () => {
        return SSITypes.WALLET_SSI;
    };*/

    Object.assign(self, arraySSI);

    // this.getIdentifier = (plain) => {
    //     const pskCrypto = require("pskcrypto");
    //     let identifier = arraySSI.getIdentifier(true);
    //     // identifier = identifier.replace("array", "gtin");
    //     return plain ? identifier : pskCrypto.pskBase58Encode(identifier);
    // }
}

function setOptions(gtinSSI){
    if(typeof gtinSSI.options === "undefined"){
        gtinSSI.options = {};
    }
    gtinSSI.options.dsuFactoryType = "const";
}

function createGTIN_SSI(domain, bricksDomain, gtin, batch, expiration, serialNumber) {
    console.log(`New GTIN_SSI in domain:${domain} and bricksDomain:${bricksDomain}`);
    let hint = {avoidRandom : true};
    if (typeof bricksDomain !== "undefined") {
        hint[openDSU.constants.BRICKS_DOMAIN_KEY] = bricksDomain;
    }
    hint = JSON.stringify(hint);
    let realSSI = keyssiSpace.createArraySSI(domain, [gtin, batch], 'v0', hint);

    return realSSI;
}

function parseGTIN_SSI(ssiIdentifier) {
    /*const pskCrypto = require("pskcrypto");
    ssiIdentifier = pskCrypto.pskBase58Decode(ssiIdentifier).toString();
    ssiIdentifier = ssiIdentifier.replace("gtin", "array");
    ssiIdentifier = pskCrypto.pskBase58Encode(ssiIdentifier).toString();
    let realSSI = keyssiSpace.parse(ssiIdentifier);
    let gtinSSI = new GTIN_SSI(realSSI);
    setOptions(gtinSSI);
    return gtinSSI;*/
    return keyssiSpace.parse(ssiIdentifier);
}

module.exports = {
    createGTIN_SSI,
    parseGTIN_SSI
};
},{"opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\LeafletFeatureManager.js":[function(require,module,exports){
const openDSU = require("opendsu");
const config = openDSU.loadAPI("config");

async function getLeafletDisabledFeatures() {
  let disabledFeaturesArr = [];
  try {
    let disabledFeaturesList = await $$.promisify(config.getEnv)("disabledFeatures");
    if (disabledFeaturesList) {
      let disabledCodesArr = disabledFeaturesList.split(",");
      disabledCodesArr.forEach(item => {
        disabledFeaturesArr.push(item.trim());
      })
    }
  } catch (e) {
    console.log("Couldn't load disabledFeatures")
  }
  return disabledFeaturesArr;
}

async function getEpiProtocolVersion() {
  let defaultVersion = "1";
  let epiProtocolVersion = await $$.promisify(config.getEnv)("epiProtocolVersion");
  if (epiProtocolVersion && epiProtocolVersion !== "undefined") {
    return epiProtocolVersion
  }
  return defaultVersion;
}

module.exports = {
  getLeafletDisabledFeatures,
  getEpiProtocolVersion
}

},{"opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\apihubMappingEngineMessageResults\\index.js":[function(require,module,exports){
(function (Buffer){(function (){
const fs = require('fs');
const path = require('path');
const constants = require("../constants/constants");
const MESSAGE_SEPARATOR = "#$%/N";
function getEPIMappingEngineMessageResults(server) {
  const MESSAGES_PATH =path.join(server.rootFolder, "external-volume", "messages")

  function getLogs(msgParam, domain, callback) {
    const LOGS_FOLDER = path.join(MESSAGES_PATH, domain);
    const LOGS_FILE = path.join(LOGS_FOLDER, constants.LOGS_TABLE);
    let result;
    fs.access(LOGS_FILE, fs.F_OK, (err) => {
      if (err) {
        return callback(`No logs found for domain -  ${domain}`);
      }

      fs.readFile(LOGS_FILE, 'utf8', (err, result) => {
        if (err) {
          return callback(e);
        }
        let messages = result.split(MESSAGE_SEPARATOR)
        if (messages[messages.length - 1] === "") {
          messages.pop();
        }
        messages = messages.map(msg => {
          return JSON.parse(msg)
        });
        return callback(null, messages.reverse());
      })

    })

  }

  server.put("/mappingEngine/:domain/:subdomain/saveResult", function (request, response) {
    let msgDomain = request.params.domain;
    let data = [];
    request.on('data', (chunk) => {
      data.push(chunk);
    });

    request.on('end', async () => {

      try {
        let body = Buffer.concat(data).toString();

        const fileDir = path.join(MESSAGES_PATH, msgDomain);
        const logsFile = path.join(fileDir, constants.LOGS_TABLE);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, {recursive: true});
        }

        fs.appendFile(logsFile, body + MESSAGE_SEPARATOR, (err) => {
          if (err) {
            throw err;
            return;
          }
          response.statusCode = 200
          response.end();
        });

      } catch (e) {
        response.statusCode = 500;
        response.end();
      }
    });
  })

  server.get("/mappingEngine/:domain/logs", function (request, response) {

    let domainName = request.params.domain;
    let msgParam = request.params.messageParam;
    console.log(`EPI Mapping Engine get called for domain:  ${domainName}`);

    try {
      getLogs(msgParam, domainName, (err, logs) => {
        if (err) {
          console.log(err);
          response.statusCode = 500;
          response.end(JSON.stringify({result: "Error", message: "No logs"}));
          return;
        }
        if (!logs || logs.length === 0) {
          logs = "Log list is empty";
        }
        response.statusCode = 200;
        response.end(JSON.stringify(logs));
      });

    } catch (err) {
      console.error(err);
      response.statusCode = 500;
      response.end(JSON.stringify({result: "Error", error: err}));
    }

  });
}

module.exports.getEPIMappingEngineMessageResults = getEPIMappingEngineMessageResults;

}).call(this)}).call(this,require("buffer").Buffer)

},{"../constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","buffer":false,"fs":false,"path":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\apihubMappingEngine\\index.js":[function(require,module,exports){
(function (Buffer,__dirname){(function (){
const errUtils = require("../mappings/errors/errorUtils.js");
errUtils.addMappingError("TOKEN_VALIDATION_FAIL");
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
const customErr = errMap.newCustomError(errMap.errorTypes.TOKEN_VALIDATION_FAIL, "token");

function getEPIMappingEngineForAPIHUB(server) {
  const gtinResolverBundle = "./../../../gtin-resolver/build/bundles/gtinResolver.js";
  require(gtinResolverBundle);
  const workerController = new WorkerController(server.rootFolder);
  workerController.boot((err) => {
    if (err) {
      console.log(err);
    }
  })

  function putMessage(request, response) {
    const apiHub = require("apihub");
    let domainName = request.params.domain;
    let subdomainName = request.params.subdomain;
    let walletSSI = request.headers.token;

    console.log(`EPI Mapping Engine called for domain:  ${domainName}, and walletSSI : ${walletSSI}`);

    let data = [];
    request.on('data', (chunk) => {
      data.push(chunk);
    });

    request.on('end', async () => {

      try {
        let body = Buffer.concat(data).toString();
        let messages = JSON.parse(body);
        if (!Array.isArray(messages)) {
          messages = [messages]
        }
        let domainConfig = apiHub.getDomainConfig(domainName);
        let subdomain = domainConfig && domainConfig.bricksDomain ? domainConfig.bricksDomain : subdomainName;

        if (!subdomain) {
          throw new Error(`Missing subdomain. Must be provided in url or set in configuration`);
        }

        /*if (!walletSSI) {
          if (!domainConfig) {
            throw new Error(`Domain configuration ${domain} not found`);
          }

          //token should be in request header or in domain configuration or in the message body
          if (!domainConfig.mappingEngineWalletSSI) {
            if (!messages[0].token) {
              let err = new Error(`mappingEngineWalletSSI is not set in the domain with name ${domain} configuration and no token provided in header or message`);
              err.debug_message = "Invalid credentials";
              throw err;
            } else {
              walletSSI = messages[0].token
            }

          }
        }

        walletSSI = walletSSI || domainConfig.mappingEngineWalletSSI;
*/
        let {
          walletGroupMap,
          droppedMessages
        } = workerController.groupByWallet(messages, walletSSI, domainConfig, domainName, subdomain);
        try {
          let groups = Object.keys(walletGroupMap);
          if (groups.length === 0) {
            let err = new Error(`token not set in body or header or in domain config`);
            err.debug_message = "Invalid credentials";
            throw err;
          }
          for (let i = 0; i < groups.length; i++) {
            await workerController.addMessages(groups[i], domainName, subdomain, walletGroupMap[groups[i]], droppedMessages);
          }

        } catch (err) {
          console.log(err);
          err.debug_message === "Invalid credentials" ? response.statusCode = 403 : response.statusCode = 500;
          response.write(err.message);
          return response.end();
        }

        response.statusCode = 200;
        if (droppedMessages.length > 0) {
          response.write(JSON.stringify({droppedMessages, reason: "Invalid or missing token"}));
          let messagesToPersist = workerController.getResponseTemplates(droppedMessages);
          let errInfo = customErr.otherErrors.details[0];
          messagesToPersist.forEach(msg => {
            msg.addErrorResponse(errInfo.errorType, errInfo.errorMessage, errInfo.errorDetails, errInfo.errorField);
          })
          await workerController.persistMessageResults(messagesToPersist);
        }
        response.end();
      } catch (err) {
        console.error("Error on parse request message", err);
        err.debug_message === "Invalid credentials" ? response.statusCode = 403 : response.statusCode = 500;
        response.write(err.message);
        response.end();
      }
    })

  }

  server.put("/mappingEngine/:domain", putMessage);
  server.put("/mappingEngine/:domain/:subdomain", putMessage);

}

function WorkerController(rootFolder) {
  //dependencies
  const gtinResolver = require("gtin-resolver");
  const openDSU = require("opendsu");
  const getBaseUrl = openDSU.loadApi("system").getBaseURL;
  const path = require("path");
  const fs = require("fs");
  const Database = require("loki-enclave-facade");

  //constants
  const MAX_NUMBER_OF_MESSAGES = 50;
  const MAX_GROUP_SIZE = 10;
  const GROUPING_TIMEOUT = 5 * 1000;
  const ENCLAVE_FOLDER = path.join(rootFolder, "external-volume", "enclaves");
  const DATABASE_PERSISTENCE_TIMEOUT = 100;

  //state variables
  const walletIsBeingProcessed = {};
  const messagesPipe = {};
  const databases = {};
  const getDatabase = (walletSSI) => {
    if (typeof databases[walletSSI] === "undefined") {
      databases[walletSSI] = new Database(path.join(ENCLAVE_FOLDER, walletSSI), DATABASE_PERSISTENCE_TIMEOUT);
    }
    return databases[walletSSI];
  }

  function getMessageEndPoint(message) {
    const apiHub = require("apihub");
    let {domain, subdomain} = message.context;
    let domainConfig = apiHub.getDomainConfig(domain);

    let mappingEnginResultURL = domainConfig.mappingEnginResultURL || `${getBaseUrl()}/mappingEngine/${domain}/${subdomain}/saveResult`;
    if (message.senderId && domainConfig.mappingEnginResultURLs && Array.isArray(domainConfig.mappingEnginResultURLs)) {
      let endpointObj = domainConfig.mappingEnginResultURLs.find(item => item["endPointId"] === message.senderId);
      if (endpointObj) {
        mappingEnginResultURL = endpointObj.endPointURL;
      }
    }

    return mappingEnginResultURL;
  }

  this.getResponseTemplates = (messages) => {
    const gtinResolver = require("gtin-resolver");
    const mappings = gtinResolver.loadApi("mappings");
    return messages.map(msg => {
      let response = mappings.buildResponse(0.2);
      response.setReceiverId(msg.senderId);
      response.setSenderId(msg.receiverId);
      response.setMessageType(msg.messageType);
      response.setRequestData(msg);
      response.endPoint = getMessageEndPoint(msg);
      return response;
    });
  }

  this.persistMessageResults = async (messagesToPersist) => {
    const httpSpace = require("opendsu").loadApi('http');
    for (let item of messagesToPersist) {
      try {
        await $$.promisify(httpSpace.doPut)(item.endPoint, JSON.stringify(item));
      } catch (err) {
        console.log(`Could not persist message: ${item} with error ${err}`);
      }
    }
  }
  let self = this;

  async function logUndigestedMessages(groupMessages, walletSSI, response) {
    let undigestedMessages = response.undigestedMessages;
    let messagesToPersist = self.getResponseTemplates(groupMessages);
    const gtinResolver = require("gtin-resolver");
    const mappings = gtinResolver.loadApi("mappings");
    let LogService = gtinResolver.loadApi("services").LogService;
    let logService = new LogService();
    let sharedEnclave = await getSharedEnclaveForWallet(walletSSI);
    let mappingLogService = mappings.getMappingLogsInstance(sharedEnclave, logService);
    const anchoring = openDSU.loadAPI("anchoring");
    const anchoringx = anchoring.getAnchoringX();
    try {
      for (let i = 0; i < messagesToPersist.length; i++) {
        let itemToPersist = messagesToPersist[i];
        let index = undigestedMessages.findIndex(uMsg => {
          if (typeof uMsg === "string") {
            uMsg = JSON.parse(uMsg);
          }
          return uMsg.message.messageId === itemToPersist.requestMessageId;
        })

        if (index >= 0) {
          let undigestedMessage = undigestedMessages[index];
          let errorStatus = undigestedMessage.error.debug_message || null;
          if (undigestedMessage.error && undigestedMessage.error.otherErrors && undigestedMessage.error.otherErrors.details.length) {
            mappingLogService.logFailAction(undigestedMessage.message, undigestedMessage.error.otherErrors.details, errorStatus)
            undigestedMessage.error.otherErrors.details.forEach((element, index) => {
              itemToPersist.addErrorResponse(element.errorType, element.errorMessage, element.errorDetails, element.errorField);
            })
          } else {
            mappingLogService.logFailAction(undigestedMessage.message, undigestedMessage.error, errorStatus)
          }
        }
      }

    } catch (e) {
      console.log(e);
    }
    await self.persistMessageResults(messagesToPersist);
  }

  const getMessagePipe = (walletSSI) => {
    if (typeof messagesPipe[walletSSI] === "undefined") {
      const MessagesPipe = gtinResolver.getMessagesPipe();
      const MessageQueuingService = gtinResolver.loadApi("services").getMessageQueuingServiceInstance();
      messagesPipe[walletSSI] = new MessagesPipe(MAX_GROUP_SIZE, GROUPING_TIMEOUT, MessageQueuingService.getNextMessagesBlock);
    }

    return messagesPipe[walletSSI];
  }

  const getMessagesFromDb = (walletSSI, callback) => {
    const db = getDatabase(walletSSI);
    db.listQueue("", walletSSI, "asc", MAX_NUMBER_OF_MESSAGES, async (err, dbMessages) => {
      if (err) {
        return callback(err);
      }

      if (!dbMessages || dbMessages.length === 0) {
        return callback(undefined, []);
      }
      let messages = [];
      for (let i = 0; i < dbMessages.length; i++) {
        const message = await $$.promisify(db.getObjectFromQueue)("", walletSSI, dbMessages[i]);
        messages.push(message);
      }

      callback(undefined, messages);
    });
  }

  const deleteProcessedMessagesFromDb = async (walletSSI, messages) => {
    const db = getDatabase(walletSSI);
    for (let i = 0; i < messages.length; i++) {
      await $$.promisify(db.deleteObjectFromQueue)("", walletSSI, messages[i].pk)
    }
  };

  const dispatchMessagesToWorker = async (walletSSI, messages) => {
    const syndicate = require("syndicate");
    const pool = syndicate.createWorkerPool({
      bootScript: require("path").join(__dirname, "./threadBootscript.js")
    })

    const task = {
      walletSSI,
      messages,
    }

    walletIsBeingProcessed[walletSSI] = true;
    let response = await $$.promisify(pool.addTask, pool)(JSON.stringify(task));
    response = JSON.parse(response);
    walletIsBeingProcessed[walletSSI] = false;
    return response;
  }

  const processWalletMessages = (walletSSI, callback) => {
    if (walletIsBeingProcessed[walletSSI]) {
      return callback();
    }

    getMessagesFromDb(walletSSI, async (err, messages) => {
      if (err) {
        return callback(err);
      }

      if (messages.length === 0) {
        return callback();
      }

      const messagePipe = getMessagePipe(walletSSI);
      messagePipe.addInQueue(messages);
      let noGroupMessages = 0;
      messagePipe.onNewGroup(async (groupMessages) => {
        noGroupMessages += groupMessages.length;
        try {
          const response = await dispatchMessagesToWorker(walletSSI, groupMessages);
          await deleteProcessedMessagesFromDb(walletSSI, groupMessages);
          await logUndigestedMessages(groupMessages, walletSSI, response);
        } catch (e) {
          return callback(e);
        }

        if (noGroupMessages === messages.length) {
          processWalletMessages(walletSSI, callback);
        }
      })
    })
  }

  async function getSharedEnclaveForWallet(walletSSI) {
    const resolver = require("opendsu").loadAPI("resolver");
    let wallet = await $$.promisify(resolver.loadDSU)(walletSSI);
    const scAPI = openDSU.loadApi("sc");
    scAPI.setMainDSU(wallet);
    let sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
    return sharedEnclave;
  }

  this.boot = (callback) => {
    const __processWallets = () => {
      fs.readdir(ENCLAVE_FOLDER, async (err, files) => {
        if (err) {
          return callback(err);
        }

        if (files.length === 0) {
          return callback();
        }

        for (let i = 0; i < files.length; i++) {
          const walletSSI = files[i];
          await $$.promisify(processWalletMessages)(walletSSI);
        }
        callback();
      })
    }

    fs.access(ENCLAVE_FOLDER, async err => {
      if (err) {
        fs.mkdir(ENCLAVE_FOLDER, {recursive: true}, async err => {
          if (err) {
            return callback(err);
          }

          __processWallets();
        });

        return
      }

      __processWallets();
    })
  }

  let addMessageToMap = (walletGroupMap, message, token) => {
    if (!walletGroupMap[token]) {
      walletGroupMap[token] = [];
    }
    walletGroupMap[token].push(message)
  }

  this.groupByWallet = (messages, headerToken, domainConfig, domain, subdomain) => {
    let walletGroupMap = {};
    let droppedMessages = []
    messages.forEach(message => {
      if (message.token) {
        addMessageToMap(walletGroupMap, message, message.token)
      } else if (headerToken) {
        addMessageToMap(walletGroupMap, message, headerToken)
      } else if (domainConfig && domainConfig.mappingEngineWalletSSI) {
        addMessageToMap(walletGroupMap, message, domainConfig.mappingEngineWalletSSI)
      } else {
        message.context = {
          domain,
          subdomain
        };
        droppedMessages.push(message)
      }
    })
    return {walletGroupMap, droppedMessages}
  }

  this.addMessages = async (walletSSI, domain, subdomain, messages, droppedMessages) => {
    try {
      const resolver = require("opendsu").loadAPI("resolver");
      await $$.promisify(resolver.loadDSU)(walletSSI);
    } catch (e) {
      droppedMessages.push(messages)
      return;
    }

    const db = getDatabase(walletSSI);

    for (let i = 0; i < messages.length; i++) {
      let message = messages[i];
      message.context = {
        domain,
        subdomain
      };
      await $$.promisify(db.addInQueue)("", walletSSI, message);
    }

    $$.promisify(processWalletMessages)(walletSSI);
  }
}

module.exports.getEPIMappingEngineForAPIHUB = getEPIMappingEngineForAPIHUB;

}).call(this)}).call(this,require("buffer").Buffer,"/lib/apihubMappingEngine")

},{"../mappings/errors/errorUtils.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorUtils.js","apihub":false,"buffer":false,"fs":false,"gtin-resolver":"gtin-resolver","loki-enclave-facade":false,"opendsu":false,"path":false,"syndicate":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js":[function(require,module,exports){
module.exports = {
  VALID_SERIAL_NUMBER_TYPE: "valid",
  RECALLED_SERIAL_NUMBER_TYPE: "recalled",
  DECOMMISSIONED_SERIAL_NUMBER_TYPE: "decommissioned",
  PACKAGES_STORAGE_PATH: "/app/data/packages.json",
  LANGUAGES_STORAGE_PATH: "/app/data/languages.json",
  DATA_STORAGE_PATH: "/app/data",
  PRODUCTS_TABLE: "products",
  LOGS_TABLE: "logs",
  SERIAL_NUMBERS_LOGS_TABLE: "serial_numbers_logs",
  PRODUCT_KEYSSI_STORAGE_TABLE: "productKeySSIs",
  BATCHES_STORAGE_TABLE: "batches",
  EPI_PROTOCOL_VERSION: "v1",
  PRODUCT_DSU_MOUNT_POINT: "/product",
  BATCH_DSU_MOUNT_POINT: "/batch",
  BATCH_STORAGE_FILE: "/batch.epi_v",
  PRODUCT_STORAGE_FILE: "/product.epi_v",
  PRODUCT_IMAGE_FILE: "/image.png",
  HISTORY_ITEM_DEFAULT_ICON: "./assets/icons/product_image_placeholder.svg",
  LEAFLET_ATTACHMENT_FILE: "/leaflet.xml",
  SMPC_ATTACHMENT_FILE: "/smpc.xml",
  XSL_PATH: "./leaflet.xsl",
  IMPORT_LOGS: "import-logs",
  SUCCESS_MAPPING_STATUS: "success",
  FAILED_MAPPING_STATUS: "failed",
  MISSING_PRODUCT_DSU: "Missing Product DSU",
  DSU_LOAD_FAIL: "Something went wrong. Could not load DSU",
  MISSING_BATCH_DSU: "Missing Batch DSU",
  MISSING_PRODUCT_VERSION: "Missing Product Version",
  ANCHOR_CHECK_TIMEOUT: 15000,
  MESSAGE_TYPES: {
    PRODUCT: "Product",
    BATCH: "Batch",
    PRODUCT_PHOTO: "ProductPhoto",
    LEAFLET: "leaflet",
    SMPC: "smpc",
    VIDEO_SOURCE: "VideoSource"
  },
  LOG_TYPES: {
    PRODUCT: "PRODUCT_LOG",
    BATCH: "BATCH_LOG",
    PRODUCT_PHOTO: "PRODUCT_PHOTO_LOG",
    LEAFLET_LOG: "LEAFLET_LOG",
    VIDEO_SOURCE: "VIDEO_LOG",
    FAILED_ACTION: "FAILED_LOG"
  },
  DISABLED_FEATURES_MAP: {
    "01": {
      modelProperties: ["patientLeafletInfo"],
      description: "Patient leaflet"
    },
    "02": {
      modelProperties: ["incorrectDateCheck", "expiredDateCheck"],
      description: "Batch date validation checks"
    },
    "04": {
      modelProperties: ["practitionerInfo"],
      description: "Healthcare practitioner info"
    },
    "05": {
      modelProperties: ["videos"],
      description: "Video source"
    },
    "06": {
      modelProperties: ["adverseEventsReportingEnabled"],
      description: "Adverse Events reporting"
    },
    "07": {
      modelProperties: ["hasAcdcAuthFeature", "authFeatureFieldModel", "serialCheck"],
      description: "Anti-counterfeiting functions"
    },
    "08": {
      modelProperties: ["recalled"],
      description: "Recall functions"
    },
    "09": {
      modelProperties: ["defaultMessage"],
      description: "Batch message"
    }
  }
}

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\gtinOwner\\index.js":[function(require,module,exports){
const GTIN_SSI = require("../GTIN_SSI");

function getGTINOwner(server) {
  const logger = $$.getLogger("gtinOwner", "getGtinOwner");
  server.get("/gtinOwner/:epiDomain/:gtin", async function (request, response) {
    let epiDomain = request.params.epiDomain;
    let gtin = request.params.gtin;

    const openDSU = require("opendsu");

    const gtinSSI = GTIN_SSI.createGTIN_SSI(epiDomain, undefined, gtin);
    const anchoring = openDSU.loadAPI("anchoring");
    const anchoringx = anchoring.getAnchoringX();
    anchoringx.getLastVersion(gtinSSI, (err, latestHashLink) => {
      if (err) {
        logger.info(0x103, `Failed to get last version for SSI <${gtinSSI.getIdentifier()}>`, err.message);
        sendResponse(response, 500, JSON.stringify({error: err}));
        return;
      }
      const keySSISpace = require("opendsu").loadAPI("keyssi");
      if (typeof latestHashLink === "string") {
        try {
          latestHashLink = keySSISpace.parse(latestHashLink);
        } catch (e) {
          logger.info(0x103, `Failed to parse hashlink <${latestHashLink}>`, e.message);
          sendResponse(response, 500, JSON.stringify({error: e}))
          return;
        }
      }
      sendResponse(response, 200, JSON.stringify({
        domain: latestHashLink.getDLDomain()
      }));
    })
  })
}

function sendResponse(response, statusCode, message) {
  response.statusCode = statusCode;
  response.end(message);
}

module.exports.getGTINOwner = getGTINOwner;

},{"../GTIN_SSI":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_SSI.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\leaflet-web-api\\index.js":[function(require,module,exports){
const XMLDisplayService = require("./../services/XMLDisplayService/XMLDisplayService");
const LeafletInfoService = require("./../services/LeafletInfoService");

function getWebLeaflet(server) {

  server.registerAccessControlAllowHeaders(["epiprotocolversion"]);

  const logger = $$.getLogger("leaflet-web-api", "getWebLeaflet");
  server.get("/leaflets/:domain", async function (request, response) {

    let domainName = request.params.domain;
    let leaflet_type = request.query.leaflet_type || "";
    let gtin = request.query.gtin || null;
    let lang = request.query.lang || "";
    let batchNumber = request.query.batch || null;
    let expiry = request.query.expiry || null;
    let headers = request.headers;
    let epiProtocolVersion = headers.epiprotocolversion || null;

    try {
      if (!gtin) {
        logger.info(0x103, `Missing required parameter <gtin>`)
        return sendResponse(response, 400, "gtin is a required parameter. Please check api documentation")
      }
      if (!leaflet_type) {
        logger.info(0x103, `Missing required parameter <leaflet_type>`)
        return sendResponse(response, 400, "leaflet_type is a required parameter. Please check api documentation")
      }
      if (!lang) {
        logger.info(0x103, `Missing required parameter <lang>`)
        return sendResponse(response, 400, "lang is a required parameter. Please check api documentation")
      }
      let leafletInfo = await LeafletInfoService.init({gtin, batchNumber, expiry}, domainName);
      const model = {
        product: {gtin},
        networkName: domainName
      }
      let leafletXmlService = new XMLDisplayService(null, leafletInfo.gtinSSI, model, leaflet_type);
      leafletXmlService.readXmlFile(lang, async (err, xmlContent, pathBase, leafletImagesObj) => {
        if (err) {
          let errMessage = `No available XML for gtin=${gtin} language=${lang} leaflet type=${leaflet_type}`
          if (batchNumber) {
            errMessage = `${errMessage} batchNumber id=${batchNumber}`
          }

          leafletXmlService.getAvailableLanguagesForXmlType((langerr, availableLanguages) => {
            if (langerr) {
                logger.info(0x103, errMessage)
              return sendResponse(response, 404, `${errMessage}. Please check api documentation`)
            }
            return sendResponse(response, 200, JSON.stringify({
              resultStatus: "no_xml_for_lang",
              availableLanguages: availableLanguages
            }));
          });
        } else {
          let productData = await leafletInfo.getProductClientModel();
          try {
            let batchData = await leafletInfo.getBatchClientModel();
            productData.batchData = batchData;
          } catch (e) {
            // gtin only case
            productData.batchData = null;
          }
          logger.audit(0x101, "Successfully returned leaflet");
          return sendResponse(response, 200, JSON.stringify({
            resultStatus: "xml_found",
            xmlContent,
            leafletImages: leafletImagesObj,
            productData
          }));
        }
      })
    } catch (err) {
      logger.info(0x103, err.message);
      sendResponse(response, 500, err.message);
    }
  });
}


function sendResponse(response, statusCode, message) {
  response.statusCode = statusCode;
  response.end(message);
}

module.exports.getWebLeaflet = getWebLeaflet;

},{"./../services/LeafletInfoService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\LeafletInfoService.js","./../services/XMLDisplayService/XMLDisplayService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\XMLDisplayService\\XMLDisplayService.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batch.js":[function(require,module,exports){
const utils = require("../../utils/CommonUtils");
const validationUtils = require("../../utils/ValidationUtils");
const constants = require("../../constants/constants.js");
const batchUtils = require("./batchUtils");
const ModelMessageService = require('../../services/ModelMessageService');
const logUtils = require("../../utils/LogUtils");
const schema = require("./batchSchema");
const dbUtils = require("../../utils/DBUtils");
const productUtils = require("../product/productUtils");

function verifyIfBatchMessage(message) {
  return message.messageType === "Batch";
}

async function processBatchMessage(message) {

  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);

  await validationUtils.validateMessageOnSchema.call(this, message, schema);
  validationUtils.validateMVP1Values.call(this, message, "batch");
  const batchId = message.batch.batch;
  const productCode = message.batch.productCode;

  const {
    batchDSU,
    alreadyExists,
    gtinSSI
  } = await batchUtils.getBatchDSU.call(this, message, productCode, batchId, true);

  let batchMetadata = await batchUtils.getBatchMetadata.call(this, message, utils.getBatchMetadataPK(productCode, batchId), alreadyExists);

  /*
* extension of the file will contain epi version. Used format is epi_+epiVersion;
* Ex: for version 1 - batch.epi_v1
*  */
  const indication = {batch: `${constants.BATCH_STORAGE_FILE}${message.messageTypeVersion}`};

  await this.loadJSONS(batchDSU, indication);

  if (typeof this.batch === "undefined") {
    this.batch = JSON.parse(JSON.stringify(batchMetadata));
  }

  let modelMsgService = new ModelMessageService("batch");
  //this line is similar to Object.assign, we try to get all the props from the message and assign to our batch model
  this.batch = {...this.batch, ...modelMsgService.getModelFromMessage(message.batch)};

  let {productDSU} = await productUtils.getProductDSU.call(this, message, productCode);

  const productIndication = {product: `${constants.PRODUCT_STORAGE_FILE}${message.messageTypeVersion}`};

  await this.loadJSONS(productDSU, productIndication);

  this.batch.productName = this.product.name;
  this.batch.productDescription = this.product.description;

  let diffs = this.mappingLogService.getDiffsForAudit(modelMsgService.getMessageFromModel(this.batch), alreadyExists ? modelMsgService.getMessageFromModel(batchMetadata) : null);

  if (this.batch.creationTime) {
    this.batch.creationTime = utils.convertDateTOGMTFormat(new Date());
  }

  this.batch.messageTime = message.messageDateTime;

  if (!this.batch.bloomFilterSerialisations) {
    this.batch.bloomFilterSerialisations = [];
  }

  manageSerialNumbers(this.batch);

  this.batch.version = batchMetadata.version ? batchMetadata.version + 1 : 1;
  const batchClone = JSON.parse(JSON.stringify(this.batch));

  //we delete the arrays because they contain sensitive serial numbers, and we don't want them stored in "clear" in DSU.
  delete this.batch.serialNumbers;
  delete this.batch.recalledSerialNumbers;
  delete this.batch.decommissionedSerialNumbers;

  this.batch.epiProtocol = `v${message.messageTypeVersion}`;

  await this.saveJSONS(batchDSU, indication);
  let logData = await this.mappingLogService.logSuccessAction(message, this.batch, alreadyExists, diffs, batchDSU);

  //from this line all the modifications will be only in sharedDB and not DSU

  // this.batch.keySSI = await batchDSU.getKeySSIAsString();

  this.batch.consKeySSI = gtinSSI;
  batchClone.keySSI = this.batch.keySSI;

  await dbUtils.createOrUpdateRecord(this.storageService, logData, batchClone);
}

function removeAllBloomFiltersOfType(bfList, type) {
  return bfList.filter((bfObj) => bfObj.type !== type);
}

function manageSerialNumbers(batch) {

  if (batch.snValidReset) {
    batch.bloomFilterSerialisations = removeAllBloomFiltersOfType(batch.bloomFilterSerialisations, constants.VALID_SERIAL_NUMBER_TYPE)
    batch.defaultSerialNumber = "";
    batch.snValidReset = false;
  }

  if (batch.snRecalledReset) {
    batch.bloomFilterSerialisations = removeAllBloomFiltersOfType(batch.bloomFilterSerialisations, constants.RECALLED_SERIAL_NUMBER_TYPE)
    batch.defaultRecalledSerialNumber = "";
    batch.snRecalledReset = false;
  }

  if (batch.snDecomReset) {
    batch.bloomFilterSerialisations = removeAllBloomFiltersOfType(batch.bloomFilterSerialisations, constants.DECOMMISSIONED_SERIAL_NUMBER_TYPE)
    batch.defaultDecommissionedSerialNumber = "";
    batch.snDecomReset = false;
  }

  let bf;
  if (batch.serialNumbers && batch.serialNumbers.length > 0) {
    bf = utils.getBloomFilterSerialisation(batch.serialNumbers);
    // batch.bloomFilterSerialisations.push(bf.bloomFilterSerialisation());
    batch.bloomFilterSerialisations.push({
      serialisation: bf.bloomFilterSerialisation(),
      type: constants.VALID_SERIAL_NUMBER_TYPE
    });
    batch.defaultSerialNumber = batch.serialNumbers[0];
  }

  if (batch.recalledSerialNumbers && batch.recalledSerialNumbers.length > 0) {
    bf = utils.getBloomFilterSerialisation(batch.recalledSerialNumbers);
    // batch.bloomFilterRecalledSerialisations.push(bf.bloomFilterSerialisation());
    batch.bloomFilterSerialisations.push({
      serialisation: bf.bloomFilterSerialisation(),
      type: constants.RECALLED_SERIAL_NUMBER_TYPE
    });
    batch.defaultRecalledSerialNumber = batch.recalledSerialNumbers[0];
  }
  if (batch.decommissionedSerialNumbers && batch.decommissionedSerialNumbers.length > 0) {
    bf = utils.getBloomFilterSerialisation(batch.decommissionedSerialNumbers);
    // batch.bloomFilterDecommissionedSerialisations.push(bf.bloomFilterSerialisation());
    batch.bloomFilterSerialisations.push({
      serialisation: bf.bloomFilterSerialisation(),
      type: constants.DECOMMISSIONED_SERIAL_NUMBER_TYPE
    });
    batch.defaultDecommissionedSerialNumber = batch.decommissionedSerialNumbers[0];
  }
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfBatchMessage, processBatchMessage);

},{"../../constants/constants.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../../services/ModelMessageService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\ModelMessageService.js","../../utils/CommonUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","../../utils/DBUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\DBUtils.js","../../utils/LogUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js","../../utils/ValidationUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js","../product/productUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productUtils.js","./batchSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batchSchema.js","./batchUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batchUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batchSchema.js":[function(require,module,exports){
const messageHeaderSchema = require("./../messageHeaderSchema");
let batchSchema = {
  "type": "object",
  "properties":
    {
      "batch": {
        "type": "object", "required": true,
        "properties": {
          "productCode": {"type": "string", "required": true},
          "batch": {
            "type": "string", "required": true, regex: /^[A-Za-z0-9]{1,20}$/
          },
          "expiryDate": {"type": "batchDate", "required": true},
          "packagingSiteName": {"type": "string"},
          "epiLeafletVersion": {"type": "number"},
          "flagEnableEXPVerification": {"type": "boolean"},
          "flagEnableExpiredEXPCheck": {"type": "boolean"},
          "batchMessage": {"type": "string"},
          "flagEnableBatchRecallMessage": {"type": "boolean"},
          "recallMessage": {"type": "string"},
          "flagEnableACFBatchCheck": {"type": "boolean"},
          "acfBatchCheckURL": {"type": "string"},
          "flagEnableSNVerification": {"type": "boolean"},
          // ACDC PATCH START
          "acdcAuthFeatureSSI": {"type": "string"},
          // ACDC PATCH END
          "snValidReset": {"type": "boolean"},
          "snValid": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      }
    }
}
batchSchema.properties = {...messageHeaderSchema, ...batchSchema.properties};
module.exports = batchSchema

},{"./../messageHeaderSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\messageHeaderSchema.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batchUtils.js":[function(require,module,exports){
const constants = require("../../constants/constants.js");
const GTIN_SSI = require("../../GTIN_SSI");
const productUtils = require("../product/productUtils");
const errUtils = require("../errors/errorUtils");
errUtils.addMappingError("BATCH_DSU_LOAD_FAIL");
errUtils.addMappingError("BATCH_MISSING_PRODUCT");
errUtils.addMappingError("EXISTING_BATCH_ID");
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

async function getBatchDSURecovery(message, productCode, batchId, create) {

  let seedSSI = await this.createPathSSI(this.options.holderInfo.subdomain, `0/${productCode}/${batchId}`);
  let sreadSSI = await $$.promisify(seedSSI.derive)();

  async function recoveryBatchConstDSU (dsu, callback){
    let error;

    try{
      await $$.promisify(dsu.mount)(constants.BATCH_DSU_MOUNT_POINT, sreadSSI.getIdentifier());
    }catch(err){
      error = err;
    }

    callback(error, dsu);
  }

  return new Promise((resolve, reject)=>{
    const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode, batchId);
    this.recoverDSU(gtinSSI, recoveryBatchConstDSU, async(err, batchConstDSU)=>{
      if(err){
        return reject(err);
      }

      let batchDSU = await $$.promisify(this.recoverDSU)(sreadSSI, (dsu, callback)=>{
        dsu.writeFile("/recovered", new Date().toISOString(), {embed: true}, (err)=>{
          if(err){
            return callback(err);
          }
          return callback(undefined, dsu);
        });
      });

      resolve( {batchConstDSU: batchConstDSU,
          batchDSU: batchDSU,
          alreadyExists: true,
          gtinSSI: gtinSSI});
    });
  });
}

async function getBatchDSU(message, productCode, batchId, create = false) {

  if(message.force){
    return await getBatchDSURecovery.call(this, message, productCode, batchId, create);
  }

  let err;
  let productDSUObj;

  try {
    productDSUObj = await productUtils.getProductDSU.call(this, message, productCode);
  } catch (e) {
    throw errMap.newCustomError(errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL, "productCode");
  }

  if (!productDSUObj) {
    let errorMessage = err && err.message ? err.message : constants.DSU_LOAD_FAIL
    throw errMap.newCustomError(errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL, "productCode");
  }

  const {constDSU, productDSU} = productDSUObj;

  const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode, batchId);
  const {dsu: batchConstDSU, alreadyExists: batchExists} = await this.loadConstSSIDSU(gtinSSI);
  let batchDSU;

  if (!batchExists) {
    batchDSU = await this.createPathSSIDSU(this.options.holderInfo.subdomain, `0/${productCode}/${batchId}`);
    let sreadSSI = await batchDSU.getKeySSIAsString("sread");
    await batchConstDSU.mount(constants.BATCH_DSU_MOUNT_POINT, sreadSSI);
  } else {
    try {
      let getSSIForMount = $$.promisify(batchConstDSU.getSSIForMount, batchConstDSU);
      //we read the ssi from the mounting point instead of the sharedDB. is more reliable
      let ssi = await getSSIForMount(constants.BATCH_DSU_MOUNT_POINT);
      batchDSU = await this.loadDSU(ssi);
    } catch (err) {
      throw errMap.newCustomError(errMap.errorTypes.BATCH_DSU_LOAD_FAIL, "batchId");
    }
  }

  return {
    batchConstDSU: batchConstDSU,
    batchDSU: batchDSU,
    alreadyExists: batchExists,
    gtinSSI: gtinSSI
  };
}

async function getBatchMetadata(message, batchId, shouldExist = true) {
  let metadata = {};
  try {
    metadata = await $$.promisify(this.storageService.getRecord, this.storageService)(constants.BATCHES_STORAGE_TABLE, batchId);
/*    if (!shouldExist && metadata) {
      throw errMap.newCustomError(errMap.errorTypes.EXISTING_BATCH_ID, "batch");
    }*/

  } catch (e) {
    if (shouldExist) {
      if(message.force){
        try{
          await $$.promisify(this.storageService.insertRecord, this.storageService)(constants.PRODUCTS_TABLE, batchId, message);
        }catch (e) {
          throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
        }
      }else {
        throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
      }
    }
  }
  return metadata;
}

module.exports = {
  getBatchDSU,
  getBatchMetadata
}

},{"../../GTIN_SSI":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_SSI.js","../../constants/constants.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../errors/errorUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorUtils.js","../product/productUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorMap.js":[function(require,module,exports){
module.exports = {
  PRODUCT_DSU_LOAD_FAIL: {errCode: 7, errMsg: "Failed to load product DSU"},
  BATCH_MISSING_PRODUCT: {errCode: 8, errMsg: "Fail to create a batch for a missing product"},
  BATCH_DSU_LOAD_FAIL: {errCode: 9, errMsg: "Failed to load batch DSU"},
  PHOTO_MISSING_PRODUCT: {errCode: 10, errMsg: "Fail to create a product photo for a missing product"},
  VIDEO_SOURCE_MISSING_PRODUCT: {errCode: 11, errMsg: "Fail to add video source for missing batch or missing product"},
  GTIN_VALIDATION_FAIL: {errCode: 12, errMsg: "Failed to validate gtin"},
  DSU_MOUNT_FAIL: {errCode: 13, errMsg: "Failed to mount in DSU"},
  UNSUPPORTED_FILE_FORMAT: {errCode: 14, errMsg: "Upload of unsupported file format"},
  TOKEN_VALIDATION_FAIL: {errCode: 15, errMsg: "Invalid or missing token"},
  WRITING_FILE_FAILED: {errCode: 16, errMsg: "Failed to write file into DSU"},
  FILE_CONTAINS_FORBIDDEN_TAGS: {errCode: 17, errMsg: "File contains forbidden html tags"},
  EXISTING_BATCH_ID: {errCode: 19, errMsg: "Fail to create a batch. Batch number is already used for other product"},
  MVP1_RESTRICTED: {errCode: 20, errMsg: "Message is MVP1 restricted."}
}

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorUtils.js":[function(require,module,exports){
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
const mappingErrorsMap = require("./errorMap");

function addMappingError(errorKey, detailsFn) {
  if (!errMap.errorTypes[errorKey]) {
    errMap.addNewErrorType(errorKey, mappingErrorsMap[errorKey].errCode, mappingErrorsMap[errorKey].errMsg, detailsFn);
  }
}

module.exports = {
  addMappingError
}

},{"./errorMap":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorMap.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\index.js":[function(require,module,exports){
//loading EPI necessary mappings
require("./product/product.js");
require("./batch/batch.js");
require("./product/productPhoto.js");
require("./product-video/videoSource.js");
require("./leaflet/leaflet.js");
require("./leaflet/leafletDelete.js");

module.exports.getEPIMappingEngine = function (options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }
  const openDSU = require("opendsu");
  const scAPI = openDSU.loadAPI("sc");
  scAPI.getSharedEnclave((err, sharedEnclave) => {
    if (err) {
      return callback(err);
    }
    const mappingEngine = openDSU.loadApi("m2dsu").getMappingEngine(sharedEnclave, options);
    callback(undefined, mappingEngine);
  })
}

// module.exports.utils = require("./utils.js");
module.exports.getMappingLogs = function (storageService) {
  return require("../utils/LogUtils").createInstance(storageService).getMappingLogs;
}
module.exports.getMappingLogsInstance = function (storageService, logService) {
  return require("../utils/LogUtils").createInstance(storageService, logService);
}

module.exports.buildResponse = function (version) {
  return require("./responses").buildResponse(version);
}

},{"../utils/LogUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js","./batch/batch.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batch.js","./leaflet/leaflet.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leaflet.js","./leaflet/leafletDelete.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletDelete.js","./product-video/videoSource.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product-video\\videoSource.js","./product/product.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\product.js","./product/productPhoto.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productPhoto.js","./responses":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\responses\\index.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leaflet.js":[function(require,module,exports){
function verifyIfLeafletMessage(message) {
  return ["leaflet", "smpc"].includes(message.messageType)
    && Object.keys(message).some(key => ['productCode', 'batchCode'].includes(key))
    && (message.action === "add" || message.action === "update")
}

const acceptedFileExtensions = ["xml", "apng", "avif", "gif", "jpg", "jpeg", "jfif", "pjpeg", "pjp", "png", "svg", "webp", "bmp", "ico", "cur"];

async function processLeafletMessage(message) {
  const schema = require("./leafletSchema");
  const validationUtils = require("../../utils/ValidationUtils");
  const leafletUtils = require("./leafletUtils");
  const logUtils = require("../../utils/LogUtils");
  const utils = require("../utils");
  const errorUtils = require("../errors/errorUtils");
  const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

  const {sanitize} = require("../../utils/htmlSanitize");
  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);

  await validationUtils.validateMessageOnSchema.call(this, message, schema);
  if (message.messageType === "smpc") {
    errorUtils.addMappingError("MVP1_RESTRICTED");
    throw errMap.newCustomError(errMap.errorTypes.MVP1_RESTRICTED, "smpc");
    return;
  }

  message.otherFilesContent.forEach(fileObj => {
    const splitFileName = fileObj.filename.split(".");
    const fileExtension = splitFileName[splitFileName.length - 1];
    const index = acceptedFileExtensions.findIndex(acceptedExtension => acceptedExtension === fileExtension);
    if (index === -1) {
      errorUtils.addMappingError("UNSUPPORTED_FILE_FORMAT");
      throw errMap.newCustomError(errMap.errorTypes.UNSUPPORTED_FILE_FORMAT, message.messageType);
    }
    try {
      fileObj.fileContent = sanitize(fileObj.fileContent);
    } catch (e) {
      errorUtils.addMappingError("FILE_CONTAINS_FORBIDDEN_TAGS");
      throw errMap.newCustomError(errMap.errorTypes.FILE_CONTAINS_FORBIDDEN_TAGS, message.messageType);
    }
  });

  let language = message.language;
  let type = message.messageType

  let basePath = leafletUtils.getLeafletDirPath(type, language);
  let xmlFilePath = leafletUtils.getLeafletPath(type, language);
  let base64ToArrayBuffer = require("../../utils/CommonUtils").base64ToArrayBuffer;


  let base64XMLFileContent = message.xmlFileContent;
  try {
    base64XMLFileContent = sanitize(base64XMLFileContent);
  } catch (e) {
    errorUtils.addMappingError("FILE_CONTAINS_FORBIDDEN_TAGS");
    throw errMap.newCustomError(errMap.errorTypes.FILE_CONTAINS_FORBIDDEN_TAGS, message.messageType);
  }

  let arrayBufferXMLFileContent = base64ToArrayBuffer(base64XMLFileContent);

  const {hostDSU, hostMetadata} = await leafletUtils.getHostDSUData.call(this, message);


  try {

    if (message.action === "update") {
      await hostDSU.delete(basePath, {ignoreError: true});
    }

    await hostDSU.writeFile(xmlFilePath, $$.Buffer.from(arrayBufferXMLFileContent));

    for (let i = 0; i < message.otherFilesContent.length; i++) {
      let file = message.otherFilesContent[i];
      let filePath = `${basePath}/${file.filename}`;
      await hostDSU.writeFile(filePath, $$.Buffer.from(base64ToArrayBuffer(file.fileContent)));
    }
    let languages = await $$.promisify(hostDSU.listFolders)(`/${type}`);

    let diffs = {
      type: message.messageType,
      language: message.language,
      action: message.action
    };

    let logData = await this.mappingLogService.logSuccessAction(message, hostMetadata, true, diffs, hostDSU);
    await utils.increaseVersion(this, message);
  } catch (e) {
    console.log("Leaflet Mapping failed because of", e);

    const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
    const errorUtils = require("../errors/errorUtils");
    errorUtils.addMappingError("WRITING_FILE_FAILED");
    throw errMap.newCustomError(errMap.errorTypes.WRITING_FILE_FAILED, message.messageType);
  }
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfLeafletMessage, processLeafletMessage);

},{"../../utils/CommonUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","../../utils/LogUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js","../../utils/ValidationUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js","../../utils/htmlSanitize":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\htmlSanitize.js","../errors/errorUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorUtils.js","../utils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\utils.js","./leafletSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletSchema.js","./leafletUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletDelete.js":[function(require,module,exports){
function verifyIfDeleteLeafletMessage(message) {
  return ["leaflet", "smpc"].includes(message.messageType) && Object.keys(message).some(key => ['productCode', 'batchCode'].includes(key)) && message.action === "delete"
}

async function processDeleteLeafletMessage(message) {
  const schema = require("./leafletDeleteSchema");
  const validationUtils = require("../../utils/ValidationUtils");
  const leafletUtils = require("./leafletUtils");
  const logUtils = require("../../utils/LogUtils");
  const utils = require("../utils");
  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);

  await validationUtils.validateMessageOnSchema.call(this, message, schema);


  let language = message.language;
  let type = message.messageType;
  let leafletDir = leafletUtils.getLeafletDirPath(type, language);

  const {hostDSU, hostMetadata} = await leafletUtils.getHostDSUData.call(this, message);
  let diffs = {"type": type, "language": language, "action": "deleted"};
  try {
    await hostDSU.delete(leafletDir, {ignoreError: true});
  } catch (e) {
    console.log(e);
  }

  let logData = await this.mappingLogService.logSuccessAction(message, hostMetadata, true, diffs, hostDSU);
  await utils.increaseVersion(this, message);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfDeleteLeafletMessage, processDeleteLeafletMessage);

},{"../../utils/LogUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js","../../utils/ValidationUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js","../utils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\utils.js","./leafletDeleteSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletDeleteSchema.js","./leafletUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletDeleteSchema.js":[function(require,module,exports){
const Languages = require("../../utils/Languages");

const messageHeaderSchema = require("./../messageHeaderSchema");
let leafletDeleteSchema = {
  "type": "object",
  "properties":
    {
      "action": {"type": "string", "required": true, regex: /^delete$/},
      "language": {
        "type": "string",
        "required": true,
        regex: Languages.getLanguageRegex()
      },
      "productCode": {"type": "string", "required": true}

    }
}
leafletDeleteSchema.properties = {...messageHeaderSchema, ...leafletDeleteSchema.properties};
module.exports = leafletDeleteSchema;

},{"../../utils/Languages":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\Languages.js","./../messageHeaderSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\messageHeaderSchema.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletSchema.js":[function(require,module,exports){
const Languages = require("../../utils/Languages");

const messageHeaderSchema = require("./../messageHeaderSchema");
let leafletSchema = {
  "type": "object",
  "properties":
    {
      "action": {"type": "string", "required": true, regex: /^(add|update)$/},
      "language": {
        "type": "string",
        "required": true,
        regex: Languages.getLanguageRegex()
      },
      "productCode": {"type": "string", "required": true},
      "xmlFileContent": {"type": "string", "required": true},
      "otherFilesContent": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "filename": {
              "type": "string",
              "required": true
            },
            "fileContent": {
              "type": "string",
              "required": true
            },
          }
        }
      }
    }
}
leafletSchema.properties = {...messageHeaderSchema, ...leafletSchema.properties};
module.exports = leafletSchema

},{"../../utils/Languages":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\Languages.js","./../messageHeaderSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\messageHeaderSchema.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletUtils.js":[function(require,module,exports){
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
const utils = require("../../utils/CommonUtils.js");

function getLeafletDirPath(type, language) {
  return `/${type}/${language}`;
}

function getLeafletPath(type, language) {
  return `${getLeafletDirPath(type, language)}/${type}.xml`;
}

module.exports = {
  getLeafletPath, getLeafletDirPath,
  getHostDSUData: async function (message) {
    let hostDSU;
    let errorType;
    let errorDetails;
    let hostMetadata;

    try {
      if (message.batchCode) {
        errorType = errMap.errorTypes.BATCH_DSU_LOAD_FAIL;
        errorDetails = `for batch ${message.batchCode}`;
        hostDSU = (await require("../batch/batchUtils").getBatchDSU.call(this, message, message.productCode, message.batchCode)).batchDSU;
        hostMetadata = await require("../batch/batchUtils").getBatchMetadata.call(this, message, utils.getBatchMetadataPK(message.productCode, message.batchCode), true);

      } else {
        errorType = errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL;
        errorDetails = `for productCode ${message.productCode}`;
        hostDSU = (await require("../product/productUtils").getProductDSU.call(this, message, message.productCode)).productDSU;
        hostMetadata = await require("../product/productUtils").getProductMetadata.call(this, message, message.productCode, true);


      }
    } catch (err) {
      throw errMap.newCustomError(errorType, errorDetails);
    }

    return {hostDSU, hostMetadata}
  }

}

},{"../../utils/CommonUtils.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","../batch/batchUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batchUtils.js","../product/productUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\messageHeaderSchema.js":[function(require,module,exports){
module.exports = {
  "messageType": {"type": "string"},
  "messageTypeVersion": {"type": "number", regex: /^1$/},
  "senderId": {"type": "string"},
  "receiverId": {"type": "string"},
  "messageId": {"type": "string"},
  "messageDateTime": {"type": "string"}
}

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product-video\\videoSchema.js":[function(require,module,exports){
const messageHeaderSchema = require("./../messageHeaderSchema");
let videoSchema = {
  "type": "object",
  "properties":
    {
      "videos": {
        "type": "object", "required": true,
        "properties": {
          "productCode": {"type": "string", "required": true},
          "source": {"type": "string", "required": false},
          "batch": {"type": "string", "required": false},
          "sources": {
            "type": "array", "required": false,
            "items": {
              "type": "object",
              "properties": {
                "documentType": {"type": "string"},
                "lang": {"type": "string"},
                "source": {"type": "string"}
              }
            }
          }
        }
      }
    }
}
videoSchema.properties = {...messageHeaderSchema, ...videoSchema.properties}
module.exports = videoSchema

},{"./../messageHeaderSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\messageHeaderSchema.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product-video\\videoSource.js":[function(require,module,exports){
const dbUtils = require("../../utils/DBUtils");
const utils = require("../../utils/CommonUtils.js");
const productUtils = require("../product/productUtils");
const batchUtils = require("../batch/batchUtils");

function verifyIfVideoMessage(message) {
  return message.messageType === "VideoSource";
}

async function processVideoMessage(message) {
  const schema = require("./videoSchema");
  const validationUtils = require("../../utils/ValidationUtils");
  const productUtils = require("../product/productUtils");
  const constants = require("../../constants/constants.js");
  const errorUtils = require("../errors/errorUtils");
  errorUtils.addMappingError("VIDEO_SOURCE_MISSING_PRODUCT");
  const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();
  this.mappingLogService = require("../../utils/LogUtils").createInstance(this.storageService, this.options.logService);

  await validationUtils.validateMessageOnSchema.call(this, message, schema);
  validationUtils.validateMVP1Values.call(this, message, "videos");

  const productCode = message.videos.productCode;

  try {
    if (message.videos.batch) {
      //batch id means its saved on batch
      const batchId = message.videos.batch;

      let batchMetadata = await batchUtils.getBatchMetadata.call(this, message, utils.getBatchMetadataPK(productCode, batchId));
      let {batchDSU} = await batchUtils.getBatchDSU.call(this, message, productCode, batchId);
      const indication = {batch: `${constants.BATCH_STORAGE_FILE}${message.messageTypeVersion}`};

      await this.loadJSONS(batchDSU, indication);
      if (typeof this.batch === "undefined") {
        this.batch = JSON.parse(JSON.stringify(batchMetadata));
      }

      prepareVideoSources(this.batch, message);

      await this.saveJSONS(batchDSU, indication);
      let diffs = this.mappingLogService.getDiffsForAudit(this.batch, batchMetadata);
      this.batch.keySSI = await batchDSU.getKeySSIAsString();
      let logData = await this.mappingLogService.logSuccessAction(message, this.batch, true, diffs, batchDSU);
      await dbUtils.createOrUpdateRecord(this.storageService, logData, this.batch);

    } else {
      //it's saved on product

      const {productDSU, alreadyExists} = await productUtils.getProductDSU.call(this, message, productCode);
      let productMetadata;

      const indication = {product: `${constants.PRODUCT_STORAGE_FILE}${message.messageTypeVersion}`};
      await this.loadJSONS(productDSU, indication);

      if (typeof this.product === "undefined") {
        productMetadata = await productUtils.getProductMetadata.call(this, message, productCode, alreadyExists);
        this.product = JSON.parse(JSON.stringify(productMetadata));
      }

      prepareVideoSources(this.product, message);

      await this.saveJSONS(productDSU, indication);

      let diffs = this.mappingLogService.getDiffsForAudit(this.product, productMetadata);
      //this save may generate strange behavior....
      this.product.keySSI = await productDSU.getKeySSIAsString();

      let logData = await this.mappingLogService.logSuccessAction(message, this.product, true, diffs, productDSU);
      await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);
    }
  } catch (err) {
    throw errMap.newCustomError(errMap.errorTypes.VIDEO_SOURCE_MISSING_PRODUCT, "productCode");
  }

}

function prepareVideoSources(sourceObject, message) {
  if (!sourceObject.videos) {
    sourceObject.videos = {}
  }

  if (message.videos.sources) {
    sourceObject.videos = {
      defaultSource: sourceObject.videos.defaultSource
    }
    message.videos.sources.forEach(docSource => {
      let key = `${docSource.documentType}/${docSource.lang}`
      sourceObject.videos[key] = docSource.source;
    })
  }

  if (typeof message.videos.source !== "undefined") {
    sourceObject.videos.defaultSource = message.videos.source;
  }
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfVideoMessage, processVideoMessage);

},{"../../constants/constants.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../../utils/CommonUtils.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","../../utils/DBUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\DBUtils.js","../../utils/LogUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js","../../utils/ValidationUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js","../batch/batchUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batchUtils.js","../errors/errorUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorUtils.js","../product/productUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productUtils.js","./videoSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product-video\\videoSchema.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\product.js":[function(require,module,exports){
function verifyIfProductMessage(message) {
  return message.messageType === "Product";
}

async function processProductMessage(message) {
  const constants = require("../../constants/constants");
  const validationUtils = require("../../utils/ValidationUtils");
  const logUtils = require("../../utils/LogUtils");
  const ModelMessageService = require('../../services/ModelMessageService');
  const schema = require("./productSchema");
  const productUtils = require("./productUtils");
  const dbUtils = require("../../utils/DBUtils");
  this.mappingLogService = logUtils.createInstance(this.storageService, this.options.logService);

  await validationUtils.validateMessageOnSchema.call(this, message, schema);
  validationUtils.validateMVP1Values.call(this, message, "product");
  await productUtils.validateGTIN.call(this, message);

  const productCode = message.product.productCode;

  const {
    constDSU,
    productDSU,
    alreadyExists
  } = await productUtils.getProductDSU.call(this, message, productCode, true);

  let productMetadata = await productUtils.getProductMetadata.call(this, message, productCode, alreadyExists);

  /*
  * extension of the file will contain epi version. Used format is epi_+epiVersion;
  * Ex: for version 1 - product.epi_v1
  *  */
  const indication = {product: `${constants.PRODUCT_STORAGE_FILE}${message.messageTypeVersion}`};
  await this.loadJSONS(productDSU, indication);

  if (typeof this.product === "undefined") {
    this.product = JSON.parse(JSON.stringify(productMetadata));
  }

  let modelMsgService = new ModelMessageService("product");
  this.product = {...this.product, ...modelMsgService.getModelFromMessage(message.product)};
  this.product.version = productMetadata.version ? productMetadata.version + 1 : 1;
  this.product.epiProtocol = `v${message.messageTypeVersion}`;

  await this.saveJSONS(productDSU, indication);

  let diffs = this.mappingLogService.getDiffsForAudit(modelMsgService.getMessageFromModel(this.product), alreadyExists ? modelMsgService.getMessageFromModel(productMetadata) : null);
  let logData = await this.mappingLogService.logSuccessAction(message, this.product, alreadyExists, diffs, productDSU);
  await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);
}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductMessage, processProductMessage);

},{"../../constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../../services/ModelMessageService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\ModelMessageService.js","../../utils/DBUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\DBUtils.js","../../utils/LogUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js","../../utils/ValidationUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js","./productSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productSchema.js","./productUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productPhoto.js":[function(require,module,exports){
const utils = require("../utils");
const validationUtils = require("../../utils/ValidationUtils");
const schema = require("../leaflet/leafletDeleteSchema");
function verifyIfProductPhotoMessage(message) {
  return message.messageType === "ProductPhoto";
}

async function processProductPhotoMessage(message) {
  const schema = require("./productPhotoSchema");
  const validationUtils = require("../../utils/ValidationUtils");
  const productUtils = require("./productUtils");
  const LogUtils = require("../../utils/LogUtils");
  const constants = require("../../constants/constants");
  const errUtils = require("../errors/errorUtils");
  const {sanitize} = require("../../utils/htmlSanitize");

  errUtils.addMappingError("PHOTO_MISSING_PRODUCT");
  const {base64ToArrayBuffer, bytesToBase64} = require("../../utils/CommonUtils");
  const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

  await validationUtils.validateMessageOnSchema.call(this, message, schema);

  try{
    message.imageData = sanitize(message.imageData);
  }catch (e) {
    errUtils.addMappingError("FILE_CONTAINS_FORBIDDEN_TAGS");
    throw errMap.newCustomError(errMap.errorTypes.FILE_CONTAINS_FORBIDDEN_TAGS, message.messageType);
  }

  const productCode = message.productCode;
  this.mappingLogService = LogUtils.createInstance(this.storageService, this.options.logService);



  let previousVersionHasPhoto, oldValue;
  try {
    const {
      constDSU,
      productDSU,
      alreadyExists
    } = await productUtils.getProductDSU.call(this, message, productCode);

    let productMetadata = await productUtils.getProductMetadata.call(this, message, productCode, alreadyExists);
    this.product = JSON.parse(JSON.stringify(productMetadata));

    let photoPath = constants.PRODUCT_IMAGE_FILE;
    let productPhotoStat = await productDSU.stat(photoPath);

    previousVersionHasPhoto = typeof productPhotoStat.type !== "undefined";
    try {
      oldValue = bytesToBase64(await productDSU.readFile(photoPath));
    } catch (e) {
      oldValue = "no photo";
    }

    await productDSU.writeFile(photoPath, $$.Buffer.from(base64ToArrayBuffer(message.imageData)));
    let diffs = {oldValue: oldValue, newValue: message.imageData}
    let logData = await this.mappingLogService.logSuccessAction(message, this.product, previousVersionHasPhoto, diffs, productDSU);
    const dbUtils = require("../../utils/DBUtils");
    await dbUtils.createOrUpdateRecord(this.storageService, logData, this.product);
    await utils.increaseVersion(this, message);

  } catch (err) {
    throw errMap.newCustomError(errMap.errorTypes.PHOTO_MISSING_PRODUCT, "productCode");
  }

}

require("opendsu").loadApi("m2dsu").defineMapping(verifyIfProductPhotoMessage, processProductPhotoMessage);

},{"../../constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../../utils/CommonUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","../../utils/DBUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\DBUtils.js","../../utils/LogUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js","../../utils/ValidationUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js","../../utils/htmlSanitize":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\htmlSanitize.js","../errors/errorUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorUtils.js","../leaflet/leafletDeleteSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\leaflet\\leafletDeleteSchema.js","../utils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\utils.js","./productPhotoSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productPhotoSchema.js","./productUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productPhotoSchema.js":[function(require,module,exports){
const messageHeaderSchema = require("./../messageHeaderSchema");
let photoSchema = {
  "type": "object",
  "properties":
    {
      "productCode": {"type": "string", "required": true},
      "imageData": {"type": "string", "required": true},
    }
}
photoSchema.properties = {...messageHeaderSchema, ...photoSchema.properties};
module.exports = photoSchema

},{"./../messageHeaderSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\messageHeaderSchema.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productSchema.js":[function(require,module,exports){
const messageHeaderSchema = require("./../messageHeaderSchema");
let productSchema = {
  "type": "object",
  "properties":
    {
      "product": {
        "type": "object", "required": true,
        "properties": {
          "productCode": {"type": "string", "required": true},
          "internalMaterialCode": {"type": "string", "required": false},
          "inventedName": {"type": "string", "required": true},
          "nameMedicinalProduct": {"type": "string", "required": true},
          "strength": {"type": "string", "required": false},
          "flagEnableAdverseEventReporting": {"type": "boolean"},
          "adverseEventReportingURL": {"type": "string"},
          "flagEnableACFProductCheck": {"type": "boolean"},
          "acfProductCheckURL": {"type": "string"},
          "patientSpecificLeaflet": {"type": "string"},
          "healthcarePractitionerInfo": {"type": "string"},
          "markets": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "marketId": {
                  "type": "string",
                  "required": true,
                  regex: /^(AF|AX|AL|DZ|AS|AD|AO|AI|AQ|AG|AR|AM|AW|AU|AT|AZ|BS|BH|BD|BB|BY|BE|BZ|BJ|BM|BT|BO|BA|BW|BV|BR|IO|BN|BG|BF|BI|KH|CM|CA|CV|KY|CF|TD|CL|CN|CX|CC|CO|KM|CG|CD|CK|CR|CI|HR|CU|CY|CZ|DK|DJ|DM|DO|EC|EG|SV|GQ|ER|EE|ET|FK|FO|FJ|FI|FR|GF|PF|TF|GA|GM|GE|DE|GH|GI|GR|GL|GD|GP|GU|GT|GG|GN|GW|GY|HT|HM|VA|HN|HK|HU|IS|IN|ID|IR|IQ|IE|IM|IL|IT|JM|JP|JE|JO|KZ|KE|KI|KP|KR|KW|KG|LA|LV|LB|LS|LR|LY|LI|LT|LU|MO|MK|MG|MW|MY|MV|ML|MT|MH|MQ|MR|MU|YT|MX|FM|MD|MC|MN|MS|MA|MZ|MM|NA|NR|NP|NL|AN|NC|NZ|NI|NE|NG|NU|NF|MP|NO|OM|PK|PW|PS|PA|PG|PY|PE|PH|PN|PL|PT|PR|QA|RE|RO|RU|RW|SH|KN|LC|PM|VC|WS|SM|ST|SA|SN|CS|SC|SL|SG|SK|SI|SB|SO|ZA|GS|ES|LK|SD|SR|SJ|SZ|SE|CH|SY|TW|TJ|TZ|TH|TL|TG|TK|TO|TT|TN|TR|TM|TC|TV|UG|UA|AE|GB|US|UM|UY|UZ|VU|VE|VN|VG|VI|WF|EH|YE|ZM|ZW)$/
                },
                "nationalCode": {"type": "string", "required": false},
                "mahName": {"type": "string"},
                "legalEntityName": {"type": "string"},
              }
            }
          }
        }
      }
    }
}
productSchema.properties = {...messageHeaderSchema, ...productSchema.properties};
module.exports = productSchema

},{"./../messageHeaderSchema":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\messageHeaderSchema.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productUtils.js":[function(require,module,exports){
const constants = require("../../constants/constants.js");
const GTIN_SSI = require("../../GTIN_SSI");
const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const errMap = openDSU.loadAPI("m2dsu").getErrorsMap();
const errorUtils = require("../errors/errorUtils");
const validationUtils = require("../../utils/ValidationUtils");
errorUtils.addMappingError("PRODUCT_DSU_LOAD_FAIL");
errorUtils.addMappingError("GTIN_VALIDATION_FAIL");

async function getProductDSURecovery(message, productCode, create) {

  let seedSSI = await this.createPathSSI(this.options.holderInfo.subdomain, `0/${productCode}`);
  let sreadSSI = await $$.promisify(seedSSI.derive)();

  async function recoveryProductConstDSU (dsu, callback){
    let error;

    try{
      await $$.promisify(dsu.mount)(constants.PRODUCT_DSU_MOUNT_POINT, sreadSSI.getIdentifier());
    }catch(err){
      error = err;
    }

    callback(error, dsu);
  }

  return new Promise((resolve, reject)=>{
    const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode);
    this.recoverDSU(gtinSSI, recoveryProductConstDSU, async(err, recoveredDSU)=>{
      if(err){
        return reject(err);
      }

      let productDSU = await $$.promisify(this.recoverDSU)(sreadSSI, (dsu, callback)=>{
        dsu.writeFile("/recovered", new Date().toISOString(), (err)=>{
            if(err){
              return callback(err);
            }
            return callback(undefined, dsu);
        });
      });
      resolve({constDSU: recoveredDSU, productDSU: productDSU, alreadyExists: true});
    });
  });
}

async function getProductDSU(message, productCode, create = false) {

  if(message.force){
    return await getProductDSURecovery.call(this, message, productCode, create);
  }

  let productDSU = {};
  const gtinSSI = GTIN_SSI.createGTIN_SSI(this.options.holderInfo.domain, this.options.holderInfo.subdomain, productCode);
  const {dsu, alreadyExists} = await this.loadConstSSIDSU(gtinSSI);

  if (create && !alreadyExists) {
    productDSU = await this.createPathSSIDSU(this.options.holderInfo.subdomain, `0/${productCode}`);
    let sreadSSI = await productDSU.getKeySSIAsString("sread");
    await dsu.mount(constants.PRODUCT_DSU_MOUNT_POINT, sreadSSI);

    return {constDSU: dsu, productDSU: productDSU, alreadyExists: alreadyExists};
  }

  try {
    let getSSIForMount = $$.promisify(dsu.getSSIForMount);
    //we read the ssi from the mounting point instead of the sharedDB. is more reliable
    let ssi = await getSSIForMount(constants.PRODUCT_DSU_MOUNT_POINT);
    productDSU = await this.loadDSU(ssi);
  } catch (err) {
    throw errMap.newCustomError(errMap.errorTypes.PRODUCT_DSU_LOAD_FAIL, "productCode");
  }
  return {constDSU: dsu, productDSU: productDSU, alreadyExists: alreadyExists};
}

async function validateGTIN(message) {
  let gtinValidationResult = validationUtils.validateGTIN(message.product.productCode);
  if (!gtinValidationResult.isValid) {
    message.invalidFields = [{
      field: "productCode",
      message: gtinValidationResult.message
    }]
    errMap.setErrorMessage("GTIN_VALIDATION_FAIL", gtinValidationResult.message);
    throw errMap.newCustomError(errMap.errorTypes.GTIN_VALIDATION_FAIL, "productCode");
  }
}

async function getProductMetadata(message, productCode, shouldExist = true) {
  let productMetadata = {};
  try {
    productMetadata = await $$.promisify(this.storageService.getRecord, this.storageService)(constants.PRODUCTS_TABLE, productCode);
  } catch (e) {
    if (shouldExist) {
      if(message.force){
        try{
          await $$.promisify(this.storageService.insertRecord, this.storageService)(constants.PRODUCTS_TABLE, productCode, message);
        }catch (e) {
          throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
        }
      }else {
        throw errMap.newCustomError(errMap.errorTypes.DB_OPERATION_FAIL, "productCode");
      }
    }
  }
  return productMetadata;
}

module.exports = {
  getProductDSU,
  getProductMetadata,
  validateGTIN
}

},{"../../GTIN_SSI":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_SSI.js","../../constants/constants.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../../utils/ValidationUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js","../errors/errorUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\responses\\index.js":[function(require,module,exports){
let responses = {};

module.exports = {
  buildResponse: function (version) {
    return new responses[version];
  },
  registerResponseVersion: function (version, buildFunction) {
    responses[version] = buildFunction;
  }
}
module.exports.registerResponseVersion(0.2, require("./response_v0.2"))

},{"./response_v0.2":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\responses\\response_v0.2.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\responses\\response_v0.2.js":[function(require,module,exports){
module.exports = function () {
  this.setMessageType = (type) => {
    type = type ? type.toLowerCase() : "";
    switch (type) {
      case "product":
        this.messageType = "ProductResponse";
        break;
      case "batch":
        this.messageType = "BatchResponse";
        break;
      case "productphoto":
        this.messageType = "ProductPhotoResponse";
        break;
      case "videosource":
        this.messageType = "VideoSourceResponse";
        break;
      default:
        this.messageType = "UnknownTypeResponse";
        break;
    }
  }
  this.messageTypeVersion = 0.2;
  this.setSenderId = (senderID) => {
    this.senderId = senderID
  }
  this.setReceiverId = (receiverID) => {
    this.receiverId = receiverID
  }
  this.messageId = generate(13);
  this.messageDateTime = new Date();
  this.setRequestData = (requestObj) => {
    this.requestMessageType = requestObj.messageType;
    this.requestMessageTypeVersion = requestObj.messageTypeVersion;
    this.requestMessageId = requestObj.messageId
    this.requestMessageDateTime = requestObj.messageDateTime;
  }
  this.response = [];
  this.addSuccessResponse = () => {
    if (this.response.length) {
      console.log('Possible response already set.');
      return;
    }
    this.response.push({
      "responseCounter": 1,
      "responseType": 100,
      "responseDescription": "Message successfully digested"
    });
  }
  this.addErrorResponse = (type, message, details, field) => {
    this.response.push({
      "responseCounter": this.response.length + 1,
      "responseType": type,
      "responseDescription": message,
      "errorData": details,
      "errorDataField": field
    })
  }

}

function generate(n) {
  let add = 1,
    max = 12 - add;

  if (n > max) {
    return generate(max) + generate(n - max);
  }

  max = Math.pow(10, n + add);
  var min = max / 10; // Math.pow(10, n) basically
  var number = Math.floor(Math.random() * (max - min + 1)) + min;

  return ("" + number).substring(add);
}



},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\utils.js":[function(require,module,exports){
const productUtils = require("./product/productUtils");
const batchUtils = require("./batch/batchUtils");
const utils = require("./../utils/CommonUtils.js");
const constants = require("../constants/constants");
const increaseVersion = async (context, message) => {
  try {

    if (message.batchCode) {
      const batchId = utils.getBatchMetadataPK(message.productCode, message.batchCode);
      let batchMetadata = await batchUtils.getBatchMetadata.call(context, message, batchId);
      batchMetadata.version++;
      await $$.promisify(context.storageService.updateRecord, context.storageService)(constants.BATCHES_STORAGE_TABLE, batchMetadata.pk, batchMetadata);
    } else {
      const productCode = message.productCode;
      let productMetadata = await productUtils.getProductMetadata.call(context, message, productCode);
      productMetadata.version++;
      await $$.promisify(context.storageService.updateRecord, context.storageService)(constants.PRODUCTS_TABLE, productMetadata.pk, productMetadata);
    }
  } catch (e) {
    console.log("error", e);
  }
}

module.exports = {
  increaseVersion
}

},{"../constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","./../utils/CommonUtils.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","./batch/batchUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\batch\\batchUtils.js","./product/productUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\product\\productUtils.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\LeafletInfoService.js":[function(require,module,exports){
const {createGTIN_SSI} = require("./../GTIN_SSI");
const LeafletFeatureManager = require("./../LeafletFeatureManager");
const constants = require("../constants/constants");
const versionTransformerUtils = require("../EpiVersionTransformer");
const utils = require("../utils/CommonUtils");
const openDSU = require("opendsu");
const resolver = openDSU.loadAPI("resolver");

class LeafletInfoService {
  constructor(gs1Fields, networkName, epiProtocolVersion) {
    this.gs1Fields = gs1Fields;
    this.gtin = gs1Fields.gtin;
    this.batch = gs1Fields.batchNumber;
    this.expiryDate = gs1Fields.expiry;
    this.networkName = networkName;
    this.gtinSSI = this.getLeafletGtinSSI();
    this.epiProtocolVersion = epiProtocolVersion;
  }

  static async init(gs1Fields, networkName) {
    let epiProtocolVersion = await LeafletFeatureManager.getEpiProtocolVersion();
    return new LeafletInfoService(gs1Fields, networkName, epiProtocolVersion);
  }

  getLeafletGtinSSI = () => {
    let gtinSSI = createGTIN_SSI(this.networkName, undefined, this.gtin, this.batch);
    return gtinSSI;
  }

  checkBatchAnchorExists(callback) {
    let anchorCheckTimeoutFlag = false;
    setTimeout(() => {
      if (!anchorCheckTimeoutFlag) {
        anchorCheckTimeoutFlag = true;
        return callback(undefined, false);
      }
    }, constants.ANCHOR_CHECK_TIMEOUT)
    resolver.loadDSU(this.gtinSSI.getIdentifier(), (err) => {
      if (anchorCheckTimeoutFlag) {
        return;
      }
      anchorCheckTimeoutFlag = true;
      if (err) {
        return callback(undefined, false);
      }
      callback(undefined, true);
    });
  }

  checkConstProductDSUExists(callback) {
    let anchorCheckTimeoutFlag = false;
    setTimeout(() => {
      if (!anchorCheckTimeoutFlag) {
        anchorCheckTimeoutFlag = true;
        return callback(undefined, false);
      }
    }, constants.ANCHOR_CHECK_TIMEOUT)
    //this is called in gtin only case (batch not found)
    this.gtinSSI = createGTIN_SSI(this.networkName, undefined, this.gtin);
    resolver.loadDSU(this.gtinSSI.getIdentifier(), (err) => {
      if (anchorCheckTimeoutFlag) {
        return;
      }
      anchorCheckTimeoutFlag = true;
      if (err) {
        return callback(undefined, false);
      }
      callback(undefined, true);
    });
  }

  readProductData(callback) {
    const gtinSSI = createGTIN_SSI(this.networkName, undefined, this.gtin);
    resolver.loadDSU(gtinSSI, async (err, dsu) => {
      if (err) {
        return callback(err);
      }
      try {
        let productData = await $$.promisify(dsu.readFile)(versionTransformerUtils.getProductPath(this.epiProtocolVersion));
        if (typeof productData === "undefined") {
          return callback(Error(`Product data is undefined.`));
        }
        productData = JSON.parse(productData.toString());
        try {
          let imgFile = await $$.promisify(dsu.readFile)(versionTransformerUtils.getProductImagePath(this.epiProtocolVersion));
          productData.productPhoto = utils.getImageAsBase64(imgFile)
        } catch (err) {
          productData.productPhoto = constants.HISTORY_ITEM_DEFAULT_ICON;
        }
        callback(undefined, productData);
      } catch (err) {
        return callback(err);
      }
    });
  }

  readBatchData(callback) {
    resolver.loadDSU(this.gtinSSI, (err, dsu) => {
      if (err) {
        return callback(err);
      }
      dsu.readFile(versionTransformerUtils.getBatchPath(this.epiProtocolVersion), (err, batchData) => {
        if (err) {
          return callback(err);
        }
        if (typeof batchData === "undefined") {
          return callback(Error(`Batch data is undefined`));
        }
        batchData = JSON.parse(batchData.toString());
        callback(undefined, batchData);
      });
    });
  }

  async disableFeatures(model) {
    let disabledFeatures = await LeafletFeatureManager.getLeafletDisabledFeatures();
    if (!disabledFeatures || disabledFeatures.length === 0) {
      return;
    }
    let disabledFeaturesKeys = [];
    disabledFeatures.forEach(code => {
      disabledFeaturesKeys = disabledFeaturesKeys.concat(constants.DISABLED_FEATURES_MAP[code].modelProperties);

    });
    Object.keys(model).forEach(key => {
      if (disabledFeaturesKeys.find(item => item === key)) {
        model[key] = null;
      }
    })
  }

  getBatchClientModel = async () => {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.readBatchData(async (err, batchModel) => {
        if (err) {
          return reject(err);
        }
        if (typeof batchModel === "undefined") {
          return reject(new Error("Could not find batch"));
        }
        if (`v${self.epiProtocolVersion}` === batchModel.epiProtocol) {
          await self.disableFeatures(batchModel);
          return resolve(batchModel)
        } else {
          // TO DO: transform model to this.epiProtocolVersion
          return reject(new Error(`Version incompatibility. Current version is ${self.epiProtocolVersion} and dsu version is ${batchModel.epiProtocol}`));
        }

      })
    })
  }

  getProductClientModel = async () => {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.readProductData(async (err, productModel) => {
        if (err) {
          return reject(err);
        }
        if (typeof productModel === "undefined") {
          return reject(new Error("Could not find batch"));
        }
        if (`v${self.epiProtocolVersion}` === productModel.epiProtocol) {
          await self.disableFeatures(productModel)
          return resolve(productModel)
        } else {
          // TO DO: transform model to this.epiProtocolVersion
          return reject(new Error(`Version incompatibility. Current version is ${self.epiProtocolVersion} and dsu version is ${productModel.epiProtocol}`));
        }
      })
    })
  }

  leafletShouldBeDisplayed(model, expiryCheck, currentTime) {
    //fix for the missing case describe here: https://github.com/PharmaLedger-IMI/epi-workspace/issues/167
    let product = model.product;
    let batchData = model.batch;
    let snCheck = model.snCheck;
    let expiryTime = model.expiryTime;

    if (batchData.serialCheck && !snCheck.validSerial && !snCheck.recalledSerial && !snCheck.decommissionedSerial ) {
      return true;
    }

    if (batchData.serialCheck && typeof model.serialNumber === "undefined" ) {
      return true;
    }

    if (batchData.serialCheck && snCheck.recalledSerial ) {
      return true;
    }

    if (batchData.serialCheck && snCheck.decommissionedSerial ) {
      return true;
    }

    if (!batchData.expiredDateCheck && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.incorrectDateCheck && !expiryCheck && !batchData.serialCheck && !batchData.serialCheck) {
      return true;
    }

    if (!batchData.expiredDateCheck && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial && batchData.recalled ) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial && !batchData.recalled) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && batchData.incorrectDateCheck && expiryCheck
      && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.incorrectDateCheck && !expiryCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (!batchData.expiredDateCheck && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (!batchData.expiredDateCheck && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    return false;
  }
}

module.exports = LeafletInfoService;



},{"../EpiVersionTransformer":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\EpiVersionTransformer.js","../constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../utils/CommonUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","./../GTIN_SSI":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_SSI.js","./../LeafletFeatureManager":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\LeafletFeatureManager.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\LogService.js":[function(require,module,exports){
const constants = require('../constants/constants');

module.exports = class LogService {

  constructor(logsTable) {
    if (typeof logsTable === "undefined") {
      this.logsTable = constants.LOGS_TABLE;
    } else {
      this.logsTable = logsTable;
    }
  }

  log(logDetails, callback) {
    if (logDetails === null || logDetails === undefined) {
      return;
    }

    let log = {
      ...logDetails,
      timestamp: logDetails.timestamp || new Date().getTime()
    };

    try {
      log.itemCode = logDetails.itemCode || logDetails.metadata.gtin || "unknown";
    } catch (e) {
      log.itemCode = "unknown"
    }
    return this.persistLog(log, callback)

  }

  loginLog(logDetails, callback) {
    let log = {
      ...logDetails,
      logISODate: new Date().toISOString()
    };
    return this.persistLog(log, callback);
  }

  getLogs(callback) {
    this.getSharedStorage((err, storageService) => {
      if (err) {
        return callback(err);
      }
      storageService.filter(this.logsTable, "__timestamp > 0", callback);
    });
  }

  persistLog(log, callback) {
    this.getSharedStorage((err, storageService) => {
      if (err) {
        return callback(err);
      }

      const crypto = require("opendsu").loadAPI("crypto");
      storageService.insertRecord(this.logsTable, crypto.generateRandom(32).toString("hex"), log, (err) => {
        if (err) {
          return callback(err);
        }
        callback(undefined, log);
      });
    })
  }

  getSharedStorage(callback) {
    if (typeof this.storageService !== "undefined") {
      return callback(undefined, this.storageService);
    }
    const openDSU = require("opendsu");
    const scAPI = openDSU.loadAPI("sc");
    scAPI.getSharedEnclave((err, sharedEnclave) => {
      if (err) {
        return callback(err);
      }

      sharedEnclave.addIndex(this.logsTable, "__timestamp", (error) => {
        if (error) {
          return callback(error);
        }
        sharedEnclave.addIndex(this.logsTable, "auditId", (error) => {
          if (error) {
            return callback(error);
          }
          this.storageService = sharedEnclave;
          callback(undefined, this.storageService)
        });
      });
    });
  }
}

},{"../constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\MessageQueuingService.js":[function(require,module,exports){
function MessageQueuingService() {

  this.getNextMessagesBlock = function (messages, callback) {

    let productsInQueue = [];
    let batchesInQueue = [];
    let queue = [];

    let letQueuePass = () => {
      if (!queue.length) {
        queue = messages;
      }
      callback(undefined, queue);
    }

    for (let i = 0; i < messages.length; i++) {
      let message = messages[i];
      let productCode, batchNumber;
      try {
        switch (true) {
          case message.messageType.toLowerCase() === "product":
            productCode = message.product.productCode;
            if (productsInQueue.indexOf(productCode) === -1) {
              productsInQueue.push(productCode);
              queue.push(message);
            } else {
              return letQueuePass();
            }
            break;
          case message.messageType.toLowerCase() === "batch":
            productCode = message.batch.productCode;
            batchNumber = message.batch.batch;
            if (productsInQueue.indexOf(productCode) === -1 && batchesInQueue.indexOf(batchNumber) === -1) {
              productsInQueue.push(productCode);
              batchesInQueue.push(batchNumber);
              queue.push(message);
            } else {
              return letQueuePass();
            }
            break;
          case ["productphoto", "leaflet", "smpc"].indexOf(message.messageType.toLowerCase()) !== -1:
            let itemCode, searchQueue;
            //if both productcode and bachcode on message - means it's a batch leaflet or smpc
            //if just productcode on message - means it's a product leaflet/smpc or productphoto
            if (message.productCode) {
              itemCode = message.productCode;
              searchQueue = productsInQueue;

              if (message.batchCode) {
                itemCode = message.batchCode;
                searchQueue = batchesInQueue;
              }

              if (searchQueue.indexOf(itemCode) === -1) {
                searchQueue.push(itemCode);
                queue.push(message);
              } else {
                return letQueuePass();
              }

            }
            break;
          default:
            queue.push(message);
            return letQueuePass();
        }
      } catch (e) {
        queue.push(message);
        return letQueuePass();
      }


    }
    letQueuePass();
  }

}

let instance = null;
module.exports.getMessageQueuingServiceInstance = () => {

  if (!instance) {
    instance = new MessageQueuingService();
  }

  return instance;
}

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\ModelMessageService.js":[function(require,module,exports){
const modelToMessageMap = {
  "product": {
    name: "inventedName",
    gtin: "productCode",
    description: "nameMedicinalProduct",
    manufName: "manufName",
    reportURL: function (param) {
      if (param.direction === "toMsg") {
        return "adverseEventReportingURL"
      }
      if (typeof window !== "undefined" && window.top) {
        param.obj['reportURL'] = `${window.top.location.origin}/default-report.html`;
      }
      param.obj['reportURL'] = param.msg["adverseEventReportingURL"];
    },
    antiCounterfeitingURL: function (param) {
      if (param.direction === "toMsg") {
        return "acfProductCheckURL"
      }
      if (typeof window !== "undefined" && window.top) {
        param.obj['antiCounterfeitingURL'] = `${window.top.location.origin}/default-anti-counterfeiting.html`;
      }
      param.obj['antiCounterfeitingURL'] = param.msg["acfProductCheckURL"];
    },
    adverseEventsReportingEnabled: "flagEnableAdverseEventReporting",
    antiCounterfeitingEnabled: "flagEnableACFProductCheck",
    practitionerInfo: function (param) {
      if (param.direction === "toMsg") {
        return "healthcarePractitionerInfo"
      }
      param.obj["practitionerInfo"] = param.msg["healthcarePractitionerInfo"] || "SmPC";

    },
    patientLeafletInfo: function (param) {
      if (param.direction === "toMsg") {
        return "patientSpecificLeaflet"
      }
      param.obj["patientLeafletInfo"] = param.msg["patientSpecificLeaflet"] || "Patient Information";
    },
    markets: "markets",
    internalMaterialCode: "internalMaterialCode",
    strength: "strength",
  },
  "batch": {
    gtin: "productCode",
    batchNumber: "batch",
    expiry: function (param) {
      if (param.direction === "toMsg") {
        return "expiryDate"
      }
      param.obj['expiry'] = param.msg["expiryDate"];
      try {
        const y = param.msg.expiryDate.slice(0, 2);
        const m = param.msg.expiryDate.slice(2, 4);
        let d = param.msg.expiryDate.slice(4, 6);
        const lastMonthDay = ("0" + new Date(y, m, 0).getDate()).slice(-2);
        if (d === '00') {
          param.obj.enableExpiryDay = true;
          d = lastMonthDay;
        } else {
          param.obj.enableExpiryDay = false;
        }
        const localDate = new Date(Date.parse(m + '/' + d + '/' + y));
        const gmtDate = new Date(localDate.getFullYear() + '-' + m + '-' + d + 'T00:00:00Z');
        param.obj.expiryForDisplay = gmtDate.getTime();
      } catch (e) {
        throw new Error(`${param.msg.expiryDate} date is invalid`, e);
      }
    },
    serialNumbers: "snValid",
    recalledSerialNumbers: "snRecalled",
    decommissionedSerialNumbers: function (param) {
      if (param.direction === "toMsg") {
        return param.obj.decommissionReason ? "snDecom " + param.obj.decommissionReason : "snDecom";
      }
      const decomKey = Object.keys(param.msg).find((key) => key.includes("snDecom"));
      if (!decomKey) {
        return
      }
      const keyArr = decomKey.split(" ");
      if (keyArr.length === 2) {
        param.obj.decommissionReason = keyArr[1];
      } else {
        param.obj.decommissionReason = "unknown";
      }
      param.obj.decommissionedSerialNumbers = param.msg[decomKey];
    },
    recalled: "flagEnableBatchRecallMessage",
    serialCheck: "flagEnableSNVerification",
    incorrectDateCheck: "flagEnableEXPVerification",
    expiredDateCheck: "flagEnableExpiredEXPCheck",
    recalledMessage: "recallMessage",
    defaultMessage: "batchMessage",
    packagingSiteName: "packagingSiteName",
    flagEnableACFBatchCheck: "flagEnableACFBatchCheck",
    // ACDC PATCH START
    acdcAuthFeatureSSI: "acdcAuthFeatureSSI",
    // ACDC PATCH END
    acfBatchCheckURL: "acfBatchCheckURL",
    snValidReset: "snValidReset",
    snRecalledReset: "snRecalledReset",
    snDecomReset: "snDecomReset"
  }
}

class ModelMessageService {
  constructor(type) {
    this.type = type;
  }

  getModelFromMessage(messageObj) {
    let destinationObj = {};
    let mappingObj = modelToMessageMap[this.type]
    for (let prop in mappingObj) {
      if (typeof mappingObj[prop] === "function") {
        mappingObj[prop]({direction: "fromMsg", "obj": destinationObj, "msg": messageObj});
      } else {
        destinationObj[prop] = messageObj[mappingObj[prop]];
      }
    }
    return destinationObj;
  }

  getMessageFromModel(sourceObj) {
    let messageObj = {};
    let mappingObj = modelToMessageMap[this.type]
    for (let prop in mappingObj) {
      if (sourceObj[prop] !== "undefined") {
        if (typeof mappingObj[prop] === "function") {
          messageObj[mappingObj[prop]({direction: "toMsg", "obj": sourceObj, "msg": messageObj})] = sourceObj[prop];
        } else {
          messageObj[mappingObj[prop]] = sourceObj[prop];
        }
      }
    }
    return messageObj;
  }
}


module.exports = ModelMessageService;

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\NodeDSUStorage.js":[function(require,module,exports){
class NodeDSUStorage {
  constructor(walletSSI) {
    this.directAccessEnabled = false;

    if (!walletSSI) {
      throw new Error("Wallet SSI was not provided in constructor of NodeDSUStorage!")
    }

    this.walletSSI = walletSSI;
  }

  enableDirectAccess(callback) {
    let self = this;

    function addFunctionsFromMainDSU() {
      if (!self.directAccessEnabled) {

        let availableFunctions = [
          "addFile",
          "addFiles",
          "addFolder",
          "appendToFile",
          "createFolder",
          "delete",
          "extractFile",
          "extractFolder",
          "getArchiveForPath",
          "getCreationSSI",
          "getKeySSI",
          "listFiles",
          "listFolders",
          "mount",
          "readDir",
          "readFile",
          "rename",
          "unmount",
          "writeFile",
          "listMountedDSUs",
          "beginBatch",
          "commitBatch",
          "cancelBatch"
        ];
        let getDSU = (err, mainDSU) => {
          if (err) {
            return callback(err);
          }
          try {
            for (let f of availableFunctions) {
              self[f] = mainDSU[f];
            }
            self.directAccessEnabled = true;
            callback(undefined, true);
          } catch (err) {
            return callback(err);
          }

        }
        if (self.walletSSI) {
          let resolver = require("opendsu").loadAPI("resolver");
          return resolver.loadDSU(self.walletSSI, getDSU);
        }
        let sc = require("opendsu").loadAPI("sc");
        sc.getMainDSU(getDSU)
      } else {
        callback(undefined, true);
      }
    }

    addFunctionsFromMainDSU();
  }

  setObject(path, data, callback) {
    try {
      let dataSerialized = JSON.stringify(data);
      this.setItem(path, dataSerialized, callback)
    } catch (e) {
      callback(createOpenDSUErrorWrapper("setObject failed", e));
    }
  }

  getObject(path, callback) {
    this.getItem(path, "json", function (err, res) {
      if (err || !res) {
        return callback(undefined, undefined);
      }
      callback(undefined, res);
    })
  }

  setItem(path, data, callback) {
    this.writeFile(path, data, callback);
  }

  getItem(path, expectedResultType, callback) {
    if (typeof expectedResultType === "function") {
      callback = expectedResultType;
      expectedResultType = "arrayBuffer";
    }
    try {
      this.readFile(path, function (err, res) {
        if (err) {
          return callback(err);
        }
        try {
          if (expectedResultType == "json") {
            res = JSON.parse(res.toString());
          }
        } catch (err) {
          return callback(err);
        }
        callback(undefined, res);
      })
    } catch (e) {
      return callback(e);
    }

  }

  uploadFile(path, file, options, callback) {
    doFileUpload(...arguments);
  }

  uploadMultipleFiles(path, files, options, callback) {
    doFileUpload(...arguments);
  }

  deleteObjects(objects, callback) {
    performRemoval(objects, callback);
  }

  removeFile(filePath, callback) {
    console.log("[Warning] - obsolete. Use DSU.deleteObjects");
    performRemoval([filePath], callback);
  }

  removeFiles(filePathList, callback) {
    console.log("[Warning] - obsolete. Use DSU.deleteObjects");
    performRemoval(filePathList, callback);
  }
}

let instances = {};
module.exports = {
  getInstance: function (walletSSI) {
    if (!instances[walletSSI]) {
      instances[walletSSI] = module.exports.createInstance(walletSSI);
    }
    return instances[walletSSI];
  },
  createInstance: function (walletSSI) {
    let instance;
    switch ($$.environmentType) {
      case "nodejs":
        instance = new NodeDSUStorage(walletSSI);
        break;
      default:
        throw new Error('DSU Storage is not implemented for this <${$$.environmentType}> env!');
    }
    return instance;
  }
};

},{"opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\SharedDBStorageService.js":[function(require,module,exports){
const CREDENTIAL_FILE_PATH = "/myKeys/credential.json";

class SharedStorage {
  constructor(dsuStorage) {
    const openDSU = require("opendsu");
    const dbAPI = openDSU.loadAPI("db");
    const scAPI = openDSU.loadAPI("sc");
    dsuStorage.getObject("/environment.json", async (err, env) => {
      const mainDSU = await $$.promisify(scAPI.getMainDSU)();
      await $$.promisify(mainDSU.writeFile)(
        "/environment.json",
        JSON.stringify(env)
      );
      await $$.promisify(mainDSU.refresh)();
      const data = await $$.promisify(mainDSU.readFile)("/environment.json");
      console.log(data.toString());
      scAPI.setMainDSU(mainDSU);
      scAPI.refreshSecurityContext();
      dbAPI.getSharedEnclaveDB((err, enclaveDB) => {
        if (err) {
          return console.log(err);
        }
        this.mydb = enclaveDB;
        this.DSUStorage = dsuStorage;
      });
    });
  }

  waitForDb(func, args) {
    if (typeof args === "undefined") {
      args = [];
    }
    func = func.bind(this);
    setTimeout(function () {
      func(...args);
    }, 10);
  }

  dbReady() {
    return this.mydb !== undefined && this.mydb !== "initialising";
  }

  filter(tableName, query, sort, limit, callback) {
    if (this.dbReady()) {
      this.mydb.filter(tableName, query, sort, limit, callback);
    } else {
      this.waitForDb(this.filter, [tableName, query, sort, limit, callback]);
    }
  }

  addSharedFile(path, value, callback) {
    throw Error("Not implemented");
  }

  addIndex(tableName, field, callback) {
    if (this.dbReady()) {
      console.log("addIndex :", tableName, field);
      this.mydb.addIndex(tableName, field, callback);
    } else {
      this.waitForDb(this.addIndex, [tableName, field, callback]);
    }
  }

  getRecord(tableName, key, callback) {
    if (this.dbReady()) {
      this.mydb.getRecord(tableName, key, callback);
    } else {
      this.waitForDb(this.getRecord, [tableName, key, callback]);
    }
  }

  addIndex(tableName, field, callback) {
    if (this.dbReady()) {
      console.log("addIndex :", tableName, field);
      this.mydb.addIndex(tableName, field, callback);
    } else {
      this.waitForDb(this.addIndex, [tableName, field, callback]);
    }
  }

  insertRecord(tableName, key, record, callback) {
    if (this.dbReady()) {
      console.log("Insert Record:", tableName, key);
      this.mydb.insertRecord(tableName, key, record, callback);
    } else {
      this.waitForDb(this.insertRecord, [tableName, key, record, callback]);
    }
  }

  updateRecord(tableName, key, record, callback) {
    if (this.dbReady()) {
      this.mydb.updateRecord(tableName, key, record, callback);
    } else {
      this.waitForDb(this.updateRecord, [tableName, key, record, callback]);
    }
  }

  beginBatch() {
    if (this.dbReady()) {
      this.mydb.beginBatch();
    } else {
      this.waitForDb(this.beginBatch);
    }
  }

  cancelBatch(callback) {
    if (this.dbReady()) {
      this.mydb.cancelBatch(callback);
    } else {
      this.waitForDb(this.cancelBatch, [callback]);
    }
  }

  commitBatch(callback) {
    if (this.dbReady()) {
      this.mydb.commitBatch(callback);
    } else {
      this.waitForDb(this.commitBatch, [callback]);
    }
  }

  getSharedSSI(callback) {
    this.DSUStorage.getObject(CREDENTIAL_FILE_PATH, (err, credential) => {
      console.log(`Got:
    error -  ${err},
    credentialObj - ${JSON.stringify(credential)}`);
      if (err || !credential) {
        return callback(createOpenDSUErrorWrapper("Invalid credentials", err));
      } else {
        const crypto = require("opendsu").loadApi("crypto");
        const keyssi = require("opendsu").loadApi("keyssi");
        crypto.parseJWTSegments(
          credential.credential,
          (parseError, jwtContent) => {
            if (parseError) {
              return callback(
                createOpenDSUErrorWrapper(
                  "Error parsing user credential:",
                  parseError
                )
              );
            }
            console.log("Parsed credential", jwtContent);
            callback(undefined, keyssi.parse(jwtContent.body.iss));
          }
        );
      }
    });
  }
}

module.exports.getSharedStorage = function (dsuStorage) {
  if (typeof sharedStorageSingleton === "undefined") {
    sharedStorageSingleton = new SharedStorage(dsuStorage);
  }
  return sharedStorageSingleton;
};

let instances = {};

module.exports.getSharedStorageInstance = function (dsuStorage) {
  if (!dsuStorage.walletSSI) {
    return module.exports.getSharedStorage(dsuStorage);
  }
  if (!instances[dsuStorage.walletSSI]) {
    instances[dsuStorage.walletSSI] = new SharedStorage(dsuStorage);
  }
  return instances[dsuStorage.walletSSI];
};

module.exports.getPromisifiedSharedObject = function (dsuStorage) {
  const instance = module.exports.getSharedStorageInstance(dsuStorage);
  const promisifyFns = [
    "addSharedFile",
    "cancelBatch",
    "commitBatch",
    "filter",
    "getRecord",
    "getSharedSSI",
    "insertRecord",
    "updateRecord",
    "addIndex"
  ];
  for (let i = 0; i < promisifyFns.length; i++) {
    let prop = promisifyFns[i];
    if (typeof instance[prop] === "function") {
      instance[prop] = $$.promisify(instance[prop].bind(instance));
    }
  }
  return instance;
};

},{"opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\XMLDisplayService\\Acodis_StyleSheet.js":[function(require,module,exports){
const acordisXslContent = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="urn:hl7-org:v3"
                xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="urn:hl7-org:v3 https://www.accessdata.fda.gov/spl/schema/spl.xsd">

    <xsl:output method="html" version="1.0"
                encoding="UTF-8" indent="yes" doctype-public="-//W3C//DTD XHTML 1.1//EN"/>

    <!--setting identity transformation-->
    <xsl:template match="@*|node()">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="document">
            <div><xsl:apply-templates select="@*|node()"/></div>
    </xsl:template>
    
    <xsl:param name="quote">"</xsl:param>
    <xsl:param name="space">\\0020</xsl:param>
    <xsl:template match="//ul">
        <ul> <xsl:apply-templates select="node()" /></ul>
    </xsl:template>

    <xsl:template match="//ul/li">
        <li>
          <xsl:attribute name="style"> list-style-type: <xsl:value-of select="$quote"/><xsl:value-of select="@data-enum"/><xsl:value-of select="$space"/><xsl:value-of select="$quote"/>; </xsl:attribute>
        <xsl:apply-templates select="node()" /></li>
    </xsl:template>

    <xsl:template match="//ol">
        <ol><xsl:apply-templates select="node()" /></ol>
    </xsl:template>

    <xsl:template match="//ol/li">
        <li>
         <xsl:attribute name="style"> list-style-type: <xsl:value-of select="$quote"/><xsl:value-of select="@data-enum"/><xsl:value-of select="$space"/><xsl:value-of select="$quote"/>; </xsl:attribute>
        <xsl:apply-templates select="node()" /></li>
    </xsl:template>

    <xsl:template match="//section//p">
        <p><xsl:apply-templates select="node()" /></p>
    </xsl:template>
    
    <xsl:template match="//figure">
        <figure><xsl:apply-templates select="node()" /></figure>
    </xsl:template>

    <xsl:template match="//figure/*[not(self::img)]">
        <section style="display:none;" class="ignore_from_ui"><xsl:apply-templates select="node()" /></section>
    </xsl:template>
    
    
    <xsl:template match="//figure/img">
        <xsl:variable name="_src">
            <xsl:value-of select="@src"/>
        </xsl:variable>
        <img>
            <xsl:attribute name="src">
                <xsl:value-of select="concat($resources_path, $_src)"/>
            </xsl:attribute>
            <xsl:apply-templates select="node()"/>
        </img>
    </xsl:template>
    
    <xsl:template match="//table">
        <table><xsl:apply-templates select="node()" /></table>
    </xsl:template>

    <xsl:template match="//tr">
        <tr><xsl:apply-templates select="node()" /></tr>
    </xsl:template>
      
     <xsl:template match="//*[@class='Table of Content']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
    
      <xsl:template match="//*[@class='Type']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
   
    <xsl:template match="//*[@class='Product_Name']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
   <xsl:template match="//*[@class='Ingredient Substance']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
   <xsl:template match="//*[@class='Read Instructions']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
    <xsl:template match="//*[@class='ignore_from_ui']" priority="9">
        <div style="display:none;" class="leaflet_hidden_section ignore_from_ui"><xsl:apply-templates select="@class|node()"/></div>
    </xsl:template>
    <xsl:template match="document/section">
        <div class="section leaflet-accordion-item">
            <xsl:apply-templates select="header"/>
                <div class="leaflet-accordion-item-content">
                     <xsl:apply-templates select="*[not(self::header)]"/>
                </div>
        </div>
    </xsl:template>
    
    <xsl:template match="document/section/header">
        <h5>
            <xsl:apply-templates select="node()" />
        </h5>
    </xsl:template>
</xsl:stylesheet>`;

module.exports = acordisXslContent;

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\XMLDisplayService\\XMLDisplayService.js":[function(require,module,exports){
const languageUtils = require("../../utils/Languages.js");
const constants = require("../../constants/constants.js");
const {createGTIN_SSI} = require("../../GTIN_SSI");
const utils = require("../../utils/CommonUtils.js");
const accordis_xslContent = require("./Acodis_StyleSheet.js");
const default_xslContent = require("./leafletXSL.js");
const {sanitize} = require("../../utils/htmlSanitize");
const openDSU = require("opendsu");

let errorMessage = "This is a valid product. However, more information about this product has not been published by the Pharmaceutical Company. Please check back later.";
let securityErrorMessage = "Due to security concerns, the leaflet cannot be displayed";

class XmlDisplayService {
  constructor(element, gtinSSI, model, xmlType, htmlContainerId) {
    this.element = element;
    this.gtinSSI = gtinSSI;
    this.xmlType = xmlType;
    this.model = model;
    this.htmlContainerId = htmlContainerId || "#leaflet-content";
  }

  static async init(element, gtinSSI, model, xmlType, htmlContainerId) {
    let service = new XmlDisplayService(element, gtinSSI, model, xmlType, htmlContainerId);
    await service.isXmlAvailable();
    return service;
  }

  async isXmlAvailable() {
    return new Promise((resolve, reject) => {
      this.getAvailableLanguagesForXmlType((err, languages) => {
        if (err) {
          return reject(err);
        }
        if (this.xmlType === "smpc") {
          this.model.showSmpc = !(this.model.product.practitionerInfo === null) && languages.length > 0
        }
        if (this.xmlType === "leaflet") {
          this.model.showLeaflet = !(this.model.product.patientLeafletInfo === null) && languages.length > 0
        }

        return resolve(this.model.showSmpc || this.model.showLeaflet);
      });
    })

  }

  displayXmlForLanguage(language, callback) {
    this.readXmlFile(language, (err, xmlContent, pathBase) => {
      if (err) {
        this.displayError();
        return callback(err, null);
      }
      try {
        this.displayXmlContent(pathBase, xmlContent);
      } catch (e) {
        this.displayError();
        return callback(err, null);
      }
      return callback(null)
      // this.applyStylesheetAndDisplayXml(pathBase, xmlContent);
    });
  }

  getGtinSSIForConstProductDSU() {
    return createGTIN_SSI(this.model.networkName, undefined, this.model.product.gtin);
  }

  readXmlFile(language, callback) {
    this.mergeAvailableLanguages().then(languagesMap => {
      let pathToLeafletLanguage = languagesMap[language];
      let gtinSSI = this.gtinSSI;
      if (pathToLeafletLanguage.includes(constants.PRODUCT_DSU_MOUNT_POINT)) {
        gtinSSI = this.getGtinSSIForConstProductDSU();
      }
      const pathToXml = `${pathToLeafletLanguage}/${this.xmlType}.xml`;
      const openDSU = require("opendsu");
      const resolver = openDSU.loadAPI("resolver");
      resolver.loadDSU(gtinSSI, async (err, dsu) => {
        if (err) {
          return callback(err);
        }
        try {
          let files = await $$.promisify(dsu.listFiles)(pathToLeafletLanguage);
          let xmlContent = await $$.promisify(dsu.readFile)(pathToXml);
          let textDecoder = new TextDecoder("utf-8");
          let leafletImagesObj = {};
          this.images = {};
          let anyOtherFiles = files.filter((file) => !file.endsWith('.xml'));
          for (let i = 0; i < anyOtherFiles.length; i++) {
            let filePath = `${pathToLeafletLanguage}/${anyOtherFiles[i]}`;
            let imgFile = await $$.promisify(dsu.readFile)(filePath);
            leafletImagesObj[anyOtherFiles[i]] = this.images[filePath] = utils.getImageAsBase64(imgFile);
          }
          callback(undefined, textDecoder.decode(xmlContent), `${pathToLeafletLanguage}/`, leafletImagesObj);
        } catch (e) {
          return callback(e);
        }
      })

    }).catch(callback)
  }

    displayError(errMsg = errorMessage) {
        let errorMessageElement = this.getErrorMessageElement(errMsg);
        this.element.querySelector(this.htmlContainerId).innerHTML = "";
        this.element.querySelector(this.htmlContainerId).appendChild(errorMessageElement);
    }

  displayXmlContent(pathBase, xmlContent) {
    let resultDocument = this.getHTMLFromXML(pathBase, xmlContent);
    let leafletImages = resultDocument.querySelectorAll("img");
    for (let image of leafletImages) {
      image.setAttribute("src", this.images[image.getAttribute("src")]);
    }
    let htmlFragment = this.buildLeafletHTMLSections(resultDocument);
    try {
      this.element.querySelector(this.htmlContainerId).innerHTML = sanitize(htmlFragment);
    } catch (e) {
      return this.displayError(securityErrorMessage);
    }
    let leafletLinks = this.element.querySelectorAll(".leaflet-link");
    this.activateLeafletInnerLinks(leafletLinks);
  }

  activateLeafletInnerLinks(leafletLinks) {
    for (let link of leafletLinks) {
      let linkUrl = link.getAttribute("linkUrl");
      if (linkUrl.slice(0, 1) === "#") {
        link.addEventListener("click", () => {
          document.getElementById(linkUrl.slice(1)).scrollIntoView();
        });
      }
    }
  }

  getHTMLFromXML(pathBase, xmlContent) {
    let xsltProcessor = new XSLTProcessor();
    xsltProcessor.setParameter(null, "resources_path", pathBase);
    let parser = new DOMParser();

    let xmlDoc = parser.parseFromString(xmlContent, "text/xml");
    if (!xmlDoc || !xmlDoc.children) {
      return "";
    }
    let xslContent;
    switch (xmlDoc.children[0].tagName) {
      case "root":
        let rootInnerHtml = xmlDoc.children[0].innerHTML;
        let newXmlDoc = document.implementation.createDocument(null, "document");
        try{
          newXmlDoc.children[0].innerHTML = sanitize(rootInnerHtml);
        }catch (e) {
          return this.displayError(securityErrorMessage);
        }
        xmlDoc = newXmlDoc;
        xslContent = accordis_xslContent;
        break
      case "document":
        if (xmlDoc.documentElement.hasAttribute("type") && xmlDoc.documentElement.getAttribute("type") === "pharmaledger-1.0") {
          xslContent = accordis_xslContent;
          break;
        }
        xslContent = default_xslContent;
        break
    }

    if (!xslContent) {
      return ""
    }
    let xslDoc = parser.parseFromString(xslContent, "text/xml");

    xsltProcessor.importStylesheet(xslDoc);

    let resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
    return resultDocument;
  }

  /*  buildLeafletHTMLSections(resultDocument) {
      let sectionsElements = resultDocument.querySelectorAll(".leaflet-accordion-item");
      let aboutContent = "";
      let beforeContent = "";
      let howToContent = "";
      let sideEffectsContent = "";
      let storingContent = "";
      let moreContent = "";
      sectionsElements.forEach(section => {
        let xmlCodeValue = section.getAttribute("sectionCode");
        switch (xmlCodeValue) {
          case '48780-1':
          case '34089-3':
          case '34076-0':
          case '60559-2':
            aboutContent = aboutContent + section.innerHTML;
            break;
          case '34070-3':
          case '34084-4':
          case '34086-9':
          case '69759-9':
            beforeContent = beforeContent + section.innerHTML;
            break;
          case '34068-7':
          case '43678-2':
          case '34072-9':
          case '34067-9':
          case '59845-8':
            howToContent = howToContent + section.innerHTML;
            break;
          case '34071-1':
          case '43685-7':
          case '54433-8':
          case '69762-3':
          case '34077-8':
          case '60563-4':
          case '34078-6':
            sideEffectsContent = sideEffectsContent + section.innerHTML;
            break;
          case '44425-7':
            storingContent = storingContent + section.innerHTML;
            break;
          default:
            moreContent = moreContent + section.innerHTML;

        }
      });

      let htmlFragment = ``
      return htmlFragment;
    }*/

  buildLeafletHTMLSections(resultDocument) {
    let sectionsElements = resultDocument.querySelectorAll(".leaflet-accordion-item");
    let htmlContent = "";
    sectionsElements.forEach(section => {
      htmlContent = htmlContent + section.outerHTML;
    })
    return htmlContent;
  }

  clearSearchResult(domElement) {
    let cleanHtml = domElement.innerHTML.replace(/((<mark class([a-zA-Z""=])*>)|<mark>|<\/mark>)/gim, '');
    try{
      domElement.innerHTML = sanitize(cleanHtml);
    }catch (e) {
      return this.displayError(securityErrorMessage);
    }
  }

  searchInHtml(searchQuery) {
    let domElement = this.element.querySelector(this.htmlContainerId);
    this.clearSearchResult(domElement);
    if (searchQuery === "") {
      return
    }
    const regex = new RegExp(searchQuery, 'gi');
    let resultNodes = [];
    try {

      let results = this.element.parentElement.ownerDocument.evaluate(`.//*[text()[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'),"${searchQuery}")]]`, domElement);
      let domNode = null;

      while (domNode = results.iterateNext()) {
        // checking if the element is rendered, such that it can be highlighted and scrolled into view
        if (domNode.checkVisibility()) {
          resultNodes.push(domNode);
      }
      }
      for (let i = 0; i < resultNodes.length; i++) {
        let text = resultNodes[i].innerHTML;
        const newText = text.replace(regex, '<mark>$&</mark>');
        try{
          resultNodes[i].innerHTML = sanitize(newText);
        }catch (e) {
          return this.displayError(securityErrorMessage);
        }
      }


    } catch (e) {
      // not found should not throw error just skip and wait for new input
    }
    return resultNodes;
  }

  getBatchPathToXmlType() {
    return `${constants.BATCH_DSU_MOUNT_POINT}/${this.xmlType}`;
  }

  getProductPathToXmlType() {
    return `${constants.PRODUCT_DSU_MOUNT_POINT}/${this.xmlType}`;
  }

  getAvailableLanguagesFromPath(gtinSSI, path, callback) {
    const resolver = openDSU.loadAPI("resolver");
    const pskPath = require("swarmutils").path;
    resolver.loadDSU(gtinSSI, (err, dsu) => {
      if (err) {
        return callback(err);
      }
      dsu.listFolders(path, async (err, langFolders) => {
        if (err) {
          return callback(err);
        }
        let langs = [];
        for (let i = 0; i < langFolders.length; i++) {
          let langFolderPath = pskPath.join(path, langFolders[i]);
          let files = await $$.promisify(dsu.listFiles)(langFolderPath);
          let hasXml = files.find((item) => {
            return item.endsWith("xml")
          })
          if (hasXml) {
            langs.push(langFolders[i])
          }
        }
        return callback(undefined, langs);

      })
    })

  }

  getAvailableLanguagesForBatch(callback) {
    this.getAvailableLanguagesFromPath(this.gtinSSI, this.getBatchPathToXmlType(), (err, langs) => {
      if (err) {
        langs = [];
      }
      callback(null, langs)
    })
  }

  getAvailableLanguagesForProduct(callback) {
    let gtinSSI = this.getGtinSSIForConstProductDSU();
    this.getAvailableLanguagesFromPath(gtinSSI, this.getProductPathToXmlType(), (err, langs) => {
      if (err) {
        langs = [];
      }
      callback(null, langs)
    });
  }

  async mergeAvailableLanguages() {
    let productLanguages = await $$.promisify(this.getAvailableLanguagesForProduct, this)();
    let batchLanguages = await $$.promisify(this.getAvailableLanguagesForBatch, this)();
    let languagesMap = {};
    const pskPath = require("swarmutils").path;
    productLanguages.forEach(prodLang => {
      languagesMap[prodLang] = pskPath.join(this.getProductPathToXmlType(), prodLang);
    });
    batchLanguages.forEach(batchLang => {
      languagesMap[batchLang] = pskPath.join(this.getBatchPathToXmlType(), batchLang);
    })
    return languagesMap;
  }

  getErrorMessageElement(errorMessage) {
    let pskLabel = document.createElement("psk-label");
    pskLabel.className = "scan-error-message";
    pskLabel.label = errorMessage;
    return pskLabel;
  }

  getAvailableLanguagesForXmlType(callback) {
    this.mergeAvailableLanguages().then(languagesMap => {
      callback(undefined, languageUtils.normalizeLanguages(Object.keys(languagesMap)));
    }).catch(callback)
  }

}

module.exports = XmlDisplayService;

},{"../../GTIN_SSI":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_SSI.js","../../constants/constants.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../../utils/CommonUtils.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","../../utils/Languages.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\Languages.js","../../utils/htmlSanitize":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\htmlSanitize.js","./Acodis_StyleSheet.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\XMLDisplayService\\Acodis_StyleSheet.js","./leafletXSL.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\XMLDisplayService\\leafletXSL.js","opendsu":false,"swarmutils":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\XMLDisplayService\\leafletXSL.js":[function(require,module,exports){
const xslContent = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="urn:hl7-org:v3"
                xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="urn:hl7-org:v3 https://www.accessdata.fda.gov/spl/schema/spl.xsd">
    <xsl:output method="html"/>

    <!--setting identity transformation-->
    <xsl:template match="@*|node()">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="xs:document">
        <div class="accordion">
            <xsl:apply-templates select="@*|node()"/>
        </div>
    </xsl:template>

    <xsl:template match="xs:document/xs:component">
        <xsl:apply-templates select="@*|node()"/>
    </xsl:template>

    <xsl:template match="xs:component/xs:structuredBody">
        <xsl:apply-templates select="@*|node()"/>
    </xsl:template>

    <xsl:template match="xs:structuredBody/xs:component">
        <xsl:apply-templates select="@*|node()"/>
    </xsl:template>

    <xsl:template match="xs:paragraph">
        <p>
            <xsl:apply-templates select="@*|node()"/>
        </p>
    </xsl:template>

    <xsl:template match="xs:list">
        <ul>
            <xsl:apply-templates select="@*|node()"/>
        </ul>
    </xsl:template>

    <xsl:template match="xs:item">
        <li>
            <xsl:apply-templates select="@*|node()"/>
        </li>
    </xsl:template>

    <xsl:template match="xs:linkHtml">
        <xsl:variable name="_href">
            <xsl:value-of select="@href"/>
        </xsl:variable>
        <xsl:variable name="firstLetter" select="substring($_href,1,1)"/>
        <xsl:choose>
            <xsl:when test="$firstLetter != '#'">
                <a target="_blank">
                    <xsl:attribute name="href">
                        <xsl:value-of select="@href"/>
                    </xsl:attribute>
                    <xsl:value-of select="."/>
                </a>
            </xsl:when>
            <xsl:otherwise>
                <span class="leaflet-link">
                    <xsl:attribute name="linkUrl">
                        <xsl:value-of select="@href"/>
                    </xsl:attribute>
                    <xsl:value-of select="."/>
                </span>
            </xsl:otherwise>
        </xsl:choose>

    </xsl:template>

    <xsl:template match="xs:section">
        <xsl:choose>
            <xsl:when test="xs:code/@displayName != 'SPL LISTING DATA ELEMENTS SECTION'">
                <div class="leaflet-accordion-item">
                    <xsl:attribute name="sectionCode">
                        <xsl:value-of select="xs:code/@code"/>
                    </xsl:attribute>
                    <h5>
                        <!--<xsl:value-of select="xs:code/@displayName"/>-->
                        <xsl:variable name="partialTitle" select="substring(xs:code/@displayName,2)"/>
                        <xsl:variable name="firstLetter" select="substring(xs:code/@displayName,1,1)"/>
                        <xsl:variable name="modifiedTitle">
                            <xsl:value-of
                                    select="concat($firstLetter,translate($partialTitle,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'))"/>
                        </xsl:variable>
                        <xsl:value-of select="$modifiedTitle"/>
                    </h5>
                    <div class="leaflet-accordion-item-content">
                        <xsl:apply-templates select="@*|node()"/>
                    </div>
                </div>
            </xsl:when>
            <xsl:otherwise></xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="xs:section/xs:component/xs:section">
        <div>
            <h3>
                <!--<xsl:value-of select="xs:code/@displayName"/>-->
                <xsl:variable name="partialTitle" select="substring(xs:code/@displayName,2)"/>
                <xsl:variable name="firstLetter" select="substring(xs:code/@displayName,1,1)"/>
                <xsl:variable name="modifiedTitle">
                    <xsl:value-of
                            select="concat($firstLetter,translate($partialTitle,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'))"/>
                </xsl:variable>
                <xsl:value-of select="$modifiedTitle"/>
            </h3>
            <div>
                <xsl:apply-templates select="@*|node()"/>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="xs:content">
        <xsl:choose>
            <xsl:when test="@styleCode = 'bold'">
                <b>
                    <xsl:value-of select="."/>
                </b>
            </xsl:when>
            <xsl:when test="@styleCode = 'underline'">
                <u>
                    <xsl:value-of select="."/>
                </u>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="."/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="xs:renderMultiMedia">
        <xsl:apply-templates select="//xs:observationMedia[@ID=current()/@referencedObject]"/>
    </xsl:template>

    <xsl:template match="xs:observationMedia">
        <img>
            <xsl:attribute name="src">
                <xsl:value-of select="concat($resources_path, xs:value/xs:reference/@value)"/>
            </xsl:attribute>
            <xsl:attribute name="alt">
                <xsl:value-of select="xs:text"/>
            </xsl:attribute>
        </img>
    </xsl:template>

    <xsl:template match="xs:document/xs:title">
        <accordion-item>
            <xsl:attribute name="shadow"/>
            <xsl:attribute name="title">
                Highlights of prescribing information
            </xsl:attribute>
            <!-- <xsl:attribute name="opened">
                opened
            </xsl:attribute> -->
            <div class="accordion-item-content" slot="item-content">
                <xsl:apply-templates select="@*|node()"/>
            </div>
        </accordion-item>
    </xsl:template>

    <!--nodes or attributes that we need to hide for a cleaner output-->
    <xsl:template
            match="xs:author|xs:id|xs:document/xs:code|xs:document/xs:effectiveTime|xs:document/xs:setId|xs:document/xs:versionNumber">
        <!--hide selected nodes-->
    </xsl:template>
</xsl:stylesheet>`

module.exports = xslContent;

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\index.js":[function(require,module,exports){
module.exports = {
	SharedDBStorageService: require("./SharedDBStorageService"),
	DSUStorage: require("./NodeDSUStorage"),
	LogService : require("./LogService"),
	getMessageQueuingServiceInstance: () => require("./MessageQueuingService").getMessageQueuingServiceInstance(),
	ModelMessageService: require("./ModelMessageService")
}

},{"./LogService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\LogService.js","./MessageQueuingService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\MessageQueuingService.js","./ModelMessageService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\ModelMessageService.js","./NodeDSUStorage":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\NodeDSUStorage.js","./SharedDBStorageService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\SharedDBStorageService.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js":[function(require,module,exports){
function getBloomFilterSerialisation(arr, bfSerialisation) {
  let crypto = require("opendsu").loadAPI("crypto");
  let bf;
  if (bfSerialisation) {
    bf = crypto.createBloomFilter(bfSerialisation);
  } else {
    bf = crypto.createBloomFilter({estimatedElementCount: arr.length, falsePositiveTolerance: 0.000001});
  }
  arr.forEach(sn => {
    bf.insert(sn);
  });
  return bf
}

function convertDateTOGMTFormat(date) {
  let formatter = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: "short",
    monthday: "short",
    timeZone: 'GMT'
  });

  let arr = formatter.formatToParts(date);
  let no = {};
  arr.forEach(item => {
    no[item.type] = item.value;
  })
  let {year, month, day, hour, minute} = no;

  let offset = -date.getTimezoneOffset();
  let offset_min = offset % 60;
  if (!offset_min) {
    offset_min = "00"
  }
  offset = offset / 60;
  let offsetStr = "GMT ";
  if (offset) {
    if (offset > 0) {
      offsetStr += "+";
    }
    offsetStr += offset;
    offsetStr += ":";
    offsetStr += offset_min;
  }

  return `${year} ${month} ${day} ${hour}:${minute} ${offsetStr}`;
}

/**
 * https://gist.github.com/jonleighton/958841#gistcomment-2839519
 * @param arrayBuffer
 * @returns {string}
 */

let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Use a lookup table to find the index.
let lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

arrayBufferToBase64 = (arrayBuffer) => {
  let bytes = new Uint8Array(arrayBuffer),
    i, len = bytes.length, base64 = "";

  for (i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if ((len % 3) === 2) {
    base64 = base64.substring(0, base64.length - 1) + "=";
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + "==";
  }

  return base64;
}

/**
 * @param base64
 * @returns {ArrayBuffer}
 */
base64ToArrayBuffer = (base64) => {
  let bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }

  let arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arraybuffer;
};

const bytesToBase64 = (bytes) => {
  const base64abc = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"
  ];

  let result = '', i, l = bytes.length;
  for (i = 2; i < l; i += 3) {
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[((bytes[i - 1] & 0x0F) << 2) | (bytes[i] >> 6)];
    result += base64abc[bytes[i] & 0x3F];
  }
  if (i === l + 1) { // 1 octet yet to write
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[(bytes[i - 2] & 0x03) << 4];
    result += "==";
  }
  if (i === l) { // 2 octets yet to write
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[(bytes[i - 1] & 0x0F) << 2];
    result += "=";
  }
  return result;
}

function getImageAsBase64(imageData) {
  if (typeof imageData === "string") {
    return imageData;
  }
  if (!(imageData instanceof Uint8Array)) {
    imageData = new Uint8Array(imageData);
  }
  let base64Image = bytesToBase64(imageData);
  base64Image = `data:image/png;base64, ${base64Image}`;
  return base64Image;
}

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * converts date from ISO (YYYY-MM-DD) to YYYY-HM, where HM comes from human name for the month, i.e. 2021-DECEMBER
 * @param {string} dateString
 */
function convertFromISOtoYYYY_HM(dateString, useFullMonthName, separator) {
  const splitDate = dateString.split('-');
  const month = parseInt(splitDate[1]);
  let separatorString = "-";
  if (typeof separator !== "undefined") {
    separatorString = separator;
  }
  if (useFullMonthName) {
    return `${splitDate[2]} ${separatorString} ${monthNames[month - 1]} ${separatorString} ${splitDate[0]}`;
  }
  return `${splitDate[2]} ${separatorString} ${monthNames[month - 1].slice(0, 3)} ${separatorString} ${splitDate[0]}`;
}

function convertFromGS1DateToYYYY_HM(gs1DateString) {
  let year = "20" + gs1DateString.slice(0, 2);
  let month = gs1DateString.slice(2, 4);
  let day = gs1DateString.slice(4);
  return `${day} - ${monthNames[month - 1].slice(0, 3)} - ${year}`
}

function getTimeSince(date) {

  let seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let month = new Date(date).getMonth() + 1;
  let monthSeconds = 31 * 24 * 60 * 60;
  if (month === 2) {
    monthSeconds = 28 * 24 * 60 * 60;
  }
  if ([4, 6, 9, 11].includes(month)) {
    monthSeconds = 30 * 24 * 60 * 60;
  }

  if (seconds > monthSeconds) {
    return
  }
  let interval = seconds / (24 * 60 * 60);
  if (interval >= 1) {
    return Math.floor(interval) + (interval >= 2 ? " days" : " day");
  }
  interval = seconds / (60 * 60);
  if (interval >= 1) {
    return Math.floor(interval) + (interval >= 2 ? " hours" : " hour");
  }
  interval = seconds / 60;
  if (interval >= 1) {
    return Math.floor(interval) + (interval >= 2 ? " minutes" : " minute");
  }
  return seconds + (seconds >= 2 ? " seconds" : " second");
}

function getDateForDisplay(date) {
  if (date.slice(0, 2) === "00") {
    return date.slice(5);
  }
  return date;
}

function getRecordPKey(gtinSSI, gs1Fields) {
  if (typeof gtinSSI !== "string") {
    gtinSSI = gtinSSI.getIdentifier();
  }
  return `${gtinSSI}${gs1Fields.batchNumber || "-"}|${gs1Fields.serialNumber}|${gs1Fields.expiry}`;
}

function getBatchMetadataPK(productCode, batch) {
  return `p_${productCode} | b_${batch}`;
}

//convert date to last date of the month for 00 date
function convertToLastMonthDay(date) {
  let expireDateConverted = date.replace("00", "01");
  expireDateConverted = new Date(expireDateConverted.replaceAll(' ', ''));
  expireDateConverted.setFullYear(expireDateConverted.getFullYear(), expireDateConverted.getMonth() + 1, 0);
  expireDateConverted = expireDateConverted.getTime();
  return expireDateConverted;
}


module.exports = {
  base64ToArrayBuffer,
  arrayBufferToBase64,
  convertDateTOGMTFormat,
  getBloomFilterSerialisation,
  getImageAsBase64,
  bytesToBase64,
  convertFromISOtoYYYY_HM,
  convertFromGS1DateToYYYY_HM,
  getRecordPKey,
  getDateForDisplay,
  convertToLastMonthDay,
  getTimeSince,
  getBatchMetadataPK
}

},{"opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\DBUtils.js":[function(require,module,exports){
createOrUpdateRecord = async (storageService, logData, data) => {
  let dbRecord;
  try {
    dbRecord = await $$.promisify(storageService.getRecord, storageService)(logData.table, logData.pk);
  } catch (e) {
    //possible issue on db.
  }

  if (dbRecord) {
    await $$.promisify(storageService.updateRecord, storageService)(logData.table, logData.pk, data);
  } else {
    await $$.promisify(storageService.addIndex, storageService)(logData.table, "__timestamp");
    await $$.promisify(storageService.insertRecord, storageService)(logData.table, logData.pk, data);
  }
}

module.exports = {
  createOrUpdateRecord
}

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\DSUFabricUtils.js":[function(require,module,exports){
const openDSU = require("opendsu");
const resolver = openDSU.loadAPI("resolver");
const UploadTypes = require("./UploadTypes");
const Languages = require("./Languages");
const constants = require("../constants/constants");
const utils = require("./CommonUtils");

const LEAFLET_CARD_STATUS = {
  NEW: "add",
  UPDATE: "update",
  EXISTS: "exists",
  DELETE: "delete"
}

function generateCard(action, type, code, files, videoSource) {
  let card = {
    action: action,
    type: {value: type},
    language: {value: code},
    files: files,
    videoSource: videoSource
  };
  card.type.label = UploadTypes.getLanguage(type);
  card.language.label = Languages.getLanguageName(code);
  return card;
}

function getXMLFileContent(files, callback) {
  let xmlFiles = files.filter((file) => file.name.endsWith('.xml'));

  if (xmlFiles.length === 0) {
    return callback(new Error("No xml files found."))
  }
  getBase64FileContent(xmlFiles[0], callback)
}

async function getOtherCardFiles(files, callback) {
  let anyOtherFiles = files.filter((file) => !file.name.endsWith('.xml'))

  let filesContent = [];
  for (let i = 0; i < anyOtherFiles.length; i++) {
    let file = anyOtherFiles[i];
    filesContent.push({
      filename: file.name,
      fileContent: await $$.promisify(getBase64FileContent)(file)
    })
  }
  callback(undefined, filesContent);
}

function getBase64FileContent(file, callback) {
  let fileReader = new FileReader();

  fileReader.onload = function (evt) {
    let arrayBuffer = fileReader.result;
    let base64FileContent = arrayBufferToBase64(arrayBuffer);
    callback(undefined, base64FileContent);
  }

  fileReader.readAsArrayBuffer(file);
}

function generateRandom(n) {
  let add = 1,
    max = 12 - add;

  if (n > max) {
    return generateRandom(max) + generateRandom(n - max);
  }

  max = Math.pow(10, n + add);
  let min = max / 10; // Math.pow(10, n) basically
  let number = Math.floor(Math.random() * (max - min + 1)) + min;

  return ("" + number).substring(add);
}

async function createEpiMessages(data, attachedTo) {
  let cardMessages = [];

  for (let i = 0; i < data.cards.length; i++) {
    let card = data.cards[i];

    if (card.action !== LEAFLET_CARD_STATUS.EXISTS) {

      let cardMessage = {
        messageTypeVersion: data.messageTypeVersion,
        senderId: data.senderId,
        receiverId: "",
        messageId: generateRandom(13),
        messageDateTime: data.messageDateTime,
        token: "",
        action: card.action,
        language: card.language.value,
        messageType: card.type.value,

      }
      try {
        if (card.action !== LEAFLET_CARD_STATUS.DELETE) {
          cardMessage.xmlFileContent = await $$.promisify(getXMLFileContent)(card.files);
          cardMessage.otherFilesContent = await $$.promisify(getOtherCardFiles)(card.files);
        }
      } catch (e) {
        console.log('err ', e);
      }

      if (attachedTo === "product") {
        cardMessage.productCode = data.code;
      } else {
        if (data.productCode) {
          cardMessage.productCode = data.productCode;
        }
        cardMessage.batchCode = data.code;
      }
      cardMessages.push(cardMessage);
    }
  }


  return cardMessages;
}

async function getLanguageTypeCards(model, dsuObj, folderName) {
  let cards = [];
  let folders = await $$.promisify(dsuObj.listFolders)(`/${folderName}`);
  for (const languageCode of folders) {
    let files = await $$.promisify(dsuObj.listFiles)(`/${folderName}/${languageCode}`);
    let videoSource = "";
    if (model.videos && model.videos[`${folderName}/${languageCode}`]) {
      videoSource = atob(model.videos[`${folderName}/${languageCode}`]);
    }
    cards.push(generateCard(LEAFLET_CARD_STATUS.EXISTS, `${folderName}`, languageCode, files, videoSource));
  }
  return cards;
}

function getDSUAttachments(model, disabledFeatures, callback) {
  const gtinResolver = require("gtin-resolver");
  const config = openDSU.loadAPI("config");
  config.getEnv("epiDomain", async (err, domain) => {
    if (err) {
      return callback(err);
    }

    const subdomain = await $$.promisify(config.getEnv)("epiSubdomain")
    let gtinSSI;
    let mountPath;
    if (model.batchNumber) {
      gtinSSI = gtinResolver.createGTIN_SSI(domain, subdomain, model.gtin, model.batchNumber);
      mountPath = constants.BATCH_DSU_MOUNT_POINT;
    } else {
      gtinSSI = gtinResolver.createGTIN_SSI(domain, subdomain, model.gtin)
      mountPath = constants.PRODUCT_DSU_MOUNT_POINT;
    }

    resolver.loadDSU(gtinSSI, async (err, constDSU) => {
      if (err) {
        return callback(err);
      }

      //used temporarily to avoid the usage of dsu cached instances which are not up to date
      try {
        const context = await $$.promisify(constDSU.getArchiveForPath)(mountPath);
        let dsuObj = context.archive;
        await $$.promisify(dsuObj.load)();
        let languageTypeCards = [];
        if (!disabledFeatures.includes("01")) {
          languageTypeCards = languageTypeCards.concat(await getLanguageTypeCards(model, dsuObj, "leaflet"));
        }
        if (!disabledFeatures.includes("04")) {
          languageTypeCards = languageTypeCards.concat(await getLanguageTypeCards(model, dsuObj, "smpc"));
        }

        try {
          let stat = await $$.promisify(dsuObj.stat)(constants.PRODUCT_IMAGE_FILE)
          if (stat.type === "file") {
            let data = await $$.promisify(dsuObj.readFile)(constants.PRODUCT_IMAGE_FILE);
            let productPhoto = utils.getImageAsBase64(data);
            return callback(undefined, {languageTypeCards: languageTypeCards, productPhoto: productPhoto});
          }
        } catch (err) {
          // if model is not a product or there is no image in dsu do not return a product photo
        }

        return callback(undefined, {languageTypeCards: languageTypeCards});
      } catch (e) {
        return callback(e);
      }
    });
  });
}

module.exports = {
  generateCard,
  createEpiMessages,
  LEAFLET_CARD_STATUS,
  getDSUAttachments
}

},{"../constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","./CommonUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","./Languages":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\Languages.js","./UploadTypes":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\UploadTypes.js","gtin-resolver":"gtin-resolver","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\Languages.js":[function(require,module,exports){
const languages = [
  {"code": "bg", "name": "Bulgarian", "nativeName": "Български език"},
  {"code": "zh", "name": "Chinese", "nativeName": "中文 (Zhōngwén), 汉语, 漢語"},
  {"code": "hr", "name": "Croatian", "nativeName": "hrvatski"},
  {"code": "cs", "name": "Czech", "nativeName": "Česky, čeština"},
  {"code": "da", "name": "Danish", "nativeName": "Dansk"},
  {"code": "nl", "name": "Dutch", "nativeName": "Nederlands, Vlaams"},
  {"code": "en", "name": "English", "nativeName": "English"},
  {"code": "et", "name": "Estonian", "nativeName": "Eesti, eesti keel"},
  {"code": "fi", "name": "Finnish", "nativeName": "Suomi, suomen kieli"},
  {"code": "fr", "name": "French", "nativeName": "Français"},
  {"code": "ka", "name": "Georgian", "nativeName": "ქართული"},
  {"code": "de", "name": "German", "nativeName": "Deutsch"},
  {"code": "el", "name": "Greek, Modern", "nativeName": "Ελληνικά"},
  {"code": "he", "name": "Hebrew (modern)", "nativeName": "עברית"},
  {"code": "hi", "name": "Hindi", "nativeName": "हिन्दी, हिंदी"},
  {"code": "hu", "name": "Hungarian", "nativeName": "Magyar"},
  {"code": "id", "name": "Indonesian", "nativeName": "Bahasa Indonesia"},
  {"code": "it", "name": "Italian", "nativeName": "Italiano"},
  {"code": "ja", "name": "Japanese", "nativeName": "日本語 (にほんご／にっぽんご)"},
  {"code": "ko", "name": "Korean", "nativeName": "한국어 (韓國語), 조선말 (朝鮮語)"},
  {"code": "lt", "name": "Lithuanian", "nativeName": "Lietuvių kalba"},
  {"code": "lv", "name": "Latvian", "nativeName": "Latviešu valoda"},
  {"code": "mk", "name": "Macedonian", "nativeName": "Македонски јазик"},
  {"code": "no", "name": "Norwegian", "nativeName": "Norsk"},
  {"code": "pa", "name": "Panjabi, Punjabi", "nativeName": "ਪੰਜਾਬੀ, پنجابی‎"},
  {"code": "pl", "name": "Polish", "nativeName": "Polski"},
  {"code": "pt", "name": "Portuguese", "nativeName": "Português"},
  {"code": "ro", "name": "Romanian", "nativeName": "Română"},
  {"code": "ru", "name": "Russian", "nativeName": "Русский язык"},
  {"code": "sr", "name": "Serbian", "nativeName": "Српски језик"},
  {"code": "sk", "name": "Slovak", "nativeName": "Slovenčina"},
  {"code": "es", "name": "Spanish; Castilian", "nativeName": "Español, Castellano"},
  {"code": "sv", "name": "Swedish", "nativeName": "Svenska"},
  {"code": "th", "name": "Thai", "nativeName": "ไทย"},
  {"code": "tr", "name": "Turkish", "nativeName": "Türkçe"},
  {"code": "uk", "name": "Ukrainian", "nativeName": "Українська"},
  {"code": "vi", "name": "Vietnamese", "nativeName": "Tiếng Việt"}
];

function getListAsVM() {
  let result = [];
  languages.forEach(language => {
    result.push({label: language.name, value: language.code});
  });

  return result;
}

function getLanguageFromCode(code) {
  const language = languages.find(language => language.code === code)
  if (typeof language === "undefined") {
    throw Error(`The language code ${code} does not match with any of the known languages.`)
  }
  return language;
}

function getLanguageFromName(name) {
  const language = languages.find(language => language.name.includes(name));
  if (typeof language === "undefined") {
    throw Error(`The language name ${name} does not match with any of the known languages.`)
  }
  return language;
}

function createVMItem(language) {
  return {label: language.name, value: language.code, nativeName: language.nativeName}
}

function normalizeLanguage(language) {
  switch (typeof language) {
    case "string":
      if (language.length === 2) {
        return getLanguageAsItemForVMFromCode(language);
      }
      return getLanguageAsItemForVMFromName(language);

    case "object":
      if (typeof language.value !== "undefined") {
        return language;
      }
      if (typeof language.code !== "undefined") {
        return getLanguageAsItemForVMFromCode(language.code);
      }

      throw Error("Invalid language format");
    default:
      throw Error(`The language should be of type string or object. Provided type ${typeof language}`);
  }
}

function normalizeLanguages(languages) {
  return languages.map(language => normalizeLanguage(language));
}

function getAllLanguagesAsVMItems() {
  let result = [];
  languages.forEach(language => {
    result.push(createVMItem(language));
  });

  return result;
}

function getList() {
  return languages;
}

function getLanguageName(code) {
  let language = getLanguageFromCode(code);
  return language.name;
}

function getLanguageCode(name) {
  let language = getLanguageFromName(name);
  return language.code;
}

function getLanguageAsItemForVMFromCode(code) {
  const language = getLanguageFromCode(code);
  return createVMItem(language);
}

function getLanguageAsItemForVMFromName(name) {
  const language = getLanguageFromName(name);
  return createVMItem(language);
}

function getLanguagesAsVMItemsFromNames(languageNames) {
  const languages = languageNames.map(languageName => getLanguageFromName(languageName));
  const vmItems = languages.map(language => createVMItem(language));
  return vmItems;
}

function getLanguagesAsVMItemsFromCodes(codes) {
  const languages = codes.map(code => getLanguageFromName(code));
  const vmItems = languages.map(language => createVMItem(language));
  return vmItems;
}

function getLanguagesAsVMItems(languageList) {
  const vmItems = languageList.map(language => createVMItem(language));
  return vmItems;
}

function getLanguageCodes() {
  return languages.map(lang => {
    return lang.code
  })
}

function getLanguageRegex() {
  let langCodes = getLanguageCodes();
  let regexString = "^("
  langCodes.forEach(code => {
    regexString = regexString + code + "|"
  })
  regexString.slice(0, -1);
  regexString = regexString + ")$"
  return new RegExp(regexString);
}

module.exports = {
  getListAsVM,
  getList,
  getLanguageFromCode,
  getAllLanguagesAsVMItems,
  getLanguageName,
  getLanguageCode,
  getLanguageAsItemForVMFromCode,
  getLanguageAsItemForVMFromName,
  getLanguagesAsVMItemsFromNames,
  getLanguagesAsVMItemsFromCodes,
  getLanguagesAsVMItems,
  normalizeLanguages,
  getLanguageCodes,
  getLanguageRegex
}

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js":[function(require,module,exports){
const constants = require("../constants/constants");
const utils = require("../utils/CommonUtils.js");
let instance;
const dbMessageFields = ["pk", "meta", "did", "__timestamp", "$loki", "context", "keySSI", "epiProtocol", "version"];

function MappingLogService(storageService, logService) {
  this.storageService = storageService;
  this.logService = logService;

  this.getMappingLogs = (callback) => {
    this.storageService.filter(constants.IMPORT_LOGS, "__timestamp > 0", callback);
  }

  this.logSuccessAction = async (message, data, alreadyExists, diffs, DSU) => {
    let logData = getLogData(message, data, alreadyExists);
    logData.status = constants.SUCCESS_MAPPING_STATUS;
    logData.auditLogData.diffs = diffs;
    let keySSIObj = await $$.promisify(DSU.getKeySSIAsObject)();
    logData.auditLogData.anchorId = await $$.promisify(keySSIObj.getAnchorId)();
    const latestHashLink = await $$.promisify(DSU.getLatestAnchoredHashLink)();
    logData.auditLogData.hashLink = latestHashLink.getIdentifier();
    await logAction(logData);
    return logData;
  }

  this.logFailAction = async (message, data, status) => {
    let logData = getLogData(message, data || status, true, status);
    let logStatus = status ? status : constants.FAILED_MAPPING_STATUS;
    logData.status = logStatus;
    logData.auditLogData.logType = constants.LOG_TYPES.FAILED_ACTION;
    logData.auditLogData.status = logStatus;
    logData.auditLogData.reason = "Failed - See details";

    await logAction(logData);
    return logData;
  }

  let logAction = async (logData, message) => {
    if (typeof this.logService !== "undefined") {
      await $$.promisify(this.logService.log, this.logService)(logData.auditLogData);
    }
    try {
      await $$.promisify(this.storageService.addIndex, this.storageService)(constants.IMPORT_LOGS, "__timestamp");
      await $$.promisify(this.storageService.insertRecord, this.storageService)(constants.IMPORT_LOGS, logData.itemCode + "|" + logData.timestamp, logData);

    } catch (e) {
      console.log(e);
    }
  }

  let cleanMessage = (message) => {
    let cleanMessage = JSON.parse(JSON.stringify(message));
    dbMessageFields.forEach(field => {
      if (field in cleanMessage) {
        delete cleanMessage[field]
      }
    })
    return cleanMessage;
  }

  this.getDiffsForAudit = (data, prevData) => {
    if (prevData && Object.keys(prevData).length > 0) {
      prevData = cleanMessage(prevData);
      data = cleanMessage(data);

      let diffs = Object.keys(data).reduce((diffs, key) => {
        if (JSON.stringify(prevData[key]) === JSON.stringify(data[key])) return diffs
        return {
          ...diffs, [key]: {oldValue: prevData[key], newValue: data[key]}
        }
      }, {})
      return diffs;
    }
  }

  let getLogData = (message, data, alreadyExists) => {
    message = cleanMessage(message);
    let resultObj = {
      itemCode: "unknown",
      itemType: "unknown",
      timestamp: new Date().getTime(),
      message: message,
      auditLogData: {
        username: message.senderId,
        auditId: message.messageId + "|" + message.senderId + "|" + message.messageDateTime
      },
      metadata: {}
    };
    let auditLogType = "";

    try {
      switch (message.messageType) {
        case constants.MESSAGE_TYPES.BATCH:
          resultObj.reason = alreadyExists ? "Edited batch" : "Created batch";
          resultObj.mappingLogMessage = alreadyExists ? "updated" : "created";
          resultObj.pk = utils.getBatchMetadataPK(message.batch.productCode, message.batch.batch);
          resultObj.itemCode = message.batch.batch || resultObj.itemCode;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.BATCHES_STORAGE_TABLE;
          auditLogType = constants.LOG_TYPES.BATCH;
          resultObj.metadata.gtin = message.batch.productCode;
          break;
        case constants.MESSAGE_TYPES.PRODUCT:
          resultObj.reason = alreadyExists ? "Edited product" : "Created product";
          resultObj.mappingLogMessage = alreadyExists ? "updated" : "created";
          resultObj.pk = message.product.productCode;
          resultObj.itemCode = message.product.productCode || resultObj.itemCode;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.PRODUCTS_TABLE;
          auditLogType = constants.LOG_TYPES.PRODUCT
          resultObj.metadata.gtin = message.product.productCode;
          break;
        case constants.MESSAGE_TYPES.PRODUCT_PHOTO:
          resultObj.reason = alreadyExists ? "Updated Product Photo" : "Edited Product Photo";
          resultObj.mappingLogMessage = alreadyExists ? "updated photo" : "created photo";
          resultObj.pk = message.productCode;
          resultObj.itemCode = message.productCode || resultObj.itemCode;
          resultObj.itemType = message.messageType;
          resultObj.table = constants.PRODUCTS_TABLE;
          auditLogType = constants.LOG_TYPES.PRODUCT_PHOTO;
          resultObj.metadata.attachedTo = "PRODUCT";
          resultObj.metadata.gtin = message.productCode;
          break;
        case constants.MESSAGE_TYPES.LEAFLET:
        case constants.MESSAGE_TYPES.SMPC:
          let leafletStatus = message.action.charAt(0).toUpperCase() + message.action.slice(1) + "ed";
          resultObj.reason = message.messageType === constants.MESSAGE_TYPES.LEAFLET ? `${leafletStatus} Leaflet` : `${leafletStatus} SMPC`;
          resultObj.mappingLogMessage = message.messageType === constants.MESSAGE_TYPES.LEAFLET ? `${leafletStatus} leaflet` : `${leafletStatus} SMPC`;
          resultObj.itemType = message.messageType;
          if (message.batchCode) {
            resultObj.metadata.attachedTo = "BATCH";
            resultObj.metadata.batch = message.batchCode;
            resultObj.itemCode = message.batchCode;
          } else {
            resultObj.metadata.attachedTo = "PRODUCT";
            resultObj.itemCode = message.productCode;
          }
          resultObj.metadata.gtin = message.productCode;
          auditLogType = constants.LOG_TYPES.LEAFLET_LOG;
          break;
        case constants.MESSAGE_TYPES.VIDEO_SOURCE:
          resultObj.reason = "Updated Video Source";
          resultObj.mappingLogMessage = "updated";
          resultObj.itemType = message.messageType;
          auditLogType = constants.LOG_TYPES.VIDEO_SOURCE;
          if (message.videos.batch) {
            resultObj.pk = message.videos.batch;
            resultObj.metadata.attachedTo = "BATCH";
            resultObj.metadata.batch = message.videos.batch;
            resultObj.itemCode = message.videos.batch;
            resultObj.table = constants.BATCHES_STORAGE_TABLE;
          } else {
            resultObj.pk = message.videos.productCode;
            resultObj.metadata.attachedTo = "PRODUCT";
            resultObj.itemCode = message.videos.productCode;
            resultObj.table = constants.PRODUCTS_TABLE;
          }
          resultObj.metadata.gtin = message.videos.productCode;
          break;
        default:
          throw new Error("Unknown message type");
      }
    } catch (err) {
      resultObj.reason = "Edit action";
      resultObj.mappingLogMessage = "failed";
      resultObj.itemCode = resultObj.itemCode || "unknown";
      resultObj.itemType = message.messageType || "unknown";
      resultObj.metadata.failReason = err.message;
      auditLogType = constants.LOG_TYPES.FAILED_ACTION;
    }

    resultObj.auditLogData.reason = resultObj.reason;
    resultObj.auditLogData.itemCode = resultObj.itemCode;
    resultObj.auditLogData.logType = auditLogType;
    resultObj.auditLogData.metadata = resultObj.metadata;
    resultObj.auditLogData.logInfo = message;
    resultObj.auditLogData.gtin = resultObj.metadata.gtin;
    return resultObj;
  }
}

module.exports = {
  createInstance: function (storageService, logService) {
    if (!instance) {
      instance = new MappingLogService(storageService, logService);
    }
    return instance;
  }
}

},{"../constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","../utils/CommonUtils.js":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\UploadTypes.js":[function(require,module,exports){
let types = [
  {name: "Leaflet", code: "leaflet", disabled: false, selected: false},
  {name: "SMPC", code: "smpc", disabled: false, selected: false}
];

module.exports = {
  getList() {
    return types;
  },
  getListAsVM(disabledFeatures) {
    let result = [];
    result.push({label: "Select a type", value: "", disabled: true, selected: false});
    if (disabledFeatures && disabledFeatures.length > 0) {
      disabledFeatures.forEach(feature => {
        types = types.map(item => {
          if (item.code === feature) {
            item.disabled = true;
          }
          return item;
        })
      })
    }
    types.forEach(type => {
      result.push({label: type.name, value: type.code, disabled: type.disabled, selected: type.selected});
    });

    let index = result.findIndex(item => item.disabled === false);
    if (index >= 0) {
      result[index].selected = true;
    }

    return result;
  },
  getLanguage(code) {
    return types.find(language => language.code === code).name;
  }
}

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js":[function(require,module,exports){
const errMap = require("opendsu").loadApi("m2dsu").getErrorsMap();

const errorUtils = require("../mappings/errors/errorUtils");
errorUtils.addMappingError("MVP1_RESTRICTED");

const itemValidator = function (messageValue, schemaObj, schemaKey) {

  if (!schemaObj.required && !messageValue) {
    return;
  }

  if (schemaObj.required && (!messageValue || ((typeof messageValue === "string") && !messageValue.trim()))) {
    invalidFields.push({field: schemaKey, message: `Required field`});
    return;
  }

  if (schemaObj.regex && !schemaObj.regex.test(messageValue)) {
    if (schemaKey === "messageTypeVersion") {
      invalidFields.push({field: schemaKey, message: `Wrong message version.`});
      return;
    }
    if (schemaKey === "marketId") {
      invalidFields.push({field: schemaKey, message: `not recognized`});
      return;
    }

    invalidFields.push({field: schemaKey, message: `Invalid format`});

    return;
  }

  if (schemaObj.type === "batchDate") {
    let resultDate;
    if (messageValue.length === 6) {
      let year = "20" + messageValue.slice(0, 2);
      let month = messageValue.slice(2, 4);
      let day = messageValue.slice(4, 6);
      if (day === "00") {
        day = "01";
      }
      resultDate = new Date(`${year}/${month}/${day}`);

    }
    if (!resultDate || resultDate.toString() === "Invalid Date") {
      invalidFields.push({
        field: schemaKey,
        message: `Wrong date format`
      });
    }

    return;
  }

  if ((schemaObj.type !== "array" && schemaObj.type !== typeof messageValue) || (schemaObj.type === "array" && !Array.isArray(messageValue))) {
    invalidFields.push({
      field: schemaKey,
      message: `Wrong type. Found ${typeof messageValue} , expected ${schemaObj.type}`
    });
    return;
  }
}

const schemaParser = function (message, schema) {
  const schemaObject = schema.properties;
  const schemaKeys = Object.keys(schemaObject);
  for (let i = 0; i < schemaKeys.length; i++) {
    const schemaKey = schemaKeys[i];
    if (schemaObject[schemaKey].type === "object") {
      if (!message[schemaKey]) {
        itemValidator(message[schemaKey], schemaObject[schemaKey], schemaKey);
      } else {
        schemaParser(message[schemaKey], schemaObject[schemaKey]);
      }
    }
    if (schemaObject[schemaKey].type === "array" && Array.isArray(message[schemaKey])) {
      message[schemaKey].forEach(msg => {
        if (schemaObject[schemaKey].items.type === "object") {
          schemaParser(msg, schemaObject[schemaKey].items)
        } else {
          itemValidator(msg, schemaObject[schemaKey].items, schemaKey);
        }

      })
    }
    if (schemaObject[schemaKey].type !== "object" && schemaObject[schemaKey].type !== "array") {
      if (!message[schemaKey] && schemaObject[schemaKey].defaultValue) {
        message[schemaKey] = schemaObject[schemaKey].defaultValue;
      } else {
        itemValidator(message[schemaKey], schemaObject[schemaKey], schemaKey);
      }
    }
  }

}
let invalidFields;
const validateMsgOnSchema = function (message, schema) {
  invalidFields = [];
  schemaParser(message, schema);
  if (invalidFields.length > 0) {
    return {
      valid: false, invalidFields: invalidFields
    }
  }
  return {
    valid: true
  }
}

async function validateMessageOnSchema(message, schema) {
  const msgValidation = validateMsgOnSchema(message, schema);
  if (!msgValidation.valid) {
    message.invalidFields = msgValidation.invalidFields;
    throw errMap.newCustomError(errMap.errorTypes.INVALID_MESSAGE_FORMAT, msgValidation.invalidFields);
  }
  return msgValidation;
}

const MVP1_DISABLED_DEFAULT_VALUES_MAP = {
  "flagEnableAdverseEventReporting": false,
  "flagEnableACFProductCheck": false,
  "healthcarePractitionerInfo": "SmPC",
  "snValid": [],
  "snRecalled": [],
  "snDecom": [],
  "flagEnableBatchRecallMessage": false,
  "flagEnableSNVerification": false,
  "flagEnableEXPVerification": false,
  "flagEnableExpiredEXPCheck": true,
  "recallMessage": "",
  "batchMessage": "",
  "flagEnableACFBatchCheck": false,
  "acdcAuthFeatureSSI": "",
  "acfBatchCheckURL": false,
  "snValidReset": false,
  "snRecalledReset": false,
  "snDecomReset": false
}

function validateMVP1Values(message, messageType) {
  let invalidFields = [];
  if (messageType === "videos") {
    throw errMap.newCustomError(errMap.errorTypes.MVP1_RESTRICTED, "videos");
    return;
  }
  let msg = message[messageType];
  Object.keys(MVP1_DISABLED_DEFAULT_VALUES_MAP).forEach(key => {
    if (msg[key] && JSON.stringify(msg[key]) !== JSON.stringify(MVP1_DISABLED_DEFAULT_VALUES_MAP[key])) {
      invalidFields.push({
        field: key,
        message: `MVP1 wrong filed value, expected: ${MVP1_DISABLED_DEFAULT_VALUES_MAP[key]}`
      });
    }
  })
  if (invalidFields.length > 0) {
    message.invalidFields = invalidFields;
    throw errMap.newCustomError(errMap.errorTypes.INVALID_MESSAGE_FORMAT, invalidFields);
    return;
  }
}

function validateGTIN(gtinValue) {
  const gtinMultiplicationArray = [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];

  if (isNaN(gtinValue)) {
    return {isValid: false, message: "GTIN should be a numeric value"};
  }
  let gtinDigits = gtinValue.split("");

  // TO DO this check is to cover all types of gtin. For the moment we support just 14 digits length. TO update also in leaflet-ssapp
  /*
  if (gtinDigits.length !== 8 && gtinDigits.length !== 12 && gtinDigits.length !== 13 && gtinDigits.length !== 14) {

    return {isValid: false, message: "GTIN length should be 8, 12, 13 or 14"};
  }
  */

  if (gtinDigits.length !== 14) {
    return {isValid: false, message: "GTIN length should be 14"};
  }
  let j = gtinMultiplicationArray.length - 1;
  let reszultSum = 0;
  for (let i = gtinDigits.length - 2; i >= 0; i--) {
    reszultSum = reszultSum + gtinDigits[i] * gtinMultiplicationArray[j];
    j--;
  }
  let validDigit = Math.floor((reszultSum + 10) / 10) * 10 - reszultSum;
  if (validDigit === 10) {
    validDigit = 0;
  }
  if (gtinDigits[gtinDigits.length - 1] != validDigit) {
    return {isValid: false, message: "Invalid GTIN. Last digit should be " + validDigit};
  }

  return {isValid: true, message: "GTIN is valid"};
}

module.exports = {
  validateMessageOnSchema,
  validateGTIN,
  validateMVP1Values
}


},{"../mappings/errors/errorUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\errors\\errorUtils.js","opendsu":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\htmlSanitize.js":[function(require,module,exports){
const checkIfBase64 = (str) => {
    const regex = /^([A-Za-z0-9+\/]{4})*([A-Za-z0-9+\/]{3}=|[A-Za-z0-9+\/]{2}==)?$/g;
    return regex.test(str);
}

const sanitize = (html) => {
    let clone = html;
    if ($$.Buffer.isBuffer(clone)) {
        clone = clone.toString();
    }

    if (checkIfBase64(clone)) {
        clone = $$.Buffer.from(clone, "base64").toString();
    }
    const regex = /(<iframe>([\s\S]*)<\/iframe>)|(<script>([\s\S]*)<\/script>)/g;

    if (regex.test(clone)) {
        throw Error(`The html contains forbidden tags`);
    }

    return html;
}

module.exports = {
    sanitize
}
},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\bloom-filter.js":[function(require,module,exports){
const sha2 = require("./crypto-hash-functions/sha2");
const linearFowlerNollVoJenkinsHashFunction = require("./hash-functions/linear-fowler–noll–vo-jenkins-hash-function");
const InMemoryBitCollectionStrategy = require("./in-memory-bit-collection-strategy");

const BITS_IN_BYTE = 8;

const DEFAULT_OPTIONS = {
    // bit count
    bitCount: null,
    // k hash functions count
    hashFunctionCount: null,
    // estimated number of elements from the collection
    estimatedElementCount: 0,
    // allowed probability of false positives
    falsePositiveTolerance: 0.000001,

    // default function that returns the element's hash
    hashFunction: linearFowlerNollVoJenkinsHashFunction,

    // crypto hash function that returns the element's hash
    cryptoHashFunction: sha2,
    // number of crypto hash functions to be used (will be used at first before the default hashFunction)
    cryptoHashFunctionCount: 0,
    // crypto hash function secret
    cryptoSecret: "secret",

    // strategy which interacts with the bit collection
    BitCollectionStrategy: InMemoryBitCollectionStrategy,
};

/**
 * Bloom filter implementation
 * https://en.wikipedia.org/wiki/Bloom_filter
 */

function BloomFilter(serialisation, options) {
    if (typeof serialisation !== "string") {
        options = serialisation;
        serialisation = null;
    }

    let serialisationData;

    this.options = { ...DEFAULT_OPTIONS, ...(options || { estimatedElementCount: 1 }) };

    if (serialisation) {
        serialisationOptions = JSON.parse(serialisation);
        const { data, ...filterOptions } = serialisationOptions;
        this.options = { ...this.options, ...filterOptions, ...(options || {}) };
        serialisationData = data;
        console.log({ filterOptions, options });
    }

    const { estimatedElementCount, falsePositiveTolerance, BitCollectionStrategy } = this.options;
    let { bitCount, hashFunctionCount } = this.options;

    if (estimatedElementCount) {
        if (!bitCount) {
            bitCount = Math.ceil(
                (-1 * estimatedElementCount * Math.log(falsePositiveTolerance)) / Math.pow(Math.log(2), 2)
            );
        }
        if (!hashFunctionCount) {
            hashFunctionCount = Math.ceil(Math.log(2) * (bitCount / estimatedElementCount));
        }
    }

    const byteCount = bitCount > BITS_IN_BYTE ? Math.ceil(bitCount / BITS_IN_BYTE) : 1;

    this.options = {
        ...this.options,
        bitCount,
        hashFunctionCount,
        byteCount,
    };

    this.bitCollectionStrategy = new BitCollectionStrategy({ ...this.options, data: serialisationData });
    console.log("Configuring Bloom filter ", this.options);
}

BloomFilter.prototype.bloomFilterSerialisation = function () {
    const {
        options: { estimatedElementCount, falsePositiveTolerance },
        bitCollectionStrategy,
    } = this;
    const serialisation = {
        estimatedElementCount,
        falsePositiveTolerance,
        data: bitCollectionStrategy.serialise(),
    };
    return JSON.stringify(serialisation);
};

BloomFilter.prototype.calculateHash = function (data, index) {
    const { options } = this;
    const { hashFunction, cryptoHashFunction, cryptoHashFunctionCount } = options;

    const mustUseCryptoHash = 0 < cryptoHashFunctionCount && index < cryptoHashFunctionCount;
    const currentIndexHashFunction = mustUseCryptoHash ? cryptoHashFunction : hashFunction;

    const hash = currentIndexHashFunction(data, index, options);
    return hash;
};

BloomFilter.prototype.insert = function (data) {
    const { bitCollectionStrategy, options } = this;
    const { hashFunctionCount } = options;

    for (let index = 0; index < hashFunctionCount; index++) {
        const hash = this.calculateHash(data, index);
        bitCollectionStrategy.setIndex(hash);
    }
};

BloomFilter.prototype.test = function (data) {
    const { bitCollectionStrategy, options } = this;
    const { hashFunctionCount } = options;

    for (let index = 0; index < hashFunctionCount; index++) {
        const hash = this.calculateHash(data, index);
        if (!bitCollectionStrategy.getIndex(hash)) {
            return false;
        }
    }

    return true;
};

module.exports = BloomFilter;

},{"./crypto-hash-functions/sha2":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\crypto-hash-functions\\sha2.js","./hash-functions/linear-fowler–noll–vo-jenkins-hash-function":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\hash-functions\\linear-fowler–noll–vo-jenkins-hash-function.js","./in-memory-bit-collection-strategy":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\in-memory-bit-collection-strategy.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\crypto-hash-functions\\sha2.js":[function(require,module,exports){
const crypto = require("crypto");

function linearFowlerNollVoJenkinsHashFunction(data, index, options) {
  const { cryptoSecret, bitCount } = options;

  const cryptoHash = crypto.createHash("sha256", cryptoSecret).update(data).digest().readUInt32BE();
  return ((index + 1) * cryptoHash) % bitCount;
}

module.exports = linearFowlerNollVoJenkinsHashFunction;

},{"crypto":false}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\hash-functions\\fowler–noll–vo-1a.js":[function(require,module,exports){
/**
 * Fowler–Noll–Vo hash function - FNV-1a hash variant
 * https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV-1a_hash
 */

//FNV constants.
const FNV_PRIME = 16777619;
const FNV_OFFSET_BASIS = 2166136261;

/**
FNV hash function. (32-bit version)
FNV step 1: hash = hash XOR byte.
FNV step 2: hash = hash * FNV_Prime.
*/
function fowlerNollVo1a(value) {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < value.length; ++i) {
    //Extract the 2 octets of value i.e. 16 bits (2 bytes).
    const c = value.charCodeAt(i);
    hash = xor(hash, c);
    hash = fnv_multiply(hash);
  }

  return hash >>> 0;
}

//FNV step 1:hash = hash XOR byte.
function xor(hash, byte) {
  return hash ^ byte;
}

//FNV step 2: hash = hash * FNV_Prime.
function fnv_multiply(hash) {
  hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  return hash;
}

module.exports = fowlerNollVo1a;

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\hash-functions\\jenkins.js":[function(require,module,exports){
/**
 * Jenkins hash function - one at a time hash function
 * https://en.wikipedia.org/wiki/Jenkins_hash_function
 */

function jenkins(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash += key.charCodeAt(i);
    hash += hash << 10;
    hash ^= hash >>> 6;
  }

  hash += hash << 3;
  hash ^= hash >>> 11;
  hash += hash << 15;
  return hash >>> 0;
}

module.exports = jenkins;

},{}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\hash-functions\\linear-fowler–noll–vo-jenkins-hash-function.js":[function(require,module,exports){
const fowlerNollVo1a = require("./fowler–noll–vo-1a");
const jenkins = require("./jenkins");

function linearFowlerNollVoJenkinsHashFunction(data, index, options) {
  const { bitCount } = options;
  return (fowlerNollVo1a(data) + index * jenkins(data)) % bitCount;
}

module.exports = linearFowlerNollVoJenkinsHashFunction;

},{"./fowler–noll–vo-1a":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\hash-functions\\fowler–noll–vo-1a.js","./jenkins":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\hash-functions\\jenkins.js"}],"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\in-memory-bit-collection-strategy.js":[function(require,module,exports){
function InMemoryBitCollectionStrategy(options) {
    let { byteCount, data } = options;

    this.buffer = new ArrayBuffer(byteCount);
    this.unit8 = new Uint8Array(this.buffer);

    if (data) {
        data.split(",").forEach((byteValue, idx) => {
            this.unit8[idx] = parseInt(byteValue, 10);
        });
    }
}

/**
 * Returns the serialised bytes
 */
InMemoryBitCollectionStrategy.prototype.serialise = function () {
    return this.unit8.toString();
};

/**
 * Returns the bit value at position 'index'.
 */
InMemoryBitCollectionStrategy.prototype.getIndex = function (index) {
    const value = this.unit8[index >> 3];
    const offset = index & 0x7;
    return (value >> (7 - offset)) & 1;
};

/**
 * Sets the bit value at specified position 'index'.
 */
InMemoryBitCollectionStrategy.prototype.setIndex = function (index) {
    const offset = index & 0x7;
    this.unit8[index >> 3] |= 0x80 >> offset;
};

/**
 * Clears the bit at position 'index'.
 */
InMemoryBitCollectionStrategy.prototype.clearIndex = function (index) {
    const offset = index & 0x7;
    this.unit8[index >> 3] &= ~(0x80 >> offset);
};

/**
 * Returns the byte length of this array buffer.
 */
InMemoryBitCollectionStrategy.prototype.length = function () {
    return this.unit8.byteLength;
};

module.exports = InMemoryBitCollectionStrategy;

},{}],"gtin-resolver/modules/psk-dbf":[function(require,module,exports){
const BloomFilter = require("./src/bloom-filter");
module.exports = BloomFilter;

},{"./src/bloom-filter":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\modules\\psk-dbf\\src\\bloom-filter.js"}],"gtin-resolver":[function(require,module,exports){
const openDSU = require("opendsu");
const resolver = openDSU.loadApi("resolver");
const GtinDSUFactory = require("./lib/GTIN_DSU_Factory");

resolver.registerDSUFactory("gtin", new GtinDSUFactory(resolver));
const {createGTIN_SSI, parseGTIN_SSI} = require("./lib/GTIN_SSI");
const DSUFabricFeatureManager = require("./lib/DSUFabricFeatureManager");
const LeafletFeatureManager = require("./lib/LeafletFeatureManager");
const LeafletInfoService = require("./lib/services/LeafletInfoService");
const DSUFabricUtils = require("./lib/utils/DSUFabricUtils");
const Languages = require("./lib/utils/Languages");
const UploadTypes = require("./lib/utils/UploadTypes");
const XMLDisplayService = require("./lib/services/XMLDisplayService/XMLDisplayService");
const utils = require("./lib/utils/CommonUtils");
const logUtils = require("./lib/utils/LogUtils");
const validationUtils = require("./lib/utils/ValidationUtils");
const versionTransformer = require("./lib/EpiVersionTransformer")
const constants = require("./lib/constants/constants");

module.exports = {
  createGTIN_SSI,
  parseGTIN_SSI,
  DSUFabricFeatureManager,
  LeafletFeatureManager,
  LeafletInfoService,
  DSUFabricUtils,
  UploadTypes,
  Languages,
  utils,
  logUtils,
  validationUtils,
  versionTransformer,
  constants,
  XMLDisplayService,
  loadApi: function (apiName) {
    switch (apiName) {
      case "mappings":
        return require("./lib/mappings");
      case "services":
        return require("./lib/services");
    }
  },
  getEPIMappingEngineForAPIHUB: function (server) {
    return require("./lib/apihubMappingEngine").getEPIMappingEngineForAPIHUB(server);
  },
  getEPIMappingEngineMessageResults: function (server) {
    return require("./lib/apihubMappingEngineMessageResults").getEPIMappingEngineMessageResults(server);
  },
  getWebLeaflet: function (server) {
    return require("./lib/leaflet-web-api").getWebLeaflet(server);
  },
  getGTINOwner: function (server){
    return require("./lib/gtinOwner").getGTINOwner(server);
  },
  getMessagesPipe: function () {
    const opendsu = require("opendsu");
    return opendsu.loadApi("m2dsu").getMessagesPipe();
  },
  getErrorsMap: function () {
    return require("opendsu").loadApi("m2dsu").getErrorsMap();
  },
  getMappingsUtils: function () {
    return require("./lib/utils/CommonUtils");
  }
}


},{"./lib/DSUFabricFeatureManager":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\DSUFabricFeatureManager.js","./lib/EpiVersionTransformer":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\EpiVersionTransformer.js","./lib/GTIN_DSU_Factory":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_DSU_Factory.js","./lib/GTIN_SSI":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\GTIN_SSI.js","./lib/LeafletFeatureManager":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\LeafletFeatureManager.js","./lib/apihubMappingEngine":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\apihubMappingEngine\\index.js","./lib/apihubMappingEngineMessageResults":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\apihubMappingEngineMessageResults\\index.js","./lib/constants/constants":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\constants\\constants.js","./lib/gtinOwner":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\gtinOwner\\index.js","./lib/leaflet-web-api":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\leaflet-web-api\\index.js","./lib/mappings":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\mappings\\index.js","./lib/services":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\index.js","./lib/services/LeafletInfoService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\LeafletInfoService.js","./lib/services/XMLDisplayService/XMLDisplayService":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\services\\XMLDisplayService\\XMLDisplayService.js","./lib/utils/CommonUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\CommonUtils.js","./lib/utils/DSUFabricUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\DSUFabricUtils.js","./lib/utils/Languages":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\Languages.js","./lib/utils/LogUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\LogUtils.js","./lib/utils/UploadTypes":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\UploadTypes.js","./lib/utils/ValidationUtils":"D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\lib\\utils\\ValidationUtils.js","opendsu":false}]},{},["D:\\projects\\axiologic\\epi-workspace-4\\gtin-resolver\\builds\\tmp\\gtinResolver_intermediar.js"])
                    ;(function(global) {
                        global.bundlePaths = {"gtinResolver":"build\\bundles\\gtinResolver.js"};
                    })(typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
                