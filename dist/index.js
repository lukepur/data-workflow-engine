'use strict';

var _require = require('lodash'),
    cloneDeep = _require.cloneDeep,
    merge = _require.merge,
    set = _require.set,
    get = _require.get,
    find = _require.find;

var traverse = require('traverse');
var toposort = require('toposort');

var resolve = require('./resolver/resolver');
var DataDescriptor = require('./data-descriptor/data-descriptor');
var prettyJSON = require('./util/pretty-json');

var _require2 = require('./util/path-utils'),
    getDataPathsForRefPath = _require2.getDataPathsForRefPath,
    getRefPathForDataPath = _require2.getRefPathForDataPath;

var defaultContext = require('./context/context');

module.exports = {
  create: function create(config, context) {
    return new DataEngine(config, context);
  }
};

function DataEngine(c) {
  var ctx = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var config = DataDescriptor.create(cloneDeep(c));
  var context = merge({}, defaultContext, ctx);
  var preconditionOrder = orderPreconditions(config);

  this.getConfig = function getConfig() {
    return config;
  };

  this.getContext = function getContext() {
    return context;
  };

  this.getPreconditionOrder = function getPreconditionOrder() {
    return preconditionOrder;
  };
}

DataEngine.prototype.getWorkflowState = function (data) {
  var prunedData = pruneData(data, this.getConfig(), this.getPreconditionOrder(), this.getContext());
  var sectionStates = evaluateSectionStates(prunedData, this.getConfig(), this.getContext());
  return {
    data: prunedData,
    derived: evaluateDerived(prunedData, this.getConfig().derived, this.getContext()),
    input_section_states: sectionStates,
    edge_states: evaluateEdgeStates(prunedData, this.getConfig(), this.getContext(), sectionStates)
  };
};

function orderPreconditions(config) {
  var nodes = config.nodes,
      edges = config.edges;

  var deps = [];
  // collect node preconditions '$' ref dependencies
  traverse(nodes).forEach(function (node) {
    if (node && node.preconditions) {
      (function () {
        var dependantPath = node.path;
        traverse(node.preconditions).forEach(function (preconNode) {
          if (isRefString(preconNode)) {
            deps.push([dependantPath, preconNode]);
          }
        });
      })();
    }
  });
  return toposort(deps).reverse();
}

function isRefString(val) {
  if (typeof val !== 'string') {
    return false;
  }
  return val.indexOf('$.') === 0;
}

function pruneData(data, config, depOrder, context) {
  var result = cloneDeep(data);
  depOrder.forEach(function (dep) {
    var paths = getDataPathsForRefPath(dep, data);
    paths.forEach(function (path) {
      if (!preconditionsMet(config.getConfigNodeByPath(dep), data, context, path)) {
        // remove data at path
        set(result, path, undefined);
      }
    });
  });
  return result;
}

function preconditionsMet(configNode, data, context, dataPath) {
  var preconditions = configNode.preconditions;
  if (!preconditions || !Array.isArray(preconditions)) {
    // no preconditions, so 'met' by default
    return true;
  }
  return preconditions.reduce(function (memo, precondition) {
    return memo && resolve(precondition, data, context, dataPath);
  }, true);
}

function evaluateDerived(data) {
  var derivedConfigNode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var context = arguments[2];

  return derivedConfigNode.reduce(function (memo, derived) {
    memo[derived.id] = resolve(derived, data, context, null);
    return memo;
  }, {});
}

function evaluateSectionStates() {
  var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var nodes = config.nodes;

  var result = {};
  nodes.forEach(function (node) {
    var sectionId = node.id;
    var validationMessages = [];
    traverse(node).forEach(function (n) {
      // requiredValidations
      // cases:
      //  1. static ref - must be present if node's preconditions met
      //  2. ref is descendant of array (*) - collect all data nodes at descendant ref and apply
      if (n && n.required) {
        if (!isArrayPath(n.path)) {
          // static path, e.g. $.personal_details.name.title
          var dataPath = n.path.replace('$.', '');
          // console.log('validating static path', dataPath);
          applyRequiredValidationIfMissing(n, data, context, dataPath, validationMessages);
        } else {
          var pathHead = n.path.split('.');
          pathHead.pop();
          pathHead = pathHead.join('.');
          if (!isArrayPath(pathHead)) {
            applyRequiredValidationIfMissing(n, data, context, pathHead.replace('$.', ''), validationMessages);
          } else {
            // array descendant
            var ancestorRefPath = getNearestRepeatableAncestorRefPath(pathHead);
            var dataPaths = getDataPathsForRefPath(ancestorRefPath, data);
            // console.log(n.path, ' ancestor:', ancestorRefPath);
            // console.log('dataPaths:', dataPaths);
            dataPaths.forEach(function (dataPath) {
              var dataPathString = dataPath.join('.');
              var absoluteDataPath = getAbsoluteDataPath(dataPathString, n.path);
              applyRequiredValidationIfMissing(n, data, context, absoluteDataPath, validationMessages);
            });
          }
        }
      }
    });
    // custom validation checks:
    // for each value in data tree, get associated config node
    // and determine validation message (preconditions met and first validation failure).
    // Add to validationMessages if target path is undefined;
    traverse(data[sectionId]).forEach(function (dataNode) {
      var absolutePath = [sectionId].concat(this.path);
      if (this.isLeaf) {
        var configNode = config.getConfigNodeByPath(getRefPathForDataPath(absolutePath));
        applyCustomValidationIfFails(configNode, data, context, absolutePath, validationMessages);
      }
    });
    result[sectionId] = {
      status: validationMessages.length ? 'invalid' : 'valid',
      validationMessages: validationMessages
    };
  });
  return result;
}

