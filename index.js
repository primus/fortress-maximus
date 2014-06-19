'use strict';

var fortress = module.exports;

fortress.server = function server(primus, options) {
  /**
   * The incoming message is invalid.
   *
   * @param {Error} err Validation error
   * @param {String} event Name of the event we've validated.
   * @param {Array} args The arguments we've validated.
   * @api private
   */
  function invalid(err, event, args) {
    if ('string' === typeof err) {
      err = new Error(err);
    }

    err.event = event;
    primus.emit('invalid', err, args);
  }

  //
  // Register the `invalid` event, which we emit when we receive invalid and
  // unvalidated data.
  //
  primus.reserved.events.invalid = 1;

  //
  // Transform the incoming messages so we can intercept and deny them.
  //
  primus.transform('incoming', function incoming(packet, next) {
    var data = packet.data
      , normal = 'object' !== typeof data || !Array.isArray(data.emit)
      , emit = (normal ? ['data', data] : data.emit).slice(0);

    //
    // Pre-extract the event name as we don't need it in our argument validation
    // as we already know which event we receive. And we need the event and
    // namespace in order to validate that we actually have listeners for
    // these events as we will ignore the message if we don't
    //
    var event = emit.shift()
      , namespace = 'fortress:maximus::'+ event;

    //
    // 1: The event we're about to emit shouldn't be reserved.
    //
    if (!normal && this.reserved(event)) {
      invalid(new Error(event +' is a reserved event'), event, emit);
      return next(undefined, false);
    }

    //
    // 2: If we don't have listeners for a given event we shouldn't be receiving
    // it. Assume as invalid.
    //
    if (!this.listeners(event).length) {
      invalid(new Error('Missing listener for '+ event), event, emit);
      return next(undefined, false);
    }

    //
    // 3: We require all events to be validated, if we don't have a validator
    // for the given event we will assume it's an attack and it will be ignored.
    //
    if (!primus.listeners(namespace).length) {
      invalid(new Error('Missing validator for '+ event), event, emit);
      return next(undefined, false);
    }

    primus.emit(namespace, emit, this, next);
  });

  /**
   * Validate incoming data.
   *
   * @param {String} event The incoming event we need to validate.
   * @param {Function} validator Function that validates.
   * @api public
   */
  primus.validate = function validate(event, validator) {
    var namespace = 'fortress:maximus::'+ event
      , callback = validator.length - 1;

    primus.on(namespace, function validates(emit, spark, next) {
      //
      // 4: This is the last step of validation, we want to make sure that we've
      // received the expected amount of data. If we've receive to few or to
      // many events we know that this data is invalid and should be ignored.
      //
      if (emit.length !== callback) {
        invalid(new Error('Missing arguments for '+ event), event, emit);
        return next(undefined, false);
      }

      emit.push(function validated(err) {
        if (!err) return next();

        invalid(err, event, emit);
        next(undefined, false);
      });

      validator.apply(spark, emit);
    });

    //
    // Register as reserved event so plugins cannot emit this.
    //
    primus.reserved.events[namespace] = 1;
  };
};
