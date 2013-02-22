var request = require('./request')
  , synchronization = require('./synchronization')

module.exports = {
  request: request,
  synchronization: synchronization,
  RequestEmitter: request.Emitter,
  createRequestEmitter: request.createEmitter,
  RequestHandler: request.Handler,
  createRequestHandler: request.createHandler,
  SynchronizationEmitter: synchronization.Emitter,
  createSynchronizationEmitter: synchronization.createEmitter,
  SynchronizationHandler: synchronization.Handler,
  createSynchronizationHandler: synchronization.createHandler
}
