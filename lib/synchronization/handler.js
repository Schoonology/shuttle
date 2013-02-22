//
// # SynchronizationHandler
//
var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , debug = require('debug')('shuttle:SynchronizationHandler')
  , mi = require('mi')
  , zmqstream = require('zmq-stream')
  , RequestHandler = require('../request/handler')
  , BroadcastEmitter = require('../broadcast/emitter')
  , SynchronizationEmitter = require('./emitter')

//
// ## SynchronizationHandler `SynchronizationHandler(options)`
//
// Creates a new SynchronizationHandler. The options available are those available to RequestHandlers,
// BroadcastEmitters, and SynchronizationEmitters.
//
function SynchronizationHandler(obj) {
  obj = obj || {}

  SynchronizationEmitter.call(this, obj)
  RequestHandler.call(this, obj)
  BroadcastEmitter.call(this, obj)

  this.state = {}

  this._initInternalEvents()
}
mi.extend(SynchronizationHandler, SynchronizationEmitter)
mi.extend(SynchronizationHandler, RequestHandler)
mi.extend(SynchronizationHandler, BroadcastEmitter)

//
// ## close `close()`
//
// Synchonously releases the underlying resources, allowing the SynchronizationHandler to be `connect`ed or `listen`ed
// again freely.
//
// Unless the SynchronizationHandler was configured with a `linger` period, all pending outgoing requests and incoming
// updates will be dropped.
//
// Returns the SynchronizationEmitter.
//
SynchronizationHandler.prototype.close = close
function close() {
  var self = this

  RequestHandler.prototype.close.call(self)
  BroadcastEmitter.prototype.close.call(self)
  SynchronizationEmitter.prototype.close.call(self)

  return self
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
  BroadcastEmitter.prototype._initSocket.call(self)
  SynchronizationEmitter.prototype._initSocket.call(self)
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
