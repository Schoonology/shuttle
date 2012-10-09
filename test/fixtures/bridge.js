var shuttle = require('../..'),
    self = new shuttle.Bridge(),
    frontUrl = process.env.frontUrl,
    backUrl = process.env.backUrl;

if (frontUrl) {
    console.log('B front:', frontUrl);
    self.listenForConsumers(frontUrl);
}
if (backUrl) {
    console.log('B back:', backUrl);
    self.listenForServices(backUrl);
}

process.send('ready');
