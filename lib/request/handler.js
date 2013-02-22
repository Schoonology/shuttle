//
// # RequestHandler
//

//
// ## Error Handling
//
// Since none of the RequestHandler's methods take callback functions, all error handling (like request handling) is
// facilitated by an 'error' event being emitted.
//
var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , debug = require('debug')('shuttle:RequestHandler')
  , mi = require('mi')
  , zmqstream = require('zmq-stream')

//
// ## RequestHandler `RequestHandler(options)`
//
// Creates a new RequestHandler with the specified options:
//
//  * `linger`: A duration, in ms, that the RequestHandler will wait for outgoing messages to be sent before releasing
//  its resources after `close` is called. Outgoing messages take a non-zero time to be completely sent, and can be
//  dropped by a subsequent call to `close`. A value of -1 indicates an infinite delay. Defaults to -1.
//
function RequestHandler(obj) {
  EventEmitter.call(this)

  obj = obj || {}

  this.linger = (typeof obj.linger === 'number') ? obj.linger : -1

  this._zrouter = null
  this._emit = EventEmitter.prototype.emit
}

//
// ## EventEmitter API (`on`, `once`, `removeAllListeners`, etc.)
//
// RequestHandler inherits from EventEmitter to facilitate local subscriptions to remote events. See the Node.js
// Documentation's [Events API](http://nodejs.org/api/events.html) for more information.
//
// NOTE: Do not call `emit`. It may not work, and should not be relied upon.
//
mi.extend(RequestHandler, EventEmitter)

//
// ## listen `listen(options)`
//
// ### Also `listenForRequests`
//
// Synchronously listens for RequestEmitter connections. If **options.url** is provided, that URL will be used.
// Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
RequestHandler.prototype.listenForRequests = listen
RequestHandler.prototype.listen = listen
function listen(options) {
  var self = this
    , opts = options || {}
    , iface = options.url

  if (!iface) {
    iface = url.format(opts)
  }

  debug('Listening to %s.', iface)

  self._initSocket()
  self._zrouter.bind(iface)
}

//
// ## connect `connect(options)`
//
// ### Also `connectForRequests`
//
// Synchronously connects to a listening RequestEmitter. If **options.url** is provided, that URL will be used.
// Otherwise, **options** will be formatted as a URL as defined by the core `url` module.
//
RequestHandler.prototype.connectForRequests = connect
RequestHandler.prototype.connect = connect
function connect(options) {
  var self = this
    , opts = options || {}
    , iface = options.url

  if (!iface) {
    iface = url.format(opts)
  }

  debug('Connecting to %s.', iface)

  self._initSocket()
  self._zrouter.connect(iface)
}

//
// ## close `close()`
//
// Synchonously releases the underlying resources, allowing the RequestHandler to be `connect`ed or `listen`ed again
// freely.
//
// Unless the RequestHandler was configured with a `linger` period, all pending outgoing messages will be dropped.
//
RequestHandler.prototype.close = close
function close() {
  var self = this

  if (!self._zrouter) {
    return
  }

  debug('Closing.')

  self._zrouter.close()
  self._zrouter = null
}

//
// ## _initSocket `_initSocket()`
//
// Internal use only.
//
// Creates the underlying networking resources.
//
RequestHandler.prototype._initSocket = _initSocket
function _initSocket() {
  var self = this

  if (self._zrouter) {
    return
  }

  self._zrouter = new zmqstream.Socket({
    type: zmqstream.Type.ROUTER
  })

  self._zrouter.set(zmqstream.Option.LINGER, self.linger)

  self._zrouter.on('readable', function () {
    self._handleRequests()
  })
  self._handleRequests()
}

//
// ## _handleRequests `_handleRequests()`
//
// Internal use only.
//
// Polls the network for requests, re-emitting them locally for handling.
//
RequestHandler.prototype._handleRequests = _handleRequests
function _handleRequests() {
  var self = this
    , messages = null

  // 1. If the router socket is currently closed, it cannot be read from. Otherwise, read from it.
  if (!self._zrouter) {
    return
  }

  messages = self._zrouter.read(100)

  // 1. If there are no messages, we'll come back to this later. For now, just leave.
  if (!messages) {
    return
  }

  // 1. For each message, we want to emit a local event to be handled.
  messages.forEach(function (envelope) {
    var payload

    //    1. If we don't have four message frames or the body isn't valid JSON, this didn't come from a
    //    RequestEmitter. It's safe to ignore.
    if (envelope.length !== 4) {
      return
    }

    try {
      payload = JSON.parse(envelope.pop().toString('utf8'))
    } catch (e) {
      return
    }

    debug('Emitting %s with %s.', payload.name, JSON.stringify(payload.data))

    self._emit(payload.name, payload.data, function (err, data) {
      // 1. Once we receive a response, write back to the router this response.
      var response = JSON.stringify({
        err: err,
        data: data
      })

      envelope.push(new Buffer(response))

      debug('Handling response to %s with %s.', payload.name, response)

      // 1. If `write` returns false, we're out of resources to send more messages, and need to throw an error.
      if (!self._zrouter.write(envelope)) {
        // TODO: Put some place safe.
        self._emit('error', new Error('Too many responses'))
      }
    })
  })

  // 1. We may have more messages to receive, so try reading again soon.
  process.nextTick(function () {
    self._handleRequests()
  })
}

module.exports = RequestHandler
