/*global describe:true, it:true, before:true, after:true, beforeEach:true, afterEach:true */
var shuttle = require('../')
  , expect = require('chai').expect

function generateTestUrl() {
  // return 'tcp://127.0.0.1:' + (16000 + Math.floor(Math.random() * 1000))
  return 'ipc:///tmp/' + Math.random().toString().slice(2)
}

describe('Shuttle', function () {
  describe('Request', function () {
    beforeEach(function () {
      this.emitter = shuttle.createRequestEmitter()
      this.handler = shuttle.createRequestHandler()
      this.url = generateTestUrl()

      this.handler.listenForRequests({
        url: this.url
      })
      this.emitter.connectForRequests({
        url: this.url
      })
    })

    afterEach(function () {
      this.emitter.close()
      this.handler.close()
    })

    it('should work', function (done) {
      this.handler.on('echo', function (data, callback) {
        callback(null, data)
      })

      this.emitter.emit('echo', {
        test: true
      }, function (err, response) {
        expect(response).to.have.property('test', true)
        done(err)
      })
    })
  })

  describe('Broadcast', function () {
    beforeEach(function () {
      this.emitter = shuttle.createBroadcastEmitter()
      this.handler = shuttle.createBroadcastHandler()

      this.url = generateTestUrl()

      this.emitter.listenForBroadcasts({
        url: this.url
      })

      this.handler.connectForBroadcasts({
        url: this.url
      })
    })

    afterEach(function () {
      this.emitter.close()
      this.handler.close()
    })

    it('should work', function (done) {
      this.handler.on('bcast', function (data) {
        expect(data).to.have.property('test', true)
        done()
      })

      this.emitter.emit('bcast', {
        test: true
      })
    })
  })

  describe('Synchronization', function () {
    beforeEach(function () {
      this.emitter = shuttle.createSynchronizationEmitter()
      this.handler = shuttle.createSynchronizationHandler()

      this.requestUrl = generateTestUrl()
      this.synchronizationUrl = generateTestUrl()

      this.handler.listenForRequests({
        url: this.requestUrl
      })
      this.handler.listenForBroadcasts({
        url: this.synchronizationUrl
      })

      this.emitter.connectForRequests({
        url: this.requestUrl
      })
      this.emitter.connectForBroadcasts({
        url: this.synchronizationUrl
      })
    })

    afterEach(function () {
      this.emitter.close()
      this.handler.close()
    })

    it('should continue to work as req-rep', function (done) {
      this.handler.on('echo', function (data, callback) {
        callback(null, data)
      })

      this.emitter.emit('echo', {
        test: true
      }, function (err, response) {
        expect(response).to.have.property('test', true)
        done(err)
      })
    })

    it('should also work as broadcast', function (done) {
      this.emitter.on('bcast', function (data) {
        expect(data).to.have.property('test', true)
        done()
      })

      this.handler.emit('bcast', {
        test: true
      })
    })

    it('should, finally, work for synchronizing state', function (done) {
      var self = this

      self.emitter.get({
        key: 'a'
      }, function (err, data) {
        expect(data).to.be.null

        self.emitter.set({
          key: 'a',
          value: 42
        }, function (err, data) {
          expect(data).to.equal(42)

          self.emitter.get({
            key: 'a'
          }, function (err, data) {
            expect(data).to.equal(42)

            done()
          })
        })
      })
    })

    // TODO: Finish testing:
    //  * Options (linger, autoUpdate)
    //  * Error handling
    //  * Detailed API tests
  })
})
