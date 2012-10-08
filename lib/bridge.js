var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    msgpack = require('msgpack3'),
    common = require('./common');

function Bridge() {
    if (!(this instanceof Bridge)) {
        return new Bridge();
    }

    EventEmitter.call(this);

    this.pending = {};
    this.pendingCount = 0;

    this._zdealer = null;
    this._zrouter = null;
    this._initSockets();
}
util.inherits(Bridge, EventEmitter);

Bridge.prototype.listen = listen;
Bridge.prototype.listenForConsumers = listen;
function listen(portOrPath, host) {
    this._zrouter.bindSync(common.generateZmqUrl(portOrPath, host));
}

Bridge.prototype.connect = connect;
Bridge.prototype.connectToConsumer = connect;
function connect(portOrPath, host) {
    this._zrouter.connect(common.generateZmqUrl(portOrPath, host));
}

Bridge.prototype.listenForServices = listenForServices;
function listenForServices(portOrPath, host) {
    this._zdealer.bindSync(common.generateZmqUrl(portOrPath, host));
}

Bridge.prototype.connectToService = connectToService;
function connectToService(portOrPath, host) {
    this._zdealer.connect(common.generateZmqUrl(portOrPath, host));
}

Bridge.prototype.close = close;
function close() {
    this._zdealer.close();
    this._zrouter.close();
    this._initSockets();
}

Bridge.prototype._initSockets = _initSockets;
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

Bridge.prototype._handleRequest = _handleRequest;
function _handleRequest(identity, name, requestId, data) {
    var internalRequestId = common.getRequestId(this.pending, 6);

    if (internalRequestId == null) {
        this._zrouter.send([
            identity,
            requestId,
            msgpack.pack(common.sanitizeError(new Error('Too many requests'))),
            msgpack.pack(null)
        ]);
        return;
    }

    this.pending[internalRequestId] = {
        identity: identity,
        requestId: requestId
    };
    ++this.pendingCount;

    this._zdealer.send([name, internalRequestId, data]);
}

Bridge.prototype._handleResponse = _handleResponse;
function _handleResponse(internalRequestId, err, data) {
    internalRequestId = internalRequestId.toString('utf8');

    var originalRequest = this.pending[internalRequestId];

    this.pending[internalRequestId] = null;
    --this.pendingCount;
    this._zrouter.send([
        originalRequest.identity,
        originalRequest.requestId,
        err,
        data
    ]);
}

module.exports = Bridge;
