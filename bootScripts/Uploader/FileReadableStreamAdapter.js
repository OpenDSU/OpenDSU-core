const {Readable} = require('stream');
const util = require('util');

/**
 * Stream.Readable adapter for File ReadableStream
 * @param {File} file
 * @param {object} options
 */
function FileReadableStreamAdapter(file, options) {
    if (!(this instanceof FileReadableStreamAdapter)) {
        return new FileReadableStreamAdapter(file, options);
    }

    this.fileStreamReader = file.stream().getReader();
    Readable.call(this, options);
}

util.inherits(FileReadableStreamAdapter, Readable);

/**
 * Reads data from the File ReadableStreamDefaulReader
 * and pushes it into our Readable stream
 */
FileReadableStreamAdapter.prototype._read = function () {
    const pushData = (result) => {
        const done = result.done;
        const data = result.value;
        if (done) {
            this.push(null);
            return;
        }

        if (this.push($$.Buffer.from(data))) {
            return this.fileStreamReader.read().then(pushData);
        }
    }
    this.fileStreamReader.read()
        .then(pushData);
}

module.exports = FileReadableStreamAdapter;
