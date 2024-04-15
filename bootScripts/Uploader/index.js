const FileReadableStreamAdapter = require("./FileReadableStreamAdapter");

const IS_NODE_ENV = typeof $$ !== "undefined" && $$.environmentType && $$.environmentType === "nodejs";

/**
 * Constructor
 *
 * @param {object} options
 * @param {string} options.inputName
 * @param {RawDossier} options.dossier
 * @param {string} options.uploadPath
 * @param {string} options.filename
 * @param {Array} options.allowedMimeTypes
 * @param {string} options.maxSize
 * @param {Boolean} options.preventOverwrite
 */
function Uploader(options) {
    this.inputName = null;
    this.dossier = null;
    this.filename = null; // Must be configured when doing a request body upload
    this.maxSize = null; // When not null file size validation is done
    this.allowedMimeTypes = null; // When not null, mime type validation is done
    this.uploadPath = null;
    this.preventOverwrite = false;
    this.uploadMultipleFiles = false;
    this.sizeMultiplier = {
        b: 1,
        k: 1000,
        m: 1000000,
    };

    this.configure(options);
}

// static method which creates/updates a given upload
Uploader.configureUploader = function (config, dossier, uploader) {
    config = config || {};

    if (!config.path) {
        throw new Error('Upload path is required. Ex: "POST /upload?path=/path/to/upload/folder"');
    }

    if (!config.input && !config.filename) {
        throw new Error(
            '"input" query parameter is required when doing multipart/form-data uploads or "filename" query parameter for request body uploads. Ex: POST /upload?input=files[] or POST /upload?filename=my-file.big'
        );
    }

    let uploadPath = config.path;
    if (uploadPath.substr(-1) !== "/") {
        uploadPath += "/";
    }

    let allowedTypes;
    if (typeof config.allowedTypes === "string" && config.allowedTypes.length) {
        allowedTypes = config.allowedTypes.split(",").filter((type) => type.length > 0);
    } else {
        allowedTypes = [];
    }
    const options = {
        inputName: config.input,
        filename: config.filename,
        maxSize: config.maxSize,
        allowedMimeTypes: allowedTypes,
        dossier,
        uploadPath: uploadPath,
        preventOverwrite: config.preventOverwrite,
    };

    if (!uploader) {
        uploader = new Uploader(options);
    } else {
        uploader.configure(options);
    }

    return uploader;
};


Uploader.prototype.Error = {
    UNKNOWN: "UNKNOWN_UPLOAD_ERROR",
    NO_FILES: "NO_FILES",
    INVALID_FILE: "INVALID_FILE",
    INVALID_TYPE: "INVALID_TYPE",
    MAX_SIZE_EXCEEDED: "MAX_SIZE_EXCEEDED",
    FILE_EXISTS: "FILE_EXISTS"
};

Uploader.prototype.configure = function (options) {
    options = options || {};

    if (
        (typeof options.inputName !== "string" || !options.inputName) &&
        (typeof options.filename !== "string" || !options.filename)
    ) {
        throw new Error("The input name or filename is required");
    }

    if (typeof options.dossier !== "object") {
        throw new Error("The dossier is required and must be an instance of RawDossier");
    }

    if (typeof options.uploadPath !== "string" || !options.uploadPath.length) {
        throw new Error("The upload path is missing");
    }

    this.inputName = options.inputName;
    this.dossier = options.dossier;
    this.uploadPath = options.uploadPath;
    this.preventOverwrite = Boolean(options.preventOverwrite);
    if (this.inputName) {
        this.uploadMultipleFiles = this.inputName.substr(-2) === "[]";
    }
    this.filename = options.filename || null;
    if (typeof options.maxSize === "number" || typeof options.maxSize === "string") {
        this.maxSize = options.maxSize;
    }

    if (Array.isArray(options.allowedMimeTypes)) {
        this.allowedMimeTypes = options.allowedMimeTypes;
    }
};

/**
 * @param {object|any} body
 * @throws {object}
 */
Uploader.prototype.validateRequestBody = function (body) {
    const inputName = this.inputName;
    const filename = this.filename;

    if (this.isMultipartUpload && !inputName) {
        const error = {
            message: `No files have been uploaded or the "input" parameter hasn't been set`,
            code: this.Error.NO_FILES,
        };
        throw error;
    }

    if (!this.isMultipartUpload && !filename) {
        const error = {
            message: `No files have been uploaded or the "filename" parameter hasn't been set`,
            code: this.Error.NO_FILES,
        };
        throw error;
    }

    const __uploadExists = () => {
        if (this.isMultipartUpload) {
            if (this.uploadMultipleFiles) {
                return Array.isArray(body[inputName]);
            }

            if (IS_NODE_ENV) {
                return !!body[inputName];
            }

            return body[inputName] instanceof File;
        }

        return body;
    };

    if (!__uploadExists()) {
        const error = {
            message: `No files have been uploaded or the "input"/"filename" parameters are missing`,
            code: this.Error.NO_FILES,
        };
        throw error;
    }
};

/**
 * Validate a single file
 *
 * @param {File} file
 * @throws {object}
 */
