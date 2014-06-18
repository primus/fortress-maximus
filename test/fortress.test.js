describe('fortress maximus', function () {
  'use strict';

  var assume = require('assume')
    , Primus = require('primus')
    , fortress = require('../');

  var port = 1024
    , primus
    , http;

  beforeEach(function each(next) {
    http = require('http').createServer();

    primus = new Primus(http, {
      transformer: 'websockets'
    });

    primus.use('fortess maximus', fortress);
    primus.use('emit', require('primus-emit'));

    http.port = port++;
    http.url = 'http://localhost:'+ http.port;

    http.listen(http.port, next);
  });

  afterEach(function each(next) {
    primus.destroy(next);
  });

  it('it adds a validate function', function () {
    assume(primus.validate).to.be.a('function');
  });

  it('adds `invalid` as reserved event', function () {
    assume(primus.reserved('invalid')).to.be.true();
  });

  describe('.validate', function () {
    it('adds a new event listener', function () {
      assume(primus.listeners('fortress:maximus::data')).to.have.length(0);
      primus.validate('data', function (msg, callback) {});
      assume(primus.listeners('fortress:maximus::data')).to.have.length(1);
    });

    it('adds it as a private event', function () {
      assume(primus.reserved('fortress:maximus::ihavenolife')).to.equal(false);
      primus.validate('ihavenolife', function (data, callback) {});
      assume(primus.reserved('fortress:maximus::ihavenolife')).to.equal(true);
    });

    it('does not emit an custom event if there are no validators', function (next) {
      primus.on('connection', function (spark) {
        spark.on('custom', function () {
          throw new Error('I should have failed');
        });
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');

      client.on('open', function () {
        setTimeout(next, 100);
      });
    });

    it('does emit the custom event if we have a validator succes', function (next) {
      primus.on('connection', function (spark) {
        spark.on('custom', next);
      });

      primus.validate('custom', function (next) {
        assume(next).to.be.a('function');
        next();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');
    });

    it('does not emit an custom event if there is a validator err', function (next) {
      primus.on('connection', function (spark) {
        spark.on('custom', function () {
          throw new Error('I should have failed');
        });
      });

      primus.validate('custom', function (validates) {
        assume(validates).to.be.a('function');
        validates(new Error('failed'));

        setTimeout(next, 100);
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');
    });
  });
});
