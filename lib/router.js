var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    msgpack = require('msgpack3'),
    common = require('./common');

function Router() {
    if (!(this instanceof Router)) {
        return new Router();
    }

    EventEmitter.call(this);

    this.pending = {};
    this._zdealer = null;
    this._zrouter = null;
    this._initSockets();
}
util.inherits(Router, EventEmitter);

Router.prototype.listenForConsumers = listen;
function listen(portOrPath, host) {
    this._zrouter.bindSync(common.generateZmqUrl(portOrPath, host));
}

Router.prototype.connectToConsumer = connect;
function connect(portOrPath, host) {
    this._zrouter.connect(common.generateZmqUrl(portOrPath, host));
}

Router.prototype.listenForServices = listenForServices;
function listenForServices(portOrPath, host) {
    this._zdealer.bindSync(common.generateZmqUrl(portOrPath, host));
}

Router.prototype.connectToService = connectToService;
function connectToService(portOrPath, host) {
    this._zdealer.connect(common.generateZmqUrl(portOrPath, host));
}

Router.prototype.close = close;
function close() {
    this._zdealer.close();
    this._zrouter.close();
    this._initSockets();
}

Router.prototype._initSockets = _initSockets;
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

Router.prototype._getRequestId = _getRequestId;
function _getRequestId() {
    var id = Math.random().toString().slice(2, 8),
        tries = 10;

    for(; tries--;) {
        if (!this.pending[id]) {
            return id;
        }
    }

    return null;
}

Router.prototype._handleRequest = _handleRequest;
function _handleRequest(identity, name, requestId, data) {
    var self = this,
        internalRequestId = this._getRequestId();

    if (internalRequestId == null) {
        // TODO: Figure out how to check on the other side if it's an error.
        self._zrouter.send([
            identity,
            requestId,
            msgpack.pack(common.sanitizeError(new Error('Too many requests'))),
            msgpack.pack(null)
        ]);
        return;
    }

    // TODO: Add service types.

    self._zdealer.send([name, internalRequestId, data]);

    self.pending[internalRequestId] = {
        identity: identity,
        requestId: requestId
    };
    this.pending[internalRequestId] = null;
}

Router.prototype._handleResponse = _handleResponse;
function _handleResponse(internalRequestId, err, data) {
    internalRequestId = internalRequestId.toString('utf8');

    var originalRequest = this.pending[internalRequestId];

    // TODO: Error handling.
    this._zrouter.send([
        originalRequest.identity,
        originalRequest.requestId,
        err,
        data
    ]);
}

module.exports = Router;
