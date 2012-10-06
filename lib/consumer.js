var util = require('util'),
    zmq = require('zmq'),
    msgpack = require('msgpack3'),
    Node = require('./node');

function Consumer() {
    if (!(this instanceof Consumer)) {
        return new Consumer();
    }

    Node.call(this);

    this.pending = {};
}
util.inherits(Consumer, Node);

Consumer.prototype.send = send;
function send(name, data, callback) {
    var requestId = this._getRequestId();

    if (requestId == null) {
        callback(new Error('Too many requests'));
        return;
    }

    this._socket.send([
        name,
        requestId,
        msgpack.pack(data)
    ]);

    this.pending[requestId] = callback;
}

Consumer.prototype._initSocket = _initSocket;
function _initSocket() {
    var self = this;

    self._socket = zmq.socket(zmq.types.dealer);
    self._socket.on('message', function handle(requestId, data) {
        self._handleResponse(requestId, data);
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
function _handleResponse(requestId, data) {
    requestId = requestId.toString('utf8');
    data = msgpack.unpack(data);

    // TODO: Error handling.
    this.pending[requestId](null, data);
}

module.exports = Consumer;
