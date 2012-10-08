/*global describe:true, it:true, before:true, after:true, beforeEach:true, afterEach:true */
var expect = require('chai').expect,
    shuttle = require('..');

describe('Prosumer-Prosumer Relationship', function () {
    before(function () {
        this.service = new shuttle.Prosumer();
        this.consumer = new shuttle.Prosumer();

        this.service.on('test', function (data, callback) {
            expect(data).to.have.property('answer', 42);
            callback(null, {
                ok: true
            });
        });
    });

    beforeEach(function () {
        // Using the IPC transport instead of TCP as TCP causes race conditions when used within the same process.
        this.url = '/tmp/' + Math.random().toString().slice(2);
    });

    afterEach(function () {
        this.service.close();
        this.consumer.close();
    });

    it('should support Prosumer listening, Prosumer connecting', function (done) {
        this.service.listenForConsumers(this.url);
        this.consumer.connectToService(this.url);

        this.consumer.emit('test', {
            answer: 42
        }, function (err, response) {
            expect(err).to.not.exist;
            expect(response).to.have.property('ok', true);
            done();
        });
    });

    it('should error if the event does not exist', function (done) {
        this.consumer.listenForServices(this.url);
        this.service.connectToConsumer(this.url);

        this.consumer.emit('does not exist', {
            answer: 42
        }, function (err, response) {
            expect(err).to.exist;
            expect(err).to.have.property('message', 'No such event');
            expect(response).to.not.exist;
            done();
        });
    });
});
