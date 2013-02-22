var zmqstream = require('zmq-stream')
  , RequestHandler = require('../request/handler')
  , SynchronizationEmitter = require('./emitter')
  , util = require('util')

//
// # SynchronizationHandler
//
// In addition to the options available to a SynchronizationEmitter or a RequestHandler, SynchronizationHandlers have
// the following options:
//
function SynchronizationHandler(obj) {
  if (!(this instanceof SynchronizationHandler)) {
    return new SynchronizationHandler(obj)
  }

  obj = obj || {}

  RequestHandler.call(this, obj)

  this._zpub = new zmqstream.Socket({
    type: zmqstream.Type.PUB
  })
}
SynchronizationHandler.createHandler = SynchronizationHandler
util.inherits(SynchronizationHandler, RequestHandler)

//
// ## emit `emit(name, data)`
//
// Emits an event (broadcast) named **name**, along with **data**, over the Shuttle mesh to interested
// SynchronizationEmitters.
//
SynchronizationHandler.prototype.emit = emit
function emit(name, data) {
  var self = this
}

module.exports = SynchronizationHandler
