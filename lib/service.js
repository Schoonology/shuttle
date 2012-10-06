var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    msgpack = require('msgpack3');

function Service() {
    if (!(this instanceof Service)) {
        return new Service();
    }

    var self = this;

    EventEmitter.call(self);

    self._zrouter = zmq.socket(zmq.types.router);
    self._zrouter.on('message', function handle(identity, name, requestId, data) {
        self._handleRequest(identity, name, requestId, data);
    });
}
util.inherits(Service, EventEmitter);

Service.prototype.listen = listen;
function listen(url) {
    this._zrouter.bindSync(url);
}

Service.prototype.connect = connect;
function connect(url) {
    this._zrouter.connect(url);
}

Service.prototype.close = close;
function close() {
    this._zrouter.close();
}

Service.prototype._handleRequest = _handleRequest;
function _handleRequest(identity, name, requestId, data) {
    var self = this;

    name = name.toString('utf8');
    requestId = requestId.toString('utf8');
    data = msgpack.unpack(data);

    self.emit(name, data, function gotResponse(result) {
        // TODO: More than one argument.
        self._zrouter.send([identity, requestId, msgpack.pack(result)]);
    });
}

module.exports = Service;
