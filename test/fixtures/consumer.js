var shuttle = require('../..'),
    self = new shuttle.Consumer(),
    listenUrl = process.env.listenUrl,
    connectUrl = process.env.connectUrl;

if (listenUrl) {
    console.log('C listening:', listenUrl);
    self.listen(listenUrl);
}
if (connectUrl) {
    console.log('C connecting:', connectUrl);
    self.connect(connectUrl);
}

process.on('message', function (obj) {
    console.log('C Sending:', obj);
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
