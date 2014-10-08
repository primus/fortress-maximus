/* istanbul ignore next */
describe('fortress maximus', function () {
  'use strict';

  var emit = require('primus-emit')
    , assume = require('assume')
    , Primus = require('primus')
    , fortress = require('./');

  var port = 1024
    , primus
    , http;

  beforeEach(function each(next) {
    http = require('http').createServer();

    primus = new Primus(http, {
      transformer: 'websockets'
    });

    primus.use('fortess maximus', fortress);
    primus.use('emit', emit);

    http.port = port++;
    http.url = 'http://localhost:'+ http.port;

    http.listen(http.port, next);
  });

  afterEach(function each(next) {
    primus.destroy(next);
  });

  it('adds a validate function', function () {
    assume(primus.validate).to.be.a('function');
  });

  it('adds invalid as reserved event', function () {
    assume(primus.reserved('invalid')).to.be.true();
  });

  it('emits an invalid event when the event to emit is reserved', function (next) {
    var primus = new Primus(http, { fortress: 'primus' });

    primus.use('fortess maximus', fortress);
    primus.use('emit', emit);

    primus.on('invalid', function (err, args) {
      assume(err.message).to.contain('reserved');
      assume(args).to.be.a('array');
      primus.destroy(next);
    });

    var client = new primus.Socket(http.url);
    client.emit('connection');
  });

  it('emits an invalid event when there are no listeners', function (next) {
    primus.on('invalid', function (err, args) {
      assume(err.message).to.contain('Missing listener');
      assume(args).to.be.a('array');
      next();
    });

    var client = new primus.Socket(http.url);
    client.emit('custom');
  });

  it('emits an invalid event when there are no listeners (write)', function (next) {
    primus.on('invalid', function (err, args) {
      assume(err.message).to.contain('Missing listener');
      assume(args).is.a('array');
      next();
    });

    var client = new primus.Socket(http.url);
    client.write('data');
  });

  it('emits an invalid event when there are no validators', function (next) {
    primus.on('connection', function (spark) {
      spark.on('custom', function () {
        throw new Error('I should have failed');
      });
    });

    primus.on('invalid', function (err, args) {
      assume(err.message).to.contain('Missing validator');
      assume(args).to.be.a('array');
      next();
    });

    var client = new primus.Socket(http.url);
    client.emit('custom');
  });

  describe('.validate', function () {
    it('returns this', function () {
      assume(primus.validate('data', function (msg, callback) {})).to.equal(primus);
    });

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

    it('emits the event when the validator does not return an error', function (next) {
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

    it('does not emit the event when the validator returns an error', function (next) {
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

    it('emits an invalid event when args are missing', function (next) {
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
        assume(err.message).to.contain('Missing arguments');
        assume(err.event).to.equal('custom');
        assume(args).to.be.a('array');
        next();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');
    });

    it('uses a custom error instance when the validator returns false', function (next) {
      primus.on('connection', function (spark) {
        spark.on('custom', function () {
          throw new Error('I should have failed');
        });
      });

      primus.validate('custom', function (validates) {
        validates(false);
      });

      primus.on('invalid', function (err, args) {
        assume(err.message).to.contain('custom');
        assume(err.event).to.equal('custom');
        assume(args).to.be.a('array');
        next();
      });

      var client = new primus.Socket(http.url);
      client.emit('custom');
    });

    it('uses a proper error instance when the validator returns a string', function (next) {
      primus.on('connection', function (spark) {
        spark.on('custom', function () {
          throw new Error('I should have failed');
        });
      });

      primus.validate('custom', function (validates) {
        validates('a string is not an error');
      });

      primus.on('invalid', function (err, args) {
        assume(err.message).to.contain('string is not an error');
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

    it('is called with the right context (spark)', function (next) {
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

    it('is called with the right context (primus)', function (next) {
      var primus = new Primus(http, { fortress: 'primus' })
        , validates = 0
        , sparky;

      primus.use('fortess maximus', fortress);
      primus.use('emit', require('primus-emit/broadcast'));

      primus.on('connection', function (spark) {
        sparky = spark;
      });
      primus.on('custom', function (spark, foo, bar) {
        assume(spark).equals(sparky);
        assume(foo).to.equal('foo');
        assume(bar).to.equal('bar');
        assume(validates).to.equal(1);

        primus.destroy(next);
      });

      primus.validate('custom', function (foo, bar, valid) {
        assume(this).equals(primus);
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
