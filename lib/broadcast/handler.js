//
// # BroadcastHandler
//
var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , debug = require('debug')('shuttle:BroadcastHandler')
  , mi = require('mi')
  , zmqstream = require('zmq-stream')

//
// ## BroadcastHandler `BroadcastHandler(options)`
//
// Creates a new BroadcastHandler with the specified options:
//
//  * `linger`: A duration, in ms, that the BroadcastHandler will wait for outgoing messages to be sent before releasing
//  its resources after `close` is called. Outgoing messages take a non-zero time to be completely sent, and can be
//  dropped by a subsequent call to `close`. A value of -1 indicates an infinite delay. Defaults to 0.
//
function BroadcastHandler(obj) {
  obj = obj || {}

  EventEmitter.call(this)

  this.linger = (typeof obj.linger === 'number') ? obj.linger : 0

  this._zsub = null
  this._emit = EventEmitter.prototype.emit
  this._initLocalHandlers()
}

//
// ## EventEmitter API (`on`, `once`, `removeAllListeners`, etc.)
//
// BroadcastHandler inherits from EventEmitter to facilitate local subscriptions to remote events. See the Node.js
// Documentation's [Events API](http://nodejs.org/api/events.html) for more information.
//
// NOTE: Do not call `emit`. It may not work, and should not be relied upon.
//
mi.extend(BroadcastHandler, EventEmitter)

//
// ## connectForBroadcasts `connectForBroadcasts(options)`
//
// Synchronously connects to a listening BroadcastEmitter's broadcast socket. If **options.url** is provided, that
// URL will be used. Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
// Returns the BroadcastHandler.
//
BroadcastHandler.prototype.connectForBroadcasts = connectForBroadcasts
function connectForBroadcasts(options) {
  var self = this
    , opts = options || {}
    , iface = options.url

  if (!iface) {
    iface = url.format(opts)
  }

  debug('Connecting to %s.', iface)

  self._initSocket()
  self._zsub.connect(iface)

  return self
}

//
// ## close `close()`
//
// Synchonously releases the underlying resources, allowing the BroadcastHandler to be `connect`ed or `listen`ed
// again freely.
//
// Unless the BroadcastHandler was configured with a `linger` period, all pending outgoing requests and incoming
// updates will be dropped.
//
// Returns the BroadcastHandler.
//
BroadcastHandler.prototype.close = close
function close() {
  var self = this

  if (!self._zsub) {
    return
  }

  debug('Closing.')

  self._zsub.close()
  self._zsub = null

  return self
}

//
// ## _initSocket `_initSocket()`
//
// Internal use only.
//
// Creates the underlying networking resources.
//
BroadcastHandler.prototype._initSocket = _initSocket
function _initSocket() {
  var self = this

  if (self._zsub) {
    return
  }

  self._zsub = new zmqstream.Socket({
    type: zmqstream.Type.SUB
  })

  self._zsub.set(zmqstream.Option.LINGER, self.linger)

  self._zsub.on('readable', function () {
    self._handleBroadcasts()
  })
  self._handleBroadcasts()
}

//
// ## _subscribe `_subscribe(name, handler)`
//
// Internal use only.
//
// Subscribes for broadcast events as made necessary by event handler registration.
//
BroadcastHandler.prototype._subscribe = _subscribe
function _subscribe(name, handler) {
  var self = this

  if (!self._zsub) {
    return
  }

  debug('Subscribing to %s.', name);

  self._zsub.set(zmqstream.Option.SUBSCRIBE, name)
}

//
// ## _initLocalHandlers `_initLocalHandlers()`
//
// Internal use only.
//
// Registers handlers for internal-only events like 'newListener'.
//
BroadcastHandler.prototype._initLocalHandlers = _initLocalHandlers
function _initLocalHandlers() {
  var self = this

  self.on('newListener', function (name, handler) {
    self._subscribe(name, handler)
  })
}

//
// ## _handleBroadcasts `_handleBroadcasts()`
//
// Internal use only.
//
// Polls the network for requests, re-emitting them locally.
//
BroadcastHandler.prototype._handleBroadcasts = _handleBroadcasts
function _handleBroadcasts() {
  var self = this
    , messages = null

  // 1. If the router socket is currently closed, it cannot be read from. Otherwise, read from it.
  if (!self._zsub) {
    return
  }

  messages = self._zsub.read(100)

  // 1. If there are no messages, we'll come back to this later. For now, just leave.
  if (!messages) {
    return
  }

  // 1. For each message, we want to emit a local event.
  messages.forEach(function (envelope) {
    var name
      , data

    //    1. If we don't have two message frames or the body isn't valid JSON, this didn't come from a
    //    RequestEmitter. It's safe to ignore.
    if (envelope.length !== 2) {
      return
    }

    try {
      name = envelope[0].toString('utf8')
      data = JSON.parse(envelope[1].toString('utf8'))
    } catch (e) {
      return
    }

    debug('Emitting %s with %s.', name, JSON.stringify(data))

    self._emit(name, data)
  })

  // 1. We may have more messages to receive, so try reading again soon.
  process.nextTick(function () {
    self._handleBroadcasts()
  })
}

module.exports = BroadcastHandler
