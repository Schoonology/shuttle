var util = require('util'),
    zmq = require('zmq'),
    msgpack = require('msgpack3'),
    Node = require('./node');

function Service() {
    if (!(this instanceof Service)) {
        return new Service();
    }

    Node.call(this);
}
util.inherits(Service, Node);

Service.prototype._initSocket = _initSocket;
function _initSocket() {
    var self = this;

    self._socket = zmq.socket(zmq.types.router);
    self._socket.on('message', function handle(identity, name, requestId, data) {
        self._handleRequest(identity, name, requestId, data);
    });
}

Service.prototype._handleRequest = _handleRequest;
function _handleRequest(identity, name, requestId, data) {
    var self = this;

    name = name.toString('utf8');
    requestId = requestId.toString('utf8');
    data = msgpack.unpack(data);

    self.emit(name, data, function gotResponse(result) {
        // TODO: More than one argument.
        self._socket.send([identity, requestId, msgpack.pack(result)]);
    });
}

module.exports = Service;
