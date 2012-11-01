# Shuttle

A massively-distributable, service-oriented architecture with all the flexibility of Node.

## Installation

Before you can install shuttle with NPM, you need to have the ZeroMQ sources installed locally. This will be a platform-dependent task, but most platforms have tools to make this easier:

```bash
brew install zeromq
yum install zeromq-devel
```

After that's ready, npm can be used as normal:

```bash
npm install shuttle
```

## Connection

Before going into what the various classes are, it's important to note an important feature of Shuttle: Either side of any connection can act as the listener, with the other connecting. For example, a Service can connect to a listening Consumer or a Consumer can connect to a listening Service. This is accomplished with two methods, available on each class:

 * listen(url) - Listen on the interface and port provided as a TCP URL (e.g. tcp://127.0.0.1:3000).
 * listen(path) - Listen on the IPC interface provided as a file path (e.g. /tmp/shuttletest).
 * listen(port, [host]) - Listen on the optional `host` interface (defaults to '*') at `port`.
 * connect(url) - Connect to the endpoint at the specified TCP URL.
 * connect(path) - Connect to the endpoint at the specified IPC path.
 * connect(port, [host]) - Connect to the endpoint at the optional `host` interface (defaults to '*') at `port`.

## Classes

The classes used by Shuttle are purposefully simple:

### Consumer & Service

The Consumer emits events round-robin to all Services, which in turn listen on these events, firing the provided callback either as acknowledgement (required) or with the desired additional result.

```javascript
var consumer = new shuttle.Consumer(),
    service = new shuttle.Service();

service.listen(5050);
consumer.connect(5050);

service.on('test', function (data, callback) {
    console.log('Test:', data);
    callback(null, { ok: true });
});

consumer.emit('test', { answer: 42 }, function (err, response) {
    console.log('Error?', !!err);
    console.log('Response:', response);
});

// Output:
//
// Test: { answer: 42 }
// Error? false
// Response: { ok: true }
```

### Prosumer

The Prosumer is both a Service and Consumer in one. It can emit events like a Consumer and listen on events like a Service.

```javascript
var prosumer1 = new shuttle.Prosumer(),
    prosumer2 = new shuttle.Prosumer();

prosumer2.listenForConsumers(5050);
prosumer1.connectToService(5050);

prosumer2.on('test', function (data, callback) {
    console.log('Test:', data);
    callback(null, { ok: true });
});

prosumer1.emit('test', { answer: 42 }, function (err, response) {
    console.log('Error?', !!err);
    console.log('Response:', response);
});

// Output:
//
// Test: { answer: 42 }
// Error? false
// Response: { ok: true }
```

### Bridge

When running a lot of Services with a lot of Consumers, the number of interfaces to track can quickly get out of hand. To make life easier, there's the Bridge. Any requests made of the Bridge are passed along, also round-robin, to all connected Services.

```javascript
var consumer = new shuttle.Consumer(),
    bridge = new shuttle.Bridge(),
    service = new shuttle.Service();

bridge.listenForConsumers(5050);
bridge.listenForServices(5051);

consumer.connect(5050);
service.connect(5051);

service.on('test', function (data, callback) {
    console.log('Test:', data);
    callback(null, { ok: true });
});

consumer.emit('test', { answer: 42 }, function (err, response) {
    console.log('Error?', !!err);
    console.log('Response:', response);
});

// Output:
//
// Test: { answer: 42 }
// Error? false
// Response: { ok: true }
```

### Router

A Router is just a special bridge that can assign names to the interfaces it exposes to services. Any services that connect to those interfaces can be addressed by clients by name.

```javascript
var consumer = new shuttle.Consumer(),
    router = new shuttle.Router(),
    service = new shuttle.Service();

router.listenForConsumers(5050);
router.listenForServices('test', 5051);

// Optional, additional settings
router.delimiter = '/';
router.trimServiceName = true;

consumer.connect(5050);
service.connect(5051);

// This service will be addressed by 'test/*', but we'll only get the '*' part.
service.on('test', function (data, callback) {
    console.log('Test:', data);
    callback(null, { ok: true });
});

consumer.emit('test/test', { answer: 42 }, function (err, response) {
    console.log('Error?', !!err);
    console.log('Response:', response);
});

// As before, our output:
//
// Test: { answer: 42 }
// Error? false
// Response: { ok: true }
```

## License

```
Copyright (C) 2012 Michael Schoonmaker (michael.r.schoonmaker@gmail.com)

This project is free software released under the MIT/X11 license:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
