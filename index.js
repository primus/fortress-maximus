'use strict';

var fortress = module.exports;

fortress.server = function server(primus, options) {
  primus.transform('incoming', function incoming(packet, next) {
    var data = packet.data
      , emit = 'object' !== typeof data || !Array.isArray(data.emit)
        ? ['data', data]
        : data.emit;

    //
    // First step of validation, it shouldn't be reserved event.
    //
    if (this.reserved(data.emit[0])) return next(undefined, false);

    primus.emit('fortress:maximus::'+ packet.emit[0], emit, next);
  });

  /**
   * Validate incoming data.
   *
   * @param {String} event The incoming event we need to validate.
   * @param {Function} validator Function that validates.
   * @api public
   */
  primus.validate = function validate(event, validator) {
    var callback = validator.length - 1;

    primus.on('fortress:maximus::'+ event, function validates(emit, next) {
      var event = emit.shift();

      //
      // This is the first step of validation, we want to make sure that we've
      // received the expected amount of data. If we've receive to few or to
      // many events we know that this data is invalid and should be ignored.
      //
      if (emit.length !== callback) return next(undefined, false);

      emit.push(function validated(err) {
        if (err) return next(undefined, false);

        //
        // Re-add the original emitted event again and remove our added callback
        // function which we are currently executing in.
        //
        emit.unshift(event);
        emit.pop();

        next();
      });

      validator.apply(primus, emit);
    });
  };
};
