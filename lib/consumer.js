var zmq = require('zmq'),
    common = require('./common');

function Consumer(options) {
    if (!(this instanceof Consumer)) {
        return new Consumer(options);
    }

    options = options || {};

    this.pending = {};
    this.pendingCount = 0;
    this.encoding = options.encoding || 'json';

    this._zdealer = null;
    // TODO: Accept a "timeout" option, and generate Stepdown-like timeout events.
}

Consumer.prototype.listen = listen;
function listen(portOrPath, host) {
    this._initSocket();
    this._zdealer.bindSync(common.generateZmqUrl(portOrPath, host));
}

Consumer.prototype.connect = connect;
function connect(portOrPath, host) {
    this._initSocket();
    this._zdealer.connect(common.generateZmqUrl(portOrPath, host));
}

Consumer.prototype.close = close;
function close() {
    this._zdealer.close();
    this._zdealer = null;
}

Consumer.prototype.emit = emit;
function emit(name, data, callback) {
    var requestId = common.getRequestId(this.pending);

    if (requestId == null) {
        callback(new Error('Too many requests'));
        return;
    }

    this.pending[requestId] = callback;
    ++this.pendingCount;

    this._zdealer.send([
        name,
        requestId,
        common.pack(data, this.encoding)
    ]);
}

Consumer.prototype._initSocket = _initSocket;
function _initSocket() {
    var self = this;

    if (self._zdealer) {
        return;
    }

    self._zdealer = zmq.socket(zmq.types.dealer);
    self._zdealer.on('message', function handle(requestId, err, data) {
        self._handleResponse(requestId, err, data);
    });
}

Consumer.prototype._handleResponse = _handleResponse;
function _handleResponse(requestId, err, data) {
    requestId = requestId.toString('utf8');
    err = common.unpack(err, this.encoding);
    data = common.unpack(data, this.encoding);

    var callback = this.pending[requestId];

    this.pending[requestId] = null;
    --this.pendingCount;
    callback(common.desanitizeError(err), data);
}

module.exports = Consumer;
