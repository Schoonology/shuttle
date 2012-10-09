var shuttle = require('../..'),
    self = new shuttle.Prosumer(),
    emitter = process.env.emitter === 'true',
    listenUrl = process.env.listenUrl,
    connectUrl = process.env.connectUrl;

console.log('P emitting:', emitter);

if (listenUrl) {
    console.log('P listening:', listenUrl);
    if (emitter) {
        self.listenForServices(listenUrl);
    } else {
        self.listenForConsumers(listenUrl);
    }
}
if (connectUrl) {
    console.log('P connecting:', connectUrl);
    if (emitter) {
        self.connectToService(connectUrl);
    } else {
        self.connectToConsumer(connectUrl);
    }
}

self.on('echo', function (data, callback) {
    console.log('P Echoing:', data);
    callback(null, data);
});

self.on('broken', function (data, callback) {
    console.log('P Broken:', data);
    callback(new Error('Broken'), null);
});

process.on('message', function (obj) {
    console.log('P Sending:', obj);
    self.emit(obj.name, obj.data, function (err, result) {
        if (err) {
            process.send({
                id: obj.id,
                err: err
            });
        } else {
            process.send({
                id: obj.id,
                result: result
            });
        }
    });
});

process.send('ready');
