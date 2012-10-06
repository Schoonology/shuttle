var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    zmq = require('zmq'),
    msgpack = require('msgpack3');

function Node() {
    if (!(this instanceof Node)) {
        return new Node();
    }

    EventEmitter.call(this);
    this._socket = null;
    this._initSocket();
}
util.inherits(Node, EventEmitter);

Node.prototype.listen = listen;
function listen(portOrPath, host) {
    this._socket.bindSync(this._generateZmqUrl(portOrPath, host));
}

Node.prototype.connect = connect;
function connect(portOrPath, host) {
    this._socket.connect(this._generateZmqUrl(portOrPath, host));
}

Node.prototype.close = close;
function close() {
    this._socket.close();
    this._initSocket();
}

Node.prototype._initSocket = _initSocket;
function _initSocket() {
    throw new Error('Node._initSocket not implemented');
}

Node.prototype._generateZmqUrl = _generateZmqUrl;
function _generateZmqUrl(portOrPath, host) {
    if (typeof portOrPath === 'number') {
        return 'tcp://' + (host || '127.0.0.1') + ':' + portOrPath;
    } else if (typeof portOrPath === 'string') {
        if (portOrPath.charAt(0) === '/') {
            // TODO: Windows IPC support.
            return 'ipc://' + portOrPath;
        } else {
            return portOrPath;
        }
    } else if (typeof portOrPath === 'object') {
        return this._generateZmqUrl(portOrPath.port || portOrPath.path, portOrPath.host);
    }
}

module.exports = Node;
