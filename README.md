# fortress maximus

[![Version npm](https://img.shields.io/npm/v/fortress-maximus.svg?style=flat-square)](https://www.npmjs.com/package/fortress-maximus)[![Build Status](https://img.shields.io/github/workflow/status/primus/fortress-maximus/CI/master?label=CI&style=flat-square)](https://github.com/primus/fortress-maximus/actions?query=workflow%3ACI+branch%3Amaster)[![Dependencies](https://img.shields.io/david/primus/fortress-maximus.svg?style=flat-square)](https://david-dm.org/primus/fortress-maximus)[![Coverage Status](https://img.shields.io/coveralls/primus/fortress-maximus/master.svg?style=flat-square)](https://coveralls.io/r/primus/fortress-maximus?branch=master)[![IRC channel](https://img.shields.io/badge/IRC-irc.freenode.net%23primus-00a8ff.svg?style=flat-square)](https://webchat.freenode.net/?channels=primus)

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

This is a plugin for the Primus framework and can be installed using `npm`:

```
npm install --save fortress-maximus
```

The `--save` tells `npm` to automatically add the installed version to your
package.json.

## Dependencies

In order to work with emitted events we assume that you're using the
`primus-emit` module as emit plugin. Any other plugin will simply be seen and
validated as `data` event. See https://github.com/primus/emit for more
information about this supported plugin.

## Usage

As this is a plugin for Primus we need to add it. This plugin only has a server
component so it doesn't require you to re-compile your client. To add this
plugin to your Primus server simply call the `.plugin` method on your Primus
instance:

```js
primus.plugin('fortress maximus', require('fortress-maximus'));
```

If you want every single message to be validated make sure that you've added
`fortress-maximus` as the first plugin you use:

```js
primus.plugin('fortress maximus', require('fortress-maximus'))
      .plugin('emit', require('primus-emit'));
```

In the example code above we can successfully intercept emit messages and
validate them before they are processed by the `primus-emit` plugin and emitted
on the spark instance. The `primus-emit` module has two different modes which
configure where the events are emitted. On the spark or on the server. We need
to know where so we can correctly validate that there are events registered
for it. That's why it's possible to configure the `fortress-maximus` module
directly through the Primus server constructor. The following options are
available:

- `fortress`: Where the events are emitted. Either `spark` or `primus`.
  Defaults to `spark`.

Just as a quick reminder, this is how you supply the options to your Primus
server:

```js
var primus = new Primus(httpsserver, {
  fortress: 'spark'
});
```

## Validating

After you've added the plugin you can use the newly introduced `primus.validate`
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

When we receive a new message on the server we first run some standard
validation checks to:

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

The context of your validator function will be set to the `spark` so you could
do some additional validation based on that:

```js
primus.validate('admin', function validate(notification, next) {
  isUserAdministrator(this.headers.cookie, function (err, admin) {
    if (err) return next(err);
    if (!admin) return next(new Error('Received admin event by non-admin'));

    next();
  }):
});
```

If you are too lazy to create `new Error()` objects for every single validation
you can also call the callback function with a boolean (`true` or `false`) to
indicate if the event is valid.

```js
primus.validate('custom event', function validate(foo, bar, next) {
  next(foo !== 'bar' && bar !== 'foo');
});
```

## Invalid

When validation fails an `invalid` event is emitted on your Primus server
instance. This `invalid` event receives 2 arguments:

1. `err` An error instance explaining why the given message was invalid.
2. `args` The arguments that we attempted to validate.

```js
primus.on('invalid', function invalid(err, args) {
  // log things
});
```

To figure out which was the event that did not pass validation you can check
the supplied error object. We add an `event` property to it with the name of
the event.

```js
primus.on('invalid', function invalid(err, args) {
  console.log(err.event);
});
```

## Debug

In addition to the `invalid` event, we also log the error with the `diagnostics`
module. These debug messages can be seen by setting the environment variable
`DEBUG`:

```
DEBUG=primus:fortress node <your app.js>
```

## License

[MIT](LICENSE)

![Fortress Maximus](https://raw.githubusercontent.com/primus/fortress-maximus/master/logo.jpg)