Uploader.prototype.validateFile = function (file) {
    if (!IS_NODE_ENV && !(file instanceof File)) {
        const error = {
            message: "File must be an instance of File",
            code: this.Error.INVALID_FILE,
        };
        throw error;
    }

    if (Array.isArray(this.allowedMimeTypes) && this.allowedMimeTypes.length) {
        const fileType = file.type;
        if (this.allowedMimeTypes.indexOf(fileType) === -1) {
            const error = {
                message: "File type is not allowed",
                code: this.Error.INVALID_TYPE,
            };
            throw error;
        }
    }

    if (this.maxSize !== null) {
        let unit = "b";
        if (typeof this.maxSize === "string") {
            unit = this.maxSize.substr("-1").toLowerCase();
        }

        const sizeMultiplier = this.sizeMultiplier[unit] || this.sizeMultiplier["b"];
        const maxSize = parseInt(this.maxSize, 10) * sizeMultiplier;

        if (isNaN(maxSize)) {
            const error = {
                message: `Invalid max size parameter: ${this.maxSize}`,
                code: this.Error.MAX_SIZE_EXCEEDED,
            };
            throw error;
        }

        if (file.size > maxSize) {
            const error = {
                message: `The file size must not exceed ${maxSize} bytes`,
                code: this.Error.MAX_SIZE_EXCEEDED,
            };
            throw error;
        }
    }
};

/**
 * Create a File object from the request body
 * @param {EventRequest} request
 * @return {File}
 */
Uploader.prototype.createFileFromRequest = function (request) {
    const requestBody = request.body;
    let file;
    if (IS_NODE_ENV) {
        file = {
            name: this.filename,
            content: requestBody,
            type: request.headers["content-type"] || "application/octet-stream",
            size: $$.Buffer.byteLength(requestBody),
        };
    } else {
        const type = request.get("Content-Type") || "application/octet-stream";
        file = new File([requestBody], this.filename, {
            type,
        });
    }

    return file;
};

/**
 * @param {File} file
 * @param {callback} callback
 */
Uploader.prototype.uploadFile = function (file, callback) {
    const destFile = `${this.uploadPath}${file.name}`;
    this.dossier.refresh((err) => {
        if (err) {
            return callback(err);
        }
        let uploadPath = this.uploadPath;
        if (uploadPath.substr(-1) === "/") {
            uploadPath = uploadPath.substr(0, uploadPath.length - 1);
        }

        const writeFile = () => {
            const doWriting = () => {
                this.dossier.writeFile(destFile, fileAsStreamOrBuffer, {ignoreMounts: false}, (err) => {
                    callback(err, {
                        path: destFile,
                    });
                });
            };

            let fileAsStreamOrBuffer;
            if (IS_NODE_ENV) {
                fileAsStreamOrBuffer = file.content;
                doWriting();
            } else {
                if (typeof file.stream === "function") {
                    fileAsStreamOrBuffer = new FileReadableStreamAdapter(file);
                    return doWriting();
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    fileAsStreamOrBuffer = e.target.result;
                    let sep = ";base64,";
                    if (fileAsStreamOrBuffer.indexOf(";base64,") !== -1) {
                        fileAsStreamOrBuffer = fileAsStreamOrBuffer.split(sep)[1];
                        fileAsStreamOrBuffer = atob(fileAsStreamOrBuffer);
                    }
                    return doWriting();
                };
                reader.onerror = function () {
                    reader.abort();
                };
                reader.onabort = function () {
                    return callback(reader.error);
                };
                reader.readAsDataURL(file);
            }
        };

        if (this.preventOverwrite) {
            // Check that file doesn't exist
            this.dossier.listFiles(uploadPath, (err, files) => {
                if (files) {
                    if (files.indexOf(file.name) !== -1) {
                        const err = {
                            message: "File exists",
                            code: this.Error.FILE_EXISTS,
                        };
                        return callback(err, {
                            path: destFile,
                        });
                    }
                }

                writeFile();
            });
        } else {
            writeFile();
        }
    });
};

/**
 * TODO: Support for uploading the request body payload
 * @param {EventRequest} request
 * @param {callback} callback
 */
Uploader.prototype.upload = function (request, callback) {
    if (IS_NODE_ENV) {
        this.isMultipartUpload =
            typeof request.body === "object" &&
            !(request.body instanceof ArrayBuffer) &&
            request.headers["content-type"] &&
            request.headers["content-type"].indexOf("text/plain") === -1;
    } else {
        this.isMultipartUpload = typeof request.body === "object" && !(request.body instanceof ArrayBuffer);
    }

    console.log({isMultipartUpload: this.isMultipartUpload})

    try {
        this.validateRequestBody(request.body);
    } catch (e) {
        return callback(e);
    }

    let files = [];

    if (this.isMultipartUpload) {
        if (!this.uploadMultipleFiles) {
            files.push(request.body[this.inputName]);
        } else {
            files = request.body[this.inputName];
        }
    } else {
        const file = this.createFileFromRequest(request);
        files.push(file);
    }

    const filesUploaded = [];

    const uploadFileCallback = (file, err) => {
        const _callback = function (err, result) {
            const srcFile = {
                name: file.name,
                type: file.type,
            };

            if (err) {
                err = {
                    message: JSON.stringify(err),
                    code: this.Error.UNKNOWN,
                };

                filesUploaded.push({
                    file: srcFile,
                    error: err,
                });
            } else {
                filesUploaded.push({
                    file: srcFile,
                    result,
                });
            }

            if (filesUploaded.length === files.length) {
                let errors = filesUploaded.filter((item) => item.error !== undefined);
                const uploadedFiles = filesUploaded.filter((item) => item.result !== undefined);

                errors = errors.length ? errors : null;
                callback(errors, uploadedFiles);
            }
        };

        if (err) {
            return _callback.call(this, err);
        }
        return _callback.bind(this);
    };

    const filesCopy = [...files];

    const recursiveUpload = () => {
        const file = filesCopy.shift();

        if (!file) {
            return;
        }

        try {
            this.validateFile(file);
        } catch (e) {
            uploadFileCallback(file, e);
            recursiveUpload();
            return;
        }

        this.uploadFile(file, (err, result) => {
            const callback = uploadFileCallback(file);
            callback(err, result);
            recursiveUpload();
        });
    };
    recursiveUpload();
};

module.exports = Uploader;
