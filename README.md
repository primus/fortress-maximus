# fortress maximus [![Build Status](https://travis-ci.org/primus/fortress-maximus.svg?branch=master)](https://travis-ci.org/primus/fortress-maximus)

Despite his great power, size, and rank, Fortress Maximus is a weary and
reluctant warrior. Fighting is against his pacifist nature and now spends his
time validating.

> Whether I am a hero or a coward is not the issue! I am weary! My joints creak
> from the corrosion of war without end! I... cannot break this ring of hate that
> surrounds us all -- but I can remove myself from it. No matter what you
> decide... I am leaving and joining Primus to innovate real-time.

Fortress Maximus validates every incoming message on your Primus server as all
user input should be seen as a potential security risk.

## Installation

This a plugin for the Primus framework and can be installed using `npm`:

```
npm install --save fortress-maximus
```

The `--save` tells `npm` to automatically add the installed version to your
package.json.

## Dependencies

In order to work with emitted events we assume that you're using the
`primus-emit` module as emit plugin. Any other plugin will simply be seen and
validated as `data` event. See http://github.com/primus/emit for more
information about this supported plugin.

## Usage

As this a plugin for Primus we need to add it. This plugin only has a server
component so it doesn't require you to re-compile your client. To add this
plugin to your Primus server simply call the `.use` method on your Primus
instance:

```js
primus.use('fortress maximus', require('fortress-maximus'));
```

And you're server will now require validation for every single incoming message.
If you want every single message to be validated make sure that you've added
`fortress-maximus` as the first plugin you use:

```js
primus.use('fortress maximus', require('fortress-maximus'))
      .use('emit', require('primus-emit'));
```

In the example code above we can successfully intercept emit messages and
validate them before they are processed by the `primus-emit` plugin and emitted
on the spark instance.

## Validating

After you've added the plugin you can the newly introduced `primus.validate`
method to add validators for any given event that is emitted on the spark. The
validate method accepts 2 arguments:

1. The name of the event you want to validate. If you are not using custom
   events this would only be the `data` event.
2. The function that does the actual validation. The function should accept the
   same amount of arguments as the event listener + one extra callback function

```js
primus.on('connection', function (spark) {
  spark.on('data', function (msg) {
    // msg will always be string here
  });
});

primus.validate('data', function (msg, next) {
  if ('string' !=== typeof msg) return next(new Error('Invalid'));

  return next();
})
```

When we receive a new message on the server we first run some standard checks to
see if we've received validate data and we:

1. Prevent reserved events from being emitted.
2. Only allow events to be emitted when there are listeners.
3. Only allow events which are validated.
4. Make sure the correct amount of arguments are received.

If all these checks pass we will call the supplied validator function with
arguments.

```js
primus.validate('custom event', function validate(foo, bar, next) {
  if (foo !== 'bar') return next(new Error('Foo should be bar'));
  if (bar !== 'foo') return next(new Error('Bar should be foo'));

  next();
});
```

The context of you validate function will be set to the `spark` so you could do
some additional validation based on that:

```js
primus.validate('admin', function validate(notification, next) {
  isUserAdministrator(this.headers.cookie, function (err, admin) {
    if (err) return next(err);
    if (!admin) return next(new Error('Received admin event by non-admin'));

    next();
  }):
});
```

## Invalid

When ever we fail to validate an incoming message we will prevent it from being
emitted. And will emit an `invalid` event on your Primus server instance. This
invalid event receives 2 arguments:

1. `err` An error instance explaining why the given message was invalid
2. `args` The arguments that we attempted to validate.

```js
primus.on('invalid', function invalid(err, args) {
  // log things
});
```

To figure out which event we've validated you can check the supplied error
object. We add an `event` property on it with the name of the event we've failed
to validate.

```js
primus.on('invalid', function invalid(err, args) {
  console.log(err.event);
});
```

## License

MIT

<img src="https://raw.githubusercontent.com/primus/fortress-maximus/master/logo.jpg" align="right" />