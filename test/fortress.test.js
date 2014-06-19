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

      primus.on('invalid', function (err, args) {
        assume(err.message).to.contain('validator');
        assume(args).to.be.a('array');
        next();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');
    });

    it('does emit the custom event if we have a validator succes', function (next) {
      primus.on('connection', function (spark) {
        spark.on('custom', next);
      });

      primus.on('invalid', function () {
        throw new Error('Fucked');
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
      });

      primus.on('invalid', function (err, args) {
        assume(err.message).to.contain('failed');
        assume(args).to.be.a('array');
        next();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');
    });

    it('does emit an invalid event when were not listening', function (next) {
      primus.validate('custom', function (validates) {
        assume(validates).to.be.a('function');
        validates();
      });

      primus.on('invalid', function (err, args) {
        assume(err.message).to.contain('listen');
        assume(args).to.be.a('array');
        next();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');
    });

    it('does emit an invalid event when args are mising', function (next) {
      primus.on('connection', function (spark) {
        spark.on('custom', function () {
          throw new Error('I should have failed');
        });
      });

      primus.validate('custom', function (foo, validates) {
        assume(validates).to.be.a('function');
        validates();
      });

      primus.on('invalid', function (err, args) {
        assume(err.message).to.contain('arg');
        assume(err.event).to.equal('custom');
        assume(args).to.be.a('array');
        next();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');
    });

    it('receives the emitted args', function (next) {
      primus.on('connection', function (spark) {
        spark.on('custom', function (foo, bar) {
          assume(foo).to.equal('foo');
          assume(bar).to.equal('bar');
          next();
        });
      });

      primus.validate('custom', function (foo, bar, validates) {
        assume(foo).to.equal('foo');
        assume(bar).to.equal('bar');
        validates();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom', 'foo', 'bar');
    });

    it('is called with the spark as context', function (next) {
      var validates = 0
        , sparky;

      primus.on('connection', function (spark) {
        sparky = spark;
        spark.foo = 'bar';

        spark.on('custom', function (foo, bar) {
          assume(foo).to.equal('foo');
          assume(bar).to.equal('bar');
          assume(validates).to.equal(1);

          next();
        });
      });

      primus.validate('custom', function (foo, bar, valid) {
        assume(this.foo).equals('bar');
        assume(this).equals(sparky);
        assume(foo).to.equal('foo');
        assume(bar).to.equal('bar');

        validates++;
        valid();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom', 'foo', 'bar');
    });
  });
});
