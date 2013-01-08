var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    common = require('./common');

function Prosumer(options) {
    if (!(this instanceof Prosumer)) {
        return new Prosumer(options);
    }

    options = options || {};

    EventEmitter.call(this);

    this.pending = {};
    this.pendingCount = 0;
    this.encoding = options.encoding || 'json';

    this._zdealer = null;
    this._zrouter = null;
}
util.inherits(Prosumer, EventEmitter);

Prosumer.prototype.listen = listen;
Prosumer.prototype.listenForConsumers = listen;
function listen(portOrPath, host) {
    this._initSockets();
    this._zrouter.bindSync(common.generateZmqUrl(portOrPath, host));
}

Prosumer.prototype.connect = connect;
Prosumer.prototype.connectToConsumer = connect;
function connect(portOrPath, host) {
    this._initSockets();
    this._zrouter.connect(common.generateZmqUrl(portOrPath, host));
}

Prosumer.prototype.listenForServices = listenForServices;
function listenForServices(portOrPath, host) {
    this._initSockets();
    this._zdealer.bindSync(common.generateZmqUrl(portOrPath, host));
}

Prosumer.prototype.connectToService = connectToService;
function connectToService(portOrPath, host) {
    this._initSockets();
    this._zdealer.connect(common.generateZmqUrl(portOrPath, host));
}

Prosumer.prototype.close = close;
function close() {
    this._zdealer.close();
    this._zdealer = null;

    this._zrouter.close();
    this._zrouter = null;
}

Prosumer.prototype.emit = emit;
function emit(name, data, callback) {
    if (EventEmitter.prototype.emit.call(this, name, data, callback)) {
        return;
    }

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
        common.pack(data, this.encoding)
    ]);
}

Prosumer.prototype._initSockets = _initSockets;
function _initSockets() {
    var self = this;

    if (self._zrouter || self._zdealer) {
        return;
    }

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
        self._zrouter.send([
            identity,
            requestId,
            common.pack(common.sanitizeError(new Error('No such event')), self.encoding),
            common.pack(null, self.encoding)
        ]);
        return;
    }

    data = common.unpack(data, self.encoding);
    EventEmitter.prototype.emit.call(this, name, data, function gotResponse(err, result) {
        // TODO: More than one argument.
        self._zrouter.send([
            identity,
            requestId,
            common.pack(common.sanitizeError(err), self.encoding),
            common.pack(result, self.encoding)
        ]);
    });
}

Prosumer.prototype._handleResponse = _handleResponse;
function _handleResponse(requestId, err, data) {
    requestId = requestId.toString('utf8');
    err = common.unpack(err, this.encoding);
    data = common.unpack(data, this.encoding);

    var callback = this.pending[requestId];

    if (callback == null) {
        // We've received a response for a request we never sent. This can happen if connections are
        // erroneously made front-to-front and back-to-back, which is only possible with Prosumers.
        return;
    }

    this.pending[requestId] = null;
    --this.pendingCount;
    callback(common.desanitizeError(err), data);
}

module.exports = Prosumer;
