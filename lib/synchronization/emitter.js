var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , debug = require('debug')('shuttle:SynchronizationEmitter')
  , mi = require('mi')
  , zmqstream = require('zmq-stream')
  , RequestEmitter = require('../request/emitter')
  , BroadcastHandler = require('../broadcast/handler')

//
// # SynchronizationEmitter
//
// In addition to the options available to a RequestEmitter, SynchronizationEmitters have the following options:
//
//  * `autoUpdate`: A value, expressed as a Boolean, that indicates whether or not the SynchronizationEmitter should
//  cache and automatically update any value retrieved via `get`. If true, subsequent calls to `get` will not result in
//  a request, but will respond with the cached value at some point in the future. Defaults to true.
//
function SynchronizationEmitter(obj) {
  obj = obj || {}

  RequestEmitter.call(this, obj)
  BroadcastHandler.call(this, obj)

  this.autoUpdate = (typeof obj.autoUpdate === 'boolean') ? obj.autoUpdate : true

  this._initLocalHandlers()
  this._cache = {}
}

//
// ## EventEmitter API (`on`, `once`, `removeAllListeners`, etc.)
//
// SynchronizationEmitter inherits from EventEmitter to facilitate local subscriptions to remote events. See the Node.js
// Documentation's [Events API](http://nodejs.org/api/events.html) for more information.
//
mi.extend(SynchronizationEmitter, EventEmitter)

//
// NOTE: Remember that SynchronizationEmitter is still a RequestEmitter, so calling `emit` will fire a _remote_ event.
//
mi.extend(SynchronizationEmitter, BroadcastHandler)
mi.extend(SynchronizationEmitter, RequestEmitter)

//
// ## get `get(options, callback)`
//
// Asynchronously attempts to retrieve **options.key**. If successful, **callback** receives the current value.
// Otherwise, **callback** will receive the error. Uses the same timeout/retry/error behaviour as `emit`.
//
// The **callback** is guaranteed to be called asynchronously, even if the value is already present as set by the
// `autoUpdate` option.
//
SynchronizationEmitter.prototype.get = get
function get(options, callback) {
  var self = this
    , key = options.key
    , value = self._cache[key]

  if (typeof value !== 'undefined') {
    process.nextTick(function () {
      callback(null, value)
    })
    return
  }

  self.emit('get', {
    key: key
  }, callback)
}

//
// ## set `set(options, callback)`
//
// Asynchronously attempts to update **options.key** to **options.value**. If successful, **callback** receives the
// current value. Otherwise, **callback** will receive the error. Uses the same timeout/retry/error behaviour as `emit`.
//
SynchronizationEmitter.prototype.set = set
function set(options, callback) {
  var self = this
    , key = options.key
    , value = options.value

  self.emit('set', {
    key: key,
    value: value
  }, callback)
}

//
// ## close `close()`
//
// Synchonously releases the underlying resources, allowing the SynchronizationEmitter to be `connect`ed or `listen`ed
// again freely.
//
// Unless the SynchronizationEmitter was configured with a `linger` period, all pending outgoing requests and incoming
// updates will be dropped.
//
SynchronizationEmitter.prototype.close = close
function close() {
  var self = this

  RequestEmitter.prototype.close.call(self)
  BroadcastHandler.prototype.close.call(self)
}

//
// ## _initSocket `_initSocket()`
//
// Internal use only.
//
// Creates the underlying networking resources.
//
SynchronizationEmitter.prototype._initSocket = _initSocket
function _initSocket() {
  var self = this

  RequestEmitter.prototype._initSocket.call(self)
  BroadcastHandler.prototype._initSocket.call(self)

  if (self._zsub) {
    return
  }

  if (self.autoUpdate) {
    self.on('update', function (data) {
      var key = data.key
        , value = data.value

      debug('Got an update of %s to %s.', key, value)

      self._cache[key] = value
    })
  }
}

module.exports = SynchronizationEmitter
