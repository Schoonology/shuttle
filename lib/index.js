var request = require('./request')
  , broadcast = require('./broadcast')
  , synchronization = require('./synchronization')

module.exports = {
  request: request,
  synchronization: synchronization,
  RequestEmitter: request.Emitter,
  createRequestEmitter: request.createEmitter,
  RequestHandler: request.Handler,
  createRequestHandler: request.createHandler,
  BroadcastEmitter: broadcast.Emitter,
  createBroadcastEmitter: broadcast.createEmitter,
  BroadcastHandler: broadcast.Handler,
  createBroadcastHandler: broadcast.createHandler,
  SynchronizationEmitter: synchronization.Emitter,
  createSynchronizationEmitter: synchronization.createEmitter,
  SynchronizationHandler: synchronization.Handler,
  createSynchronizationHandler: synchronization.createHandler
}
