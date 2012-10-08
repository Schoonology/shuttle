/*global describe:true, it:true, before:true, after:true, beforeEach:true, afterEach:true */
var expect = require('chai').expect,
    shuttle = require('..');

describe('Consumer-Router-Service Relationship', function () {
    before(function () {
        this.service = new shuttle.Service();
        this.router = new shuttle.Router();
        this.consumer = new shuttle.Consumer();

        this.service.on('test', function (data, callback) {
            expect(data).to.have.property('answer', 42);
            callback(null, {
                ok: true
            });
        });
    });

    beforeEach(function () {
        // Using the IPC transport instead of TCP as TCP causes race conditions when used within the same process.
        this.serviceUrl = '/tmp/' + Math.random().toString().slice(2);
        this.consumerUrl = '/tmp/' + Math.random().toString().slice(2);
    });

    afterEach(function () {
        this.service.close();
        this.router.close();
        this.consumer.close();
    });

    it('should support Router listening, Service and Consumer connecting (no name)', function (done) {
        this.router.listenForServices(null, this.serviceUrl);
        this.router.listenForConsumers(this.consumerUrl);
        this.service.connect(this.serviceUrl);
        this.consumer.connect(this.consumerUrl);

        this.consumer.emit('test', {
            answer: 42
        }, function (err, response) {
            expect(err).to.not.exist;
            expect(response).to.have.property('ok', true);
            done();
        });
    });

    it('should support Router listening, Service and Consumer connecting (named)', function (done) {
        this.router.listenForServices('test', this.serviceUrl);
        this.router.listenForConsumers(this.consumerUrl);
        this.service.connect(this.serviceUrl);
        this.consumer.connect(this.consumerUrl);

        this.consumer.emit('test::test', {
            answer: 42
        }, function (err, response) {
            expect(err).to.not.exist;
            expect(response).to.have.property('ok', true);
            done();
        });
    });
});
