var zmq = require('zmq'),
    msgpack = require('msgpack3'),
    common = require('./common');

function Consumer() {
    if (!(this instanceof Consumer)) {
        return new Consumer();
    }

    this.pending = {};
    this._zdealer = null;
    this._initSocket();
}

Consumer.prototype.listen = listen;
function listen(portOrPath, host) {
    this._zdealer.bindSync(common.generateZmqUrl(portOrPath, host));
}

Consumer.prototype.connect = connect;
function connect(portOrPath, host) {
    this._zdealer.connect(common.generateZmqUrl(portOrPath, host));
}

Consumer.prototype.close = close;
function close() {
    this._zdealer.close();
    this._initSocket();
}

Consumer.prototype.send = send;
function send(name, data, callback) {
    var requestId = this._getRequestId();

    if (requestId == null) {
        callback(new Error('Too many requests'));
        return;
    }

    this._zdealer.send([
        name,
        requestId,
        msgpack.pack(data)
    ]);

    this.pending[requestId] = callback;
}

Consumer.prototype._initSocket = _initSocket;
function _initSocket() {
    var self = this;

    self._zdealer = zmq.socket(zmq.types.dealer);
    self._zdealer.on('message', function handle(requestId, err, data) {
        self._handleResponse(requestId, err, data);
    });
}

Consumer.prototype._getRequestId = _getRequestId;
function _getRequestId() {
    var id = Math.random().toString().slice(2, 6),
        tries = 10;

    for(; tries--;) {
        if (!this.pending[id]) {
            return id;
        }
    }

    return null;
}

Consumer.prototype._handleResponse = _handleResponse;
function _handleResponse(requestId, err, data) {
    requestId = requestId.toString('utf8');
    err = msgpack.unpack(err);
    data = msgpack.unpack(data);

    // TODO: Error handling.
    this.pending[requestId](err, data);
    this.pending[requestId] = null;
}

module.exports = Consumer;
