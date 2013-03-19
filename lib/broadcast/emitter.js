//
// # BroadcastEmitter
//
var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , debug = require('debug')('shuttle:BroadcastEmitter')
  , mi = require('mi')
  , zmqstream = require('zmq-stream')

//
// ## BroadcastEmitter `BroadcastEmitter(options)`
//
// Creates a new BroadcastEmitter with the specified options:
//
//  * `linger`: A duration, in ms, that the BroadcastEmitter will wait for outgoing messages to be sent before releasing
//  its resources after `close` is called. Outgoing messages take a non-zero time to be completely sent, and can be
//  dropped by a subsequent call to `close`. A value of -1 indicates an infinite delay. Defaults to -1.
//
function BroadcastEmitter(obj) {
  obj = obj || {}

  this.linger = (typeof obj.linger === 'number') ? obj.linger : -1

  this._zpub = null
}

//
// ## emit `emit(name, data)`
//
// Emits an event (broadcast) named **name**, along with **data**, over the Shuttle mesh to interested
// BroadcastHandlers.
//
// Returns true if successful. If the underlying resources are overly-saturated, emit will return false. This means the
// message was _not_ delivered.
//
BroadcastEmitter.prototype.emit = emit
function emit(name, data) {
  var self = this

  if (name === 'newListener') {
    return EventEmitter.prototype.emit.call(this, name, data)
  }

  debug('Emitting %s with %s as a broadcast.', name, JSON.stringify(data))

  self._initSocket()
  // NOTE: We use a separate frame for name because ZMQ won't parse subscription prefixes across boundaries. Otherwise,
  // bizarre errors _could_ occur if name+JSON(data) wound up with a mistakable prefix.
  return self._zpub.write([
    new Buffer(name),
    new Buffer(JSON.stringify(data))
  ])
}

//
// ## listen `listen(options)`
//
// ### Also `listenForBroadcasts`
//
// Synchronously listens for broadcast connections from BroadcastHandlers. If **options.url** is provided, that
// URL will be used. Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
// Returns the BroadcastEmitter.
//
BroadcastEmitter.prototype.listenForBroadcasts = listen
BroadcastEmitter.prototype.listen = listen
function listen(options) {
  var self = this
    , opts = options || {}
    , iface = options.url

  if (!iface) {
    iface = url.format(opts)
  }

  debug('Listening to %s.', iface)

  self._initSocket()
  self._zpub.bind(iface)

  return self
}

//
// ## close `close()`
//
// Synchonously releases the underlying resources, allowing the BroadcastEmitter to be `connect`ed or `listen`ed
// again freely.
//
// Unless the BroadcastEmitter was configured with a `linger` period, all pending outgoing requests and incoming
// updates will be dropped.
//
// Returns the BroadcastEmitter.
//
BroadcastEmitter.prototype.close = close
function close() {
  var self = this

  if (!self._zpub) {
    return
  }

  debug('Closing.')

  self._zpub.close()
  self._zpub = null

  return self
}

//
// ## _initSocket `_initSocket()`
//
// Internal use only.
//
// Creates the underlying networking resources.
//
BroadcastEmitter.prototype._initSocket = _initSocket
function _initSocket() {
  var self = this

  if (self._zpub) {
    return
  }

  self._zpub = new zmqstream.Socket({
    type: zmqstream.Type.PUB
  })

  self._zpub.set(zmqstream.Option.LINGER, self.linger)
}

module.exports = BroadcastEmitter
