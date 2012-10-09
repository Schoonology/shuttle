var shuttle = require('../..'),
    self = new shuttle.Router(),
    frontUrl = process.env.frontUrl,
    backUrl = process.env.backUrl;

if (frontUrl) {
    console.log('R front:', frontUrl);
    self.listenForConsumers(frontUrl);
}
if (backUrl) {
    console.log('R back:', backUrl);
    self.listenForServices('test', backUrl);
}

process.send('ready');
