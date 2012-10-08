/*global describe:true, it:true, before:true, after:true, beforeEach:true, afterEach:true */
var expect = require('chai').expect,
    shuttle = require('..');

describe('Consumer-Router-MultiService Relationship', function () {
    before(function () {
        this.ok = new shuttle.Service();
        this.notOk = new shuttle.Service();
        this.router = new shuttle.Router();
        this.consumer = new shuttle.Consumer();

        this.ok.on('test', function (data, callback) {
            expect(data).to.have.property('answer', 42);
            callback(null, {
                ok: true
            });
        });
        this.notOk.on('test', function (data, callback) {
            expect(data).to.have.property('answer', 42);
            callback(null, {
                ok: false
            });
        });
    });

    beforeEach(function () {
        // Using the IPC transport instead of TCP as TCP causes race conditions when used within the same process.
        this.serviceUrl = '/tmp/' + Math.random().toString().slice(2);
        this.consumerUrl = '/tmp/' + Math.random().toString().slice(2);
    });

    afterEach(function () {
        this.ok.close();
        this.notOk.close();
        this.router.close();
        this.consumer.close();
    });

    it('should round-robin amongst available Services', function (done) {
        var self = this;

        self.router.listenForServices('test', self.serviceUrl);
        self.router.listenForConsumers(self.consumerUrl);
        self.ok.connect(self.serviceUrl);
        self.notOk.connect(self.serviceUrl);
        self.consumer.connect(self.consumerUrl);

        self.consumer.emit('test::test', {
            answer: 42
        }, function (err, response) {
            var first;

            expect(err).to.not.exist;
            expect(response).to.have.property('ok');

            first = response.ok;
            expect(first).to.be.a('boolean');

            self.consumer.emit('test::test', {
                answer: 42
            }, function (err, response) {
                var second;

                expect(err).to.not.exist;
                expect(response).to.have.property('ok');

                second = response.ok;
                expect(second).to.be.a('boolean');
                expect(second).to.not.equal(first);
                done();
            });
        });
    });
});
