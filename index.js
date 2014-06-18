'use strict';

var fortress = module.exports;

fortress.server = function server(primus, options) {
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
    if (!normal && this.reserved(event)) return next(undefined, false);

    //
    // 2: We require all events to be validated, if we don't have a validator
    // for the given event we will assume it's an attack and it will be ignored.
    //
    if (!this.listeners(event).length || !primus.listeners(namespace).length) {
      return next(undefined, false);
    }

    primus.emit(namespace, emit, next);
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

    primus.on(namespace, function validates(emit, next) {
      //
      // This is the first step of validation, we want to make sure that we've
      // received the expected amount of data. If we've receive to few or to
      // many events we know that this data is invalid and should be ignored.
      //
      if (emit.length !== callback) return next(undefined, false);

      emit.push(function validated(err) {
        if (err) return next(undefined, false);
        next();
      });

      validator.apply(primus, emit);
    });

    //
    // Register as reserved event so plugins cannot emit this.
    //
    primus.reserved.events[namespace] = 1;
  };
};
