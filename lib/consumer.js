var zmq = require('zmq'),
    msgpack = require('msgpack3'),
    common = require('./common');

function Consumer() {
    if (!(this instanceof Consumer)) {
        return new Consumer();
    }

    this.pending = {};
    this.pendingCount = 0;
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
        msgpack.pack(data)
    ]);
}

Consumer.prototype._initSocket = _initSocket;
function _initSocket() {
    var self = this;

    self._zdealer = zmq.socket(zmq.types.dealer);
    self._zdealer.on('message', function handle(requestId, err, data) {
        self._handleResponse(requestId, err, data);
    });
}

Consumer.prototype._handleResponse = _handleResponse;
function _handleResponse(requestId, err, data) {
    requestId = requestId.toString('utf8');
    err = msgpack.unpack(err);
    data = msgpack.unpack(data);

    var callback = this.pending[requestId];

    this.pending[requestId] = null;
    --this.pendingCount;
    callback(err, data);
}

module.exports = Consumer;
