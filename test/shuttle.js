/*global describe:true, it:true, before:true, after:true, beforeEach:true, afterEach:true */
var shuttle = require('../')
  , expect = require('chai').expect

function generateTestUrl() {
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

  describe('Synchronization', function () {
    it('should work')
  })
})

/*















var fork = require('child_process').fork,
    path = require('path'),
    stepdown = require('stepdown'),
    shuttle = require('../');

function startChild(name, env) {
    return fork(path.join(__dirname, 'fixtures', name), [], {
        silent: true,
        env: env
    });
}

function addReadyHandler(child, callback) {
    child.on('message', function (data) {
        if (data === 'ready') callback();
    });
}

function sendMessage(child, name, data, callback) {
    var id = Math.random().toString().slice(2);

    child.send({
        name: name,
        data: data,
        id: id
    });

    child.on('message', function (data) {
        if (data.id === id) {
            callback(data.err || null, data.result || null);
        }
    });
}

describe('Shuttle', function () {
    beforeEach(function () {
        this.frontUrl = generateTestUrl();
        this.backUrl = generateTestUrl();
    });

    afterEach(function () {
        if (this.listener) {
            this.listener.kill();
        }
        if (this.connector) {
            this.connector.kill();
        }
        if (this.front) {
            this.front.kill();
        }
        if (this.back) {
            this.back.kill();
        }
        if (this.bridge) {
            this.bridge.kill();
        }
        if (this.router) {
            this.router.kill();
        }
    });

    describe('Connections (listening-connecting)', function () {
        function generateEchoTest(listener, connector, emitter) {
            return function test(done) {
                var self = this;

                stepdown([function startListener() {
                    self.listener = startChild(listener, {
                        listenUrl: self.frontUrl,
                        emitter: emitter === 'listener'
                    });

                    addReadyHandler(self.listener, this.addResult());
                }, function startConnector() {
                    self.connector = startChild(connector, {
                        connectUrl: self.frontUrl,
                        emitter: emitter === 'connector'
                    });

                    addReadyHandler(self.connector, this.addResult());
                }, function send() {
                    sendMessage(self[emitter], 'echo', {
                        answer: 42
                    }, this.next);
                }, function checkResult(result) {
                    expect(result).to.have.property('answer', 42);
                    this.next();
                }], done);
            };
        }

        it('should support Service-Consumer', generateEchoTest('service', 'consumer', 'connector'));
        it('should support Consumer-Service', generateEchoTest('consumer', 'service', 'listener'));
        it('should support Prosumer-Prosumer, connector emitting', generateEchoTest('prosumer', 'prosumer', 'connector'));
        it('should support Prosumer-Prosumer, listener emitting', generateEchoTest('prosumer', 'prosumer', 'listener'));
        it('should support Service-Prosumer', generateEchoTest('service', 'prosumer', 'connector'));
        it('should support Prosumer-Service', generateEchoTest('prosumer', 'service', 'listener'));
        it('should support Prosumer-Consumer', generateEchoTest('prosumer', 'consumer', 'connector'));
        it('should support Consumer-Prosumer', generateEchoTest('consumer', 'prosumer', 'listener'));
    });

    describe('Connections (connecting-bridge-connecting)', function () {
        function generateEchoTest(front, back) {
            return function test(done) {
                var self = this;

                stepdown([function startRouter() {
                    self.bridge = startChild('bridge', {
                        frontUrl: self.frontUrl,
                        backUrl: self.backUrl
                    });

                    addReadyHandler(self.bridge, this.addResult());
                }, function startFront() {
                    self.front = startChild(front, {
                        connectUrl: self.frontUrl,
                        emitter: true
                    });

                    addReadyHandler(self.front, this.addResult());
                }, function startBack() {
                    self.back = startChild(back, {
                        connectUrl: self.backUrl,
                        emitter: false
                    });

                    addReadyHandler(self.back, this.addResult());
                }, function send() {
                    sendMessage(self.front, 'echo', {
                        answer: 42
                    }, this.next);
                }, function checkResult(result) {
                    expect(result).to.have.property('answer', 42);
                    this.next();
                }], done);
            };
        }

        it('should support Consumer-Bridge-Service', generateEchoTest('consumer', 'service'));
        it('should support Consumer-Bridge-Prosumer', generateEchoTest('consumer', 'prosumer'));
        it('should support Prosumer-Bridge-Service', generateEchoTest('prosumer', 'service'));
        it('should support Prosumer-Bridge-Prosumer', generateEchoTest('prosumer', 'prosumer'));
    });

    describe('Connections (connecting-router-connecting)', function () {
        function generateEchoTest(front, back) {
            return function test(done) {
                var self = this;

                stepdown([function startRouter() {
                    self.router = startChild('router', {
                        frontUrl: self.frontUrl,
                        backUrl: self.backUrl
                    });

                    addReadyHandler(self.router, this.addResult());
                }, function startFront() {
                    self.front = startChild(front, {
                        connectUrl: self.frontUrl,
                        emitter: true
                    });

                    addReadyHandler(self.front, this.addResult());
                }, function startBack() {
                    self.back = startChild(back, {
                        connectUrl: self.backUrl,
                        emitter: false
                    });

                    addReadyHandler(self.back, this.addResult());
                }, function send() {
                    sendMessage(self.front, 'test::echo', {
                        answer: 42
                    }, this.next);
                }, function checkResult(result) {
                    expect(result).to.have.property('answer', 42);
                    this.next();
                }], done);
            };
        }

        it('should support Consumer-Router-Service', generateEchoTest('consumer', 'service'));
        it('should support Consumer-Router-Prosumer', generateEchoTest('consumer', 'prosumer'));
        it('should support Prosumer-Router-Service', generateEchoTest('prosumer', 'service'));
        it('should support Prosumer-Router-Prosumer', generateEchoTest('prosumer', 'prosumer'));
    });
});
*/
