/**
 ** This is the default context that all Invocables have access to.
 **
 ** Exposing all of lodash's functions for convenience, along with
 ** any other custom ones we need to define
 */

var _ = require('lodash');

var modules = [
  _,
  require('./modules/mapping'),
  require('./modules/comparators'),
  require('./modules/arrays'),
  require('./modules/strings'),
  require('./modules/types')
];

modules.forEach(m => {
  _.each(m, (fn, name) => {
    if (typeof fn === 'function') {
      module.exports[name] = fn;
    }
  });
});
