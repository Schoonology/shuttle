var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    common = require('./common');

function Service(options) {
    if (!(this instanceof Service)) {
        return new Service(options);
    }

    options = options || {};

    EventEmitter.call(this);

    this.encoding = options.encoding || 'json';

    this._zrouter = null;
}
util.inherits(Service, EventEmitter);

Service.prototype.listen = listen;
function listen(portOrPath, host) {
    this._initSocket();
    this._zrouter.bindSync(common.generateZmqUrl(portOrPath, host));
}

Service.prototype.connect = connect;
function connect(portOrPath, host) {
    this._initSocket();
    this._zrouter.connect(common.generateZmqUrl(portOrPath, host));
}

Service.prototype.close = close;
function close() {
    this._zrouter.close();
    this._zrouter = null;
}

Service.prototype._initSocket = _initSocket;
function _initSocket() {
    var self = this;

    if (self._zrouter) {
        return;
    }

    self._zrouter = zmq.socket(zmq.types.router);
    self._zrouter.on('message', function handle(identity, name, requestId, data) {
        self._handleRequest(identity, name, requestId, data);
    });
}

Service.prototype._handleRequest = _handleRequest;
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
    self.emit(name, data, function gotResponse(err, result) {
        // TODO: More than one argument.
        self._zrouter.send([
            identity,
            requestId,
            common.pack(common.sanitizeError(err), self.encoding),
            common.pack(result, self.encoding)
        ]);
    });
}

module.exports = Service;
