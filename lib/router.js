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
    this.fallbackService = this.fallbackService || 'fallback';

    this._zdealers = null;
    this._zrouter = null;
    this._initSockets();
}
util.inherits(Router, EventEmitter);

Router.prototype.listen = listen;
Router.prototype.listenForConsumers = listen;
function listen(portOrPath, host) {
    this._zrouter.bindSync(common.generateZmqUrl(portOrPath, host));
}

Router.prototype.connect = connect;
Router.prototype.connectToConsumer = connect;
function connect(portOrPath, host) {
    this._zrouter.connect(common.generateZmqUrl(portOrPath, host));
}

Router.prototype.listenForServices = listenForServices;
function listenForServices(name, portOrPath, host) {
    var socket = this._getDealer(name);

    socket.bindSync(common.generateZmqUrl(portOrPath, host));
}

Router.prototype.connectToService = connectToService;
function connectToService(name, portOrPath, host) {
    var socket = this._getDealer(name);

    socket.connect(common.generateZmqUrl(portOrPath, host));
}

Router.prototype.close = close;
function close() {
    var self = this;

    Object.keys(self._zdealers).forEach(function (key) {
        self._zdealers[key].close();
    });

    self._zrouter.close();
    self._initSockets();
}

Router.prototype._initSockets = _initSockets;
function _initSockets() {
    var self = this;

    self._zrouter = zmq.socket(zmq.types.router);
    self._zrouter.on('message', function handle(identity, name, requestId, data) {
        self._handleRequest(identity, name, requestId, data);
    });

    self._zdealers = {};
}

Router.prototype._addDealer = _addDealer;
function _addDealer(name) {
    var self = this;

    if (name == null) {
        name = self.fallbackService;
    }

    var socket = zmq.socket(zmq.types.dealer);
    self._zdealers[name] = socket;
    socket.on('message', function handle(requestId, err, data) {
        self._handleResponse(requestId, err, data);
    });

    return socket;
}

Router.prototype._getDealer = _getDealer;
function _getDealer(name) {
    if (name == null) {
        name = this.fallbackService;
    }

    return this._zdealers[name] || this._addDealer(name);
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
        internalRequestId = this._getRequestId(),
        split,
        service,
        socket;

    if (internalRequestId == null) {
        self._zrouter.send([
            identity,
            requestId,
            msgpack.pack(common.sanitizeError(new Error('Too many requests'))),
            msgpack.pack(null)
        ]);
        return;
    }

    split = name.toString().split(':');
    if (split.length > 1) {
        service = split.shift();
        name = split.join(':'); // TODO: Keep the prefix?
    } else {
        service = this.fallbackService;
    }

    socket = self._getDealer(service);
    socket.send([name, internalRequestId, data]);

    self.pending[internalRequestId] = {
        identity: identity,
        requestId: requestId
    };
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
    this.pending[internalRequestId] = null;
}

module.exports = Router;
