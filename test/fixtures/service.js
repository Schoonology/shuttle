var shuttle = require('../..'),
    self = new shuttle.Service(),
    listenUrl = process.env.listenUrl,
    connectUrl = process.env.connectUrl;

if (listenUrl) {
    console.log('S listening:', listenUrl);
    self.listen(listenUrl);
}
if (connectUrl) {
    console.log('S connecting:', connectUrl);
    self.connect(connectUrl);
}

self.on('echo', function (data, callback) {
    console.log('S Echoing:', data);
    callback(null, data);
});

self.on('broken', function (data, callback) {
    console.log('S Broken:', data);
    callback(new Error('Broken'), null);
});

process.send('ready');
