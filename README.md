# Shuttle

A massively-distributable, service-oriented architecture with all the flexibility of Node.

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

While these have not been tested, Shuttle may also work over the following transports:

 * Intra-process (`inproc://`)
 * PGM (`pgm://`)
 * EPGM (`epgm://`)

In the remainder of the documentation, "port" refers to a single interface on a single transport, even if that interface is not TPC. If documentation mentions "two ports" and you intend to use IPC, for example, you will need two file descriptors, e.g. `/tmp/a` and `/tmp/b`.

## Mesh

The Shuttle "mesh" consists of Services and Consumers connected _directly_ to one another, with Consumers making requests and getting updates and Services sending responses and sending updates. Unlike other service-oriented architectures (and early versions of Shuttle), _Shuttle is brokerless._

There are two types of Services, with corresponding Consumers: RequestServices (with RequestConsumers) and SynchronizationServices (with SynchronizationConsumers).

There should be a 1:1 relationship between Consumer instances and Service types. A Consumer can be connected to multiple of the same service, but should not be connected to multiple types of Services. Create another Consumer instance for the second Service type needed (and so forth). To make this design restriction easier, MIXIN_THINGs can be used to consolidate multiple Consumer instances into a single, easier-to-use interface. (If desired, the same can be done of Services, even with the same MIXIN_THING.)

### Static Topography

The simplest topography is static; port locations are well-known, defined up-front, and never change. Services bind to these ports, and Consumers connect to them. Start-up is as fast as possible, but the rigidity is often undesirable.

### Dynamic Topography

The most flexible topography is dynamic; port locations for the majority of Services are not well-known, and can change at any time. To facilitate this, N SynchronizationServices (see Discovery) are started at well-known locations, and both Services and Consumers connect to this (via their own SynchronizationConsumer) service to locate one another.

### "Reversed" Topographies

Ordinarily, Services bind and Consumers connect. However, _this is not required!_ In some instances, it may be wiser for Consumers to bind and Services to connect. Some examples:

 * Dynamic Slaves with a Static Master - N Consumers bind to ports, constantly making requests. Services connect to the Consumer as they start, processing the requests as fast as possible.
 * Brokers - Although Shuttle is brokerless, simple Brokers can be built _on top of Shuttle._ In this case, the Broker contains N Consumers and a single Service, all of which bind. The rest of the mesh connects.



cb = new MIXIN_THING({
  delimeter: '::' // Looks like EE2!
})
cb.emit('service::event', {}, function () {})

## Thanks

Kabe & Adam

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
