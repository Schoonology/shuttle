//
// # RequestEmitter
//

//
// ## Error Handling
//
// All of the error handling for RequestEmitters is facilitated by the callback functions its methods accept.
//
var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , debug = require('debug')('shuttle:RequestEmitter')
  , zmqstream = require('zmq-stream')

//
// ## RequestEmitter `RequestEmitter(options)`
//
// Creates a new RequestEmitter with the specified options:
//
//  * `timeout`: A duration, in ms, that the RequestEmitter will wait for a response before retrying or raising an
//  Error. If zero, no timeout mechanism will be used. If requests can not be guaranteed to be idempotent, `timeout` and
//  `retries` should not be used. Defaults to 0 to keep from unduly making this guarantee.
//  * `retries`: A number of times that the RequestEmitter will automatically retry a request that has timed out before
//  raising an Error. If zero, no retries will be made, even if `timeout` is defined. If requests can not be guaranteed
//  to be idempotent, `timeout` and `retries` should not be used. Defaults to 3, which is an arbitrarily-chosen number.
//  * `linger`: A duration, in ms, that the RequestEmitter will wait for outgoing messages to be sent before releasing
//  its resources after `close` is called. Outgoing messages take a non-zero time to be completely sent, and can be
//  dropped by a subsequent call to `close`. A value of -1 indicates an infinite delay. Defaults to 0.
//
function RequestEmitter(obj) {
  obj = obj || {}

  this.linger = (typeof obj.linger === 'number') ? obj.linger : -1

  this._nextRequestId = 0
  this._pending = {}
  this._zdealer = null
}

//
// ## emit `emit(name, data, callback)`
//
// Emits an event (request) named **name**, along with **data**, over the Shuttle mesh, to be handled by some
// RequestHandler. If successful, **Callback** will receive the result of the request. Otherwise, **callback** will
// receive the error.
//
// If the request times out (as defined by `RequestEmitter.timeout` and `RequestEmitter.retries`), **callback** will
// receive a TimeoutError.
//
// NOTE: Do not try to call other EventEmitter methods like `on`. It won't work.
//
RequestEmitter.prototype.emit = emit
function emit(name, data, callback) {
  var self = this
    , requestId
    , payload

  if (name === 'newListener') {
    return EventEmitter.prototype.emit.call(this, name, data)
  }

  requestId = String(self._nextRequestId++)

  self._pending[requestId] = callback
  payload = JSON.stringify({
    name: name,
    data: data
  })

  debug('Emitting %s as request %s with %s.', name, requestId, payload)

  if (!self._zdealer.write([
    new Buffer(0),
    new Buffer(requestId),
    new Buffer(payload)
  ])) {
    // TODO: Bubble up the internal 'drain' event?
    // TODO: Put some place safe.
    callback(new Error('Too many requests'))
  }
}

//
// ## listen `listen(options)`
//
// ### Also `listenForRequests`
//
// Synchronously listens for RequestHandler connections. If **options.url** is provided, that URL will be used.
// Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
RequestEmitter.prototype.listenForRequests = listen
RequestEmitter.prototype.listen = listen
function listen(options) {
  var self = this
    , opts = options || {}
    , iface = options.url

  if (!iface) {
    iface = url.format(opts)
  }

  debug('Listening to %s.', iface)

  self._initSocket()
  self._zdealer.bind(iface)
}

//
// ## connect `connect(options)`
//
// ### Also `connectForRequests`
//
// Synchronously connects to a listening RequestHandler. If **options.url** is provided, that URL will be used.
// Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
RequestEmitter.prototype.connectForRequests = connect
RequestEmitter.prototype.connect = connect
function connect(options) {
  var self = this
    , opts = options || {}
    , iface = options.url

  if (!iface) {
    iface = url.format(opts)
  }

  debug('Connecting to %s.', iface)

  self._initSocket()
  self._zdealer.connect(iface)
}

//
// ## close `close()`
//
// Synchonously releases the underlying resources, allowing the RequestEmitter to be `connect`ed or `listen`ed again
// freely.
//
// Unless the RequestEmitter was configured with a `linger` period, all pending outgoing messages will be dropped.
//
RequestEmitter.prototype.close = close
function close() {
  var self = this

  if (!self._zdealer) {
    return
  }

  debug('Closing.')

  self._zdealer.close()
  self._zdealer = null
}

//
// ## _initSocket `_initSocket()`
//
// Internal use only.
//
// Creates the underlying networking resources.
//
RequestEmitter.prototype._initSocket = _initSocket
function _initSocket() {
  var self = this

  if (self._zdealer) {
    return
  }

  self._zdealer = new zmqstream.Socket({
    type: zmqstream.Type.DEALER
  })

  self._zdealer.set(zmqstream.Option.LINGER, self.linger)

  self._zdealer.on('readable', function () {
    self._handleResponses()
  })
  self._handleResponses()
}

//
// ## _handleResponses `_handleResponses()`
//
// Internal use only.
//
// Polls the network for requests, re-emitting them locally for handling.
//
RequestEmitter.prototype._handleResponses = _handleResponses
function _handleResponses() {
  var self = this
    , messages = null

  // 1. If the dealer socket is currently closed, it cannot be read from. Otherwise, read from it.
  if (!self._zdealer) {
    return
  }

  messages = self._zdealer.read(10)

  // 1. If there are no messages, we'll come back to this later. For now, just leave.
  if (!messages) {
    return
  }

  // 1. For each message, we want to look up the callback and fire it.
  messages.forEach(function (envelope) {
    var payload
      , requestId

    //    1. If we don't have three message frames or the body isn't valid JSON, this didn't come from a
    //    RequestHandler. It's safe to ignore.
    if (envelope.length !== 3) {
      return
    }

    try {
      payload = JSON.parse(envelope.pop().toString('utf8'))
    } catch (e) {
      return
    }

    requestId = String(envelope.pop())

    //    1. If we don't have a callback function, we assume it's meant to be a fire-and-forget event, so we'll ignore
    //    the response.
    if (!self._pending[requestId]) {
      return
    }

    debug('Handling response to request %s with (%s, %s).', requestId, payload.err, JSON.stringify(payload.data))

    self._pending[requestId](payload.err, payload.data)
    ;delete self._pending[requestId]
  })

  // 1. We may have more messages to receive, so try reading again soon.
  process.nextTick(function () {
    self._handleResponses()
  })
}

module.exports = RequestEmitter
