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
        message: err.message,
        name: err.name
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

    var err = new Error(safe.message);
    err.name = safe.name;
    err.stack = safe.stack || null;

    return err;
}

function getRequestId(existing, digits, tries) {
    var id;

    if (typeof existing !== 'object') {
        return Math.random().toString().slice(2, (digits || 3) + 2);
    }

    tries = tries || 10;

    for(; tries--;) {
        id = Math.random().toString().slice(2, (digits || 3) + 2);
        if (!existing[id]) {
            return id;
        }
    }

    return null;
}

var common = module.exports = {
    generateZmqUrl: generateZmqUrl,
    sanitizeError: sanitizeError,
    desanitizeError: desanitizeError,
    getRequestId: getRequestId
};
