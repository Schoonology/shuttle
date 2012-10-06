var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    msgpack = require('msgpack3'),
    common = require('./common');

function Service() {
    if (!(this instanceof Service)) {
        return new Service();
    }

    EventEmitter.call(this);

    this._zrouter = null;
    this._initSocket();
}
util.inherits(Service, EventEmitter);

Service.prototype.listen = listen;
function listen(portOrPath, host) {
    this._zrouter.bindSync(common.generateZmqUrl(portOrPath, host));
}

Service.prototype.connect = connect;
function connect(portOrPath, host) {
    this._zrouter.connect(common.generateZmqUrl(portOrPath, host));
}

Service.prototype.close = close;
function close() {
    this._zrouter.close();
    this._initSocket();
}

Service.prototype._initSocket = _initSocket;
function _initSocket() {
    var self = this;

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
        self._zrouter.send([identity, requestId, msgpack.pack(common.sanitizeError(new Error('No such event'))), msgpack.pack(null)]);
        return;
    }

    data = msgpack.unpack(data);
    self.emit(name, data, function gotResponse(err, result) {
        // TODO: More than one argument.
        self._zrouter.send([identity, requestId, msgpack.pack(common.sanitizeError(err)), msgpack.pack(result)]);
    });
}

module.exports = Service;
