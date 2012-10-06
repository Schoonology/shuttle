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
    var safe = {
        message: err.message,
        name: err.name
    };

    if (includeStack) {
        safe.stack = err.stack;
    }

    return safe;
}

var common = module.exports = {
    generateZmqUrl: generateZmqUrl,
    sanitizeError: sanitizeError
};
