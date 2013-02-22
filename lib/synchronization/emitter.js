var zmqstream = require('zmq-stream')
  , RequestEmitter = require('../request/emitter')
  , util = require('util')

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
  if (!(this instanceof SynchronizationEmitter)) {
    return new SynchronizationEmitter(obj)
  }

  obj = obj || {}

  RequestEmitter.call(this, obj)

  this._zsub = new zmqstream.Socket({
    type: zmqstream.Type.SUB
  })
}
SynchronizationEmitter.createEmitter = SynchronizationEmitter
util.inherits(SynchronizationEmitter, RequestEmitter)

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
}

//
// ## on `on(name, handler)`
//
// ### Also: `once`, `addListener`, `removeAllListeners`, etc.
//
// Registers **handler** as an event handler to remote (broadcast) events named **name** received from
// SynchronizationHandlers over the Shuttle mesh.
//
// Behaves identically to EventEmitter.on, but only for remote events.
//
// Returns the SynchronizationEmitter.
//
SynchronizationEmitter.prototype.on = on
function on(name, handler) {
  var self = this
}

//
// ## listenForBroadcasts `listenForBroadcasts(options)`
//
// Synchronously listens for broadcast connections from SynchronizationHandlers. If **options.url** is provided, that
// URL will be used. Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
SynchronizationEmitter.prototype.listenForBroadcasts = listenForBroadcasts
function listenForBroadcasts(options) {
  var self = this
}

//
// ## connectForBroadcasts `connectForBroadcasts(options)`
//
// Synchronously connects to a listening SynchronizationHandler's broadcast socket. If **options.url** is provided, that
// URL will be used. Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
SynchronizationEmitter.prototype.connectForBroadcasts = connectForBroadcasts
function connectForBroadcasts(options) {
  var self = this
}

module.exports = SynchronizationEmitter
