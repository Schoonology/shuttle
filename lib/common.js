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

function getRequestId(existing, digits, tries) {
    var id;

    if (typeof existing !== 'object') {
        return Math.random().toString().slice(2, (digits || 3) + 2);
    }

    tries = tries || 10;

    // TODO: First try random, subsequent tries sequential.

    for(; tries--;) {
        id = Math.random().toString().slice(2, (digits || 3) + 2);
        if (!existing[id]) {
            return id;
        }
    }

    return null;
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
