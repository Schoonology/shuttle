/*global describe:true, it:true, before:true, after:true, beforeEach:true, afterEach:true */
var expect = require('chai').expect,
    shuttle = require('..');

describe('Consumer-Service Relationship', function () {
    before(function () {
        this.service = new shuttle.Service();
        this.consumer = new shuttle.Consumer();

        this.service.on('test', function (data, callback) {
            expect(data).to.have.property('answer', 42);
            callback({
                ok: true
            });
        });
    });

    beforeEach(function () {
        // Using the IPC transport instead of TCP as TCP causes race conditions when used within the same process.
        this.url = 'ipc:///tmp/' + Math.random().toString().slice(2);
    });

    afterEach(function () {
        this.service.close();
        this.consumer.close();
    });

    it('should support Service listening, Consumer connecting', function (done) {
        this.service.listen(this.url);
        this.consumer.connect(this.url);

        this.consumer.send('test', {
            answer: 42
        }, function (err, response) {
            expect(err).to.not.exist;
            expect(response).to.have.property('ok', true);
            done();
        });
    });

    it('should support Consumer listening, Service connecting', function (done) {
        this.consumer.listen(this.url);
        this.service.connect(this.url);

        this.consumer.send('test', {
            answer: 42
        }, function (err, response) {
            expect(err).to.not.exist;
            expect(response).to.have.property('ok', true);
            done();
        });
    });
});
