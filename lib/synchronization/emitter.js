var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , debug = require('debug')('shuttle:SynchronizationEmitter')
  , mi = require('mi')
  , zmqstream = require('zmq-stream')
  , RequestEmitter = require('../request/emitter')

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

  this.autoUpdate = (typeof obj.autoUpdate === 'boolean') ? obj.autoUpdate : true

  this._zsub = null
  this._emit = EventEmitter.prototype.emit
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
// ## connectForBroadcasts `connectForBroadcasts(options)`
//
// Synchronously connects to a listening SynchronizationHandler's broadcast socket. If **options.url** is provided, that
// URL will be used. Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
SynchronizationEmitter.prototype.connectForBroadcasts = connectForBroadcasts
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

  if (!self._zsub) {
    return
  }

  debug('Closing.')

  self._zsub.close()
  self._zsub = null
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

  if (self.autoUpdate) {
    self.on('update', function (data) {
      var key = data.key
        , value = data.value

      debug('Got an update of %s to %s.', key, value)

      self._cache[key] = value
    })
  }
}

//
// ## _subscribe `_subscribe(name, handler)`
//
// Internal use only.
//
// Subscribes for broadcast events as made necessary by event handler registration.
//
SynchronizationEmitter.prototype._subscribe = _subscribe
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
SynchronizationEmitter.prototype._initLocalHandlers = _initLocalHandlers
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
SynchronizationEmitter.prototype._handleBroadcasts = _handleBroadcasts
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

module.exports = SynchronizationEmitter
