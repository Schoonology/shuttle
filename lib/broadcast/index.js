var Emitter = require('./emitter')
  , Handler = require('./handler')

module.exports = {
  Emitter: Emitter,
  Handler: Handler,
  createEmitter: function createEmitter(obj) {
    return new Emitter(obj)
  },
  createHandler: function createHandler(obj) {
    return new Handler(obj)
  }
}
