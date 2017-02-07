'use strict';

/**
 ** This is the default context that all Invocables have access to.
 **
 ** Exposing all of lodash's functions for convenience, along with
 ** any other custom ones we need to define
 */

var _ = require('lodash');

var modules = [_, require('./modules/mapping/mapping'), require('./modules/comparators/comparators'), require('./modules/arrays/arrays'), require('./modules/strings/strings'), require('./modules/types/types')];

modules.forEach(function (m) {
  _.each(m, function (fn, name) {
    if (typeof fn === 'function') {
      module.exports[name] = fn;
    }
  });
});