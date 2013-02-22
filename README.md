# Shuttle

A messaging library for shuttling data from A to B (to A) as quickly and simply as possible.

## Installation

Before you can install Shuttle with NPM, you need to have the development source for ZeroMQ 3.2.x installed locally. This will be a platform-dependent task, but most platforms have tools to make this easier:

```bash
brew install zeromq --devel
yum install zeromq-devel
```

After that's ready, npm can be used as normal to install Shuttle:

```bash
npm install shuttle
```

## Transports

Shuttle officially supports and has been tested over the following transports:

 * IPC (`ipc://`)
 * TCP (`tcp://`)

While these have not been tested, Shuttle may also work over the following transports (as a result of ZeroMQ's support):

 * Intra-process (`inproc://`)
 * PGM (`pgm://`)
 * EPGM (`epgm://`)

In the remainder of the documentation, "port" refers to a single interface on a single transport, even if that interface is not TPC. If documentation mentions "two ports" and you intend to use IPC, for example, you will need two file descriptors, e.g. `/tmp/a` and `/tmp/b`.

## Component Types

Shuttle is nothing more than a set of components that can be thought of as tools in your messaging toolbox. There are three types of messaging abstraction (Request, Broadcast, and Synchronization), each of which handles the sending and receipt of "events".

### Request

RequestEmitters emit events to connected RequestHandlers, which respond to those events through a provided callback. Request components guarantee that each message _will be delivered_, and to _exactly one peer_. If delivery fails, the callback will receive an error.

```
var emitter = shuttle.createRequestEmitter()
var handler = shuttle.createRequestHandler()

handler.listenForRequests({
  url: SOME_URL
})
emitter.connectForRequests({
  url: SOME_URL
})

handler.on('echo', function (data, callback) {
  callback(null, data)
})

emitter.emit('echo', {
  test: true
}, function (err, response) {
  console.log(err) // null
  console.log(response) // { test: true }
})

emitter.close()
handler.close()
```

### Broadcast

BroadcastEmitters emit events to connected BroadcastHanders. Broadcast components do not guarantee delivery, nor do they restrict delivery; each message is sent to as many Handlers as possible.

```
var emitter = shuttle.createBroadcastEmitter()
var handler = shuttle.createBroadcastHandler()

emitter.listenForBroadcasts({
  url: SOME_URL
})

handler.connectForBroadcasts({
  url: SOME_URL
})

handler.on('bcast', function (data) {
  console.log(data) // { test: true }
})

emitter.emit('bcast', {
  test: true
})

emitter.close()
handler.close()
```

### Synchronization

Synchronization components provide a simple example of how to combine Request and Broadcast components together to perform more intersting work. On top of being RequestEmitters and BroadcastHandlers, SynchronizationEmitters can `get` and `set` key:value pairs on their SynchronizationHandler counterparts; which, being RequestHandlers and BroadcastEmitters, store a shared state and update interested SynchronizationEmitters upon success. Additionally, SynchronizationHandlers _are_ SynchronizationEmitters, and can be federated for scalability.

Please see the tests for examples of their usage. While they may be useful in applications, most non-trivial applications will want to roll their own solution using Request and Broadcast components.

## Topological Considerations

### Static Topology

The simplest topology is static; port locations are well-known, defined up-front, and never change. Handlers bind to these ports, and Emitters connect to them. Start-up is as fast as possible, but the rigidity is often undesirable.

### Dynamic Topology

The most flexible topology is dynamic; port locations for the majority of Handlers are not well-known, and can change at any time. To facilitate this, N SynchronizationHandlers can be started at well-known locations, and both Handlers and Emitters connect to this (via their own SynchronizationEmitter) to locate one another through `get` and `set` calls.

### "Reversed" Topologies

Ordinarily, Handlers bind and Emitters connect. However, _this is not required!_ In some instances, it may be wiser for Emitters to bind and Handlers to connect. Some examples:

 * Dynamic Slaves with a Static Master - N RequestEmitters bind to ports, constantly making requests. RequestHandlers connect to the Emitter as they start, processing the requests as fast as possible.
 * Brokers - Although Shuttle is brokerless, simple Brokers can be built _on top of Shuttle._ In this case, the Broker contains N RequestEmitters and N RequestHandlers, all of which bind. The rest of the mesh connects.

## Thanks

A heartfelt thank-you to everyone who used Shuttle early-on, especially [Adam Crabtree](https://github.com/Crabdude) and [mingrobo](https://github.com/mingrobo).

Extra thanks to [kabriel](https://github.com/kabriel) for tempering the ideas in Shuttle with his own experiences.

## License

```
Copyright (C) 2012-2013 Michael Schoonmaker (michael.r.schoonmaker@gmail.com)

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
