var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , debug = require('debug')('shuttle:SynchronizationHandler')
  , mi = require('mi')
  , zmqstream = require('zmq-stream')
  , RequestHandler = require('../request/handler')
  , SynchronizationEmitter = require('./emitter')

//
// # SynchronizationHandler
//
// In addition to the options available to a SynchronizationEmitter or a RequestHandler, SynchronizationHandlers have
// the following options:
//
function SynchronizationHandler(obj) {
  obj = obj || {}

  SynchronizationEmitter.call(this, obj)
  RequestHandler.call(this, obj)

  this.state = {}

  this._zpub = null
  this._initInternalEvents()
}
mi.extend(SynchronizationHandler, SynchronizationEmitter)
mi.extend(SynchronizationHandler, RequestHandler)

//
// ## emit `emit(name, data)`
//
// Emits an event (broadcast) named **name**, along with **data**, over the Shuttle mesh to interested
// SynchronizationEmitters.
//
SynchronizationHandler.prototype.emit = emit
function emit(name, data) {
  var self = this

  if (name === 'newListener') {
    return EventEmitter.prototype.emit.call(this, name, data)
  }

  debug('Emitting %s with %s as a broadcast.', name, JSON.stringify(data))

  // NOTE: We use a separate frame for name because ZMQ won't parse subscription prefixes across boundaries. Otherwise,
  // bizarre errors _could_ occur if name+JSON(data) wound up with a mistakable prefix.
  self._zpub.write([
    new Buffer(name),
    new Buffer(JSON.stringify(data))
  ])
}

//
// ## listenForBroadcasts `listenForBroadcasts(options)`
//
// Synchronously listens for broadcast connections from SynchronizationEmitters. If **options.url** is provided, that
// URL will be used. Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
SynchronizationHandler.prototype.listenForBroadcasts = listenForBroadcasts
function listenForBroadcasts(options) {
  var self = this
    , opts = options || {}
    , iface = options.url

  if (!iface) {
    iface = url.format(opts)
  }

  debug('Listening to %s.', iface)

  self._initSocket()
  self._zpub.bind(iface)
}

//
// ## close `close()`
//
// Synchonously releases the underlying resources, allowing the SynchronizationHandler to be `connect`ed or `listen`ed
// again freely.
//
// Unless the SynchronizationHandler was configured with a `linger` period, all pending outgoing requests and incoming
// updates will be dropped.
//
SynchronizationHandler.prototype.close = close
function close() {
  var self = this

  RequestHandler.prototype.close.call(self)
  SynchronizationEmitter.prototype.close.call(self)

  if (!self._zpub) {
    return
  }

  debug('Closing.')

  self._zpub.close()
  self._zpub = null
}

//
// ## _initSocket `_initSocket()`
//
// Internal use only.
//
// Creates the underlying networking resources.
//
SynchronizationHandler.prototype._initSocket = _initSocket
function _initSocket() {
  var self = this

  RequestHandler.prototype._initSocket.call(self)
  SynchronizationEmitter.prototype._initSocket.call(self)

  if (self._zpub) {
    return
  }

  self._zpub = new zmqstream.Socket({
    type: zmqstream.Type.PUB
  })

  self._zpub.set(zmqstream.Option.LINGER, self.linger)
}

//
// ## _initInternalEvents `_initInternalEvents()`
//
// Internal use only.
//
// Registers handlers for internal-only events like 'get'.
//
SynchronizationHandler.prototype._initInternalEvents = _initInternalEvents
function _initInternalEvents() {
  var self = this

  self.on('get', function (request, callback) {
    var key = request.key

    debug('Got a request for %s.', key)

    callback(null, self.state[key] || null)
  })

  self.on('set', function (request, callback) {
    var key = request.key
      , value = request.value

    debug('Got a request to update %s to %s.', key, value)

    self.state[key] = value

    self.emit('update', {
      key: key,
      value: value
    })

    callback(null, value || null)
  })
}

module.exports = SynchronizationHandler
