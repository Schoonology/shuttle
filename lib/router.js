var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    common = require('./common');

function Router(options) {
    if (!(this instanceof Router)) {
        return new Router(options);
    }

    options = options || {};

    EventEmitter.call(this);

    this.pending = {};
    this.pendingCount = 0;
    this.fallbackService = this.fallbackService || 'fallback';
    this.delimiter = '::';
    this.trimServiceName = true;
    this.encoding = options.encoding || 'json';

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

Router.prototype._handleRequest = _handleRequest;
function _handleRequest(identity, name, requestId, data) {
    var internalRequestId = common.getRequestId(this.pending, 6),
        split,
        service,
        socket;

    if (internalRequestId == null) {
        this._zrouter.send([
            identity,
            requestId,
            common.pack(common.sanitizeError(new Error('Too many requests')), this.encoding),
            common.pack(null, this.encoding)
        ]);
        return;
    }

    split = name.toString().split(this.delimiter);
    if (split.length > 1) {
        service = split.shift();
        if (this.trimServiceName) {
            name = split.join(this.delimiter);
        }
    } else {
        service = this.fallbackService;
    }

    // TODO: Ideally, we'd be able to check that we expect a service to exist before
    // lazy-adding it. That way, we could return a "No such service" Error here otherwise.

    socket = this._getDealer(service);

    this.pending[internalRequestId] = {
        identity: identity,
        requestId: requestId,
        name: name
    };
    ++this.pendingCount;

    this.emit('request', internalRequestId, this.pending[internalRequestId], data);

    socket.send([name, internalRequestId, data]);
}

Router.prototype._handleResponse = _handleResponse;
function _handleResponse(internalRequestId, err, data) {
    internalRequestId = internalRequestId.toString('utf8');

    var originalRequest = this.pending[internalRequestId];

    if (originalRequest == null) {
        // We've received a response for a request we never sent. This can happen if connections are
        // erroneously made front-to-front and back-to-back, which is only possible with Prosumers.
        return;
    }

    this.emit('response', internalRequestId, originalRequest, data);

    this.pending[internalRequestId] = null;
    --this.pendingCount;
    this._zrouter.send([
        originalRequest.identity,
        originalRequest.requestId,
        err,
        data
    ]);
}

module.exports = Router;
