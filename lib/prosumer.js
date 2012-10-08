var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    msgpack = require('msgpack3'),
    common = require('./common');

function Prosumer() {
    if (!(this instanceof Prosumer)) {
        return new Prosumer();
    }

    EventEmitter.call(this);

    this.pending = {};
    this.pendingCount = 0;

    this._zdealer = null;
    this._zrouter = null;
    this._initSockets();
}
util.inherits(Prosumer, EventEmitter);

Prosumer.prototype.listen = listen;
Prosumer.prototype.listenForConsumers = listen;
function listen(portOrPath, host) {
    this._zrouter.bindSync(common.generateZmqUrl(portOrPath, host));
}

Prosumer.prototype.connect = connect;
Prosumer.prototype.connectToConsumer = connect;
function connect(portOrPath, host) {
    this._zrouter.connect(common.generateZmqUrl(portOrPath, host));
}

Prosumer.prototype.listenForServices = listenForServices;
function listenForServices(portOrPath, host) {
    this._zdealer.bindSync(common.generateZmqUrl(portOrPath, host));
}

Prosumer.prototype.connectToService = connectToService;
function connectToService(portOrPath, host) {
    this._zdealer.connect(common.generateZmqUrl(portOrPath, host));
}

Prosumer.prototype.close = close;
function close() {
    this._zdealer.close();
    this._zrouter.close();
    this._initSockets();
}

Prosumer.prototype.emit = emit;
function emit(name, data, callback) {
    EventEmitter.prototype.emit.call(this, name, data, callback);
    if (name === 'newListener') {
        return;
    }

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

Prosumer.prototype._initSockets = _initSockets;
function _initSockets() {
    var self = this;

    self._zrouter = zmq.socket(zmq.types.router);
    self._zrouter.on('message', function handle(identity, name, requestId, data) {
        self._handleRequest(identity, name, requestId, data);
    });

    self._zdealer = zmq.socket(zmq.types.dealer);
    self._zdealer.on('message', function handle(requestId, err, data) {
        self._handleResponse(requestId, err, data);
    });
}

Prosumer.prototype._handleRequest = _handleRequest;
function _handleRequest(identity, name, requestId, data) {
    var self = this;

    name = name.toString('utf8');
    requestId = requestId.toString('utf8');

    if (self.listeners(name).length === 0) {
        self._zrouter.send([identity, requestId, msgpack.pack(common.sanitizeError(new Error('No such event'))), msgpack.pack(null)]);
        return;
    }

    data = msgpack.unpack(data);
    EventEmitter.prototype.emit.call(this, name, data, function gotResponse(err, result) {
        // TODO: More than one argument.
        self._zrouter.send([identity, requestId, msgpack.pack(common.sanitizeError(err)), msgpack.pack(result)]);
    });
}

Prosumer.prototype._handleResponse = _handleResponse;
function _handleResponse(requestId, err, data) {
    requestId = requestId.toString('utf8');
    err = msgpack.unpack(err);
    data = msgpack.unpack(data);

    var callback = this.pending[requestId];

    this.pending[requestId] = null;
    --this.pendingCount;
    callback(common.desanitizeError(err), data);
}

module.exports = Prosumer;
