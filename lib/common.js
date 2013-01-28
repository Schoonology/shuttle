var msgpack = require('msgpack3');

function generateZmqUrl(portOrPath, host) {
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
        return common.generateZmqUrl(portOrPath.port || portOrPath.path, portOrPath.host);
    }
}

function sanitizeError(err, includeStack) {
    if (err == null) {
        return null;
    }

    var safe = {
        code: err.code,
        message: err.message,
        name: err.name,
        _isError: err instanceof Error
    };

    if (includeStack) {
        safe.stack = err.stack;
    }

    return safe;
}

function desanitizeError(safe) {
    if (safe == null) {
        return null;
    }

    var err;

    if (safe._isError) {
        err = new Error(safe.message);
    } else {
        err = {
            message: safe.message
        };
    }

    err.name = safe.name;
    err.code = safe.code || null;
    err.stack = safe.stack || null;

    return err;
}

function getRequestId(existing) {
    var id = String(Math.random()).slice(2);

    if (typeof existing !== 'object') {
        return id;
    }

    while (existing[id]) {
        id = String(Math.random()).slice(2);
    }

    return id;
}

function pack(obj, encoding) {
    if (encoding === 'msgpack') {
        return msgpack.pack(obj);
    } else {
        // 'json', etc.
        return new Buffer(JSON.stringify(obj) || 'null', 'utf8');
    }
}

function unpack(buf, encoding) {
    if (encoding === 'msgpack') {
        return msgpack.unpack(buf);
    } else {
        // 'json', etc.
        return JSON.parse(buf.toString('utf8'));
    }
}

var common = module.exports = {
    generateZmqUrl: generateZmqUrl,
    sanitizeError: sanitizeError,
    desanitizeError: desanitizeError,
    getRequestId: getRequestId,
    pack: pack,
    unpack: unpack
};