function evaluateEdgeStates() {
  var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var sectionStates = arguments[3];
  var edges = config.edges;

  var nodeEvaluationOrder = getNodeEvaluationOrder(edges);
  var frontierFound = false;
  var nodeStatuses = nodeEvaluationOrder.reduce(function (memo, nodePath) {
    if (isTerminalNodePath(nodePath)) {
      memo[nodePath] = 'active';
      return memo;
    }
    var node = config.getConfigNodeByPath('$.' + nodePath);
    if (frontierFound) {
      memo[nodePath] = 'inactive';
      return memo;
    }
    if (node.type === 'input_section') {
      if (sectionStates[node.id.replace('$.', '')].status === 'valid') {
        memo[nodePath] = 'active';
        return memo;
      } else {
        frontierFound = true;
        memo[nodePath] = 'inactive';
        return memo;
      }
    }
    if (node.type === 'decision') {
      memo[nodePath] = resolve(node.output, data, context, null);
      return memo;
    }
  }, {});

  return edges.map(function (edge) {
    var status = nodeStatuses[edge.from];
    var fromNode = config.getConfigNodeByPath('$.' + edge.from) || {};
    // handle edges from decision nodes
    if (fromNode.type === 'decision' && status !== 'inactive') {
      status = status ? edge.when_input_is ? 'active' : 'inactive' : edge.when_input_is ? 'inactive' : 'active';
    }
    return Object.assign({}, edge, {
      status: status
    });
  });
}

function isTerminalNodePath(path) {
  return path === 'START' || path === 'END';
}

function getNodeEvaluationOrder() {
  var edges = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  var dependencies = [['END', 'START']]; // END depends on START
  edges.forEach(function (edge) {
    dependencies.push([edge.to, edge.from]);
  });
  return toposort(dependencies).reverse();
}

function applyRequiredValidationIfMissing(configNode, data, context, path, messageArr) {
  var validationMessage = validateRequired(configNode, data, context, path);
  if (validationMessage) {
    // console.log('adding validation message:', validationMessage);
    messageArr.push(validationMessage);
  }
}

function validateRequired(configNode, data, context, path) {
  var requiredMessage = resolveRequiredMessage(configNode.required, data, context, path);
  // console.log('\n\npath:', path);
  // console.log('requiredMessage:', requiredMessage);
  // console.log('preconditionsMet:', preconditionsMet(configNode, data, context, path));
  // console.log('dataNodeIsBlank:', dataNodeIsBlank(path, data));
  if (requiredMessage && preconditionsMet(configNode, data, context, path) && dataNodeIsBlank(path, data)) {
    // console.log('required message for ', path, requiredMessage);
    return {
      path: path,
      message: requiredMessage
    };
  }
  return null; // valid
}

function applyCustomValidationIfFails(configNode, data, context, path, messageArr) {
  var validationMessage = validateCustom(configNode, data, context, path);
  if (validationMessage && !find(messageArr, { path: path.join('.') })) {
    // console.log('adding validation message:', validationMessage);
    messageArr.push(validationMessage);
  }
}

function validateCustom() {
  var configNode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var data = arguments[1];
  var context = arguments[2];
  var path = arguments[3];

  var validations = configNode.validations;
  if (!validations) {
    return null;
  }
  if (preconditionsMet(configNode, data, context, path) && !isBlank(get(data, path))) {
    for (var i = 0; i < validations.length; i += 1) {
      var validation = validations[i];
      if (resolve(validation, data, context, path) === false) {
        return {
          path: path.join('.'),
          message: validation.message
        };
      }
    }
  }
  return null; // valid
}

function isArrayPath(path) {
  return path.indexOf('*') > -1;
}

function getNearestRepeatableAncestorRefPath(path) {
  var pathArr = path.split('.');
  var item = void 0;
  while (item = pathArr.pop()) {
    if (item === '*') {
      return pathArr.join('.').concat('.*');
    }
  }
  return null;
}

function getAbsoluteDataPath(rootDataPath, refPath) {
  // crude implementation that doesn't ensure each level is a match
  var dataArr = rootDataPath.split('.');
  var refArr = refPath.replace('$.', '').split('.');
  for (var i = dataArr.length; i < refArr.length; i++) {
    dataArr.push(refArr[i]);
  }
  return dataArr.join('.');
}

function dataNodeIsBlank(path, data) {
  var value = get(data, path);
  // console.log('dataNode value:', value);
  if (value === undefined || value === '') {
    return true;
  }
  if (Array.isArray(value)) {
    if (value.length === 0 || isBlank(value[0])) {
      return true;
    }
  }
  return false;
}

function isBlank(value) {
  return value === undefined || value === '';
}

function resolveRequiredMessage(requiredNode, data, context, path) {
  var resolvedRequired = resolve(requiredNode, data, context, path);
  if (Array.isArray(resolvedRequired)) {
    resolvedRequired = resolvedRequired.reduce(function (memo, result, index) {
      if (result && !memo) {
        memo = requiredNode[index].message;
      }
      return memo;
    }, false);
  }
  return resolvedRequired;
}