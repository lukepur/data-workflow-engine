const traverse = require('traverse');
const toposort = require('toposort');
const { cloneDeep, each } = require('lodash');

const configValidator = require('./data-descriptor-validator');
const {
  isArrayPath,
  getDataPathsForRefPath,
  getPathRelativeToNearestRepeatableAncestor,
  getNearestRepeatableAncestorRefPath
} = require('../util/path-utils');

const TOP_LEVEL_PROPS = [
  'sections',
  'decisions',
  'edges',
  'derived'
];

const SECTION_PROPS = [
  'id',
  'type',
  'children',
  'preconditions',
  'required',
  'validations',
  'is_array',
  'item_validations',
  'data_mapping',
  'default_value',
  'fn',
  'fnRef',
  'args',
  'message',
  'path'
];

function create(c) {
  // validate config - will throw and error if validation fails
  configValidator(c);

  let map = {};
  const config = TOP_LEVEL_PROPS.reduce((memo, prop) => {
    if (prop === 'edges') {
      memo[prop] = sortEdges(cloneDeep(c[prop]));
    } else {
      memo[prop] = cloneDeep(c[prop]);
    }
    return memo;
  }, {});


  traverse(config.sections).forEach(applyPathsFn(map));
  traverse(config.decisions).forEach(applyPathsFn(map, 'decision'));

  config.getConfigNodeByPath = function getConfigNodeByPath(path) {
    return map[path] || map[path.concat('.*')];
  };

  config.getValueCandidatePaths = function getValueCandidatePaths(data) {
    let paths = [];
    each(map, (configNode, path) => {
      if (configNode && configNode.type === 'value') {
        // value in array structure
        if (isArrayPath(path)) {
          const ancestorPaths = getDataPathsForRefPath(getNearestRepeatableAncestorRefPath(path), data);
          const relPath = getPathRelativeToNearestRepeatableAncestor(path);
          ancestorPaths.forEach(ap => {
            ap = ap.concat(relPath);
            paths.push(ap);
          });
        } else {
          // standard static path
          paths.push(path.replace(/^\$\./, '').split('.'));
        }
      }
    });
    return paths;
  };

  // console.log('map keys:', Object.keys(map));

  return config;
}

function applyPathsFn(map, type) {
  return function(node) {
    if (node && node.id) {
      // Add `path` property to each node with an `id`
      const path = stringifyPath(buildIdPath(this));
      this.update(Object.assign(
        {},
        node,
        { path }
      ));
      // Add map reference for fast lookup of this node by path
      map[path] = Object.assign({}, node, { type: node.type || type });
    } else if (this.key && type !== 'decision' && SECTION_PROPS.indexOf(this.key) === -1 && isNaN(this.key)) {
      // remove unknown property
      this.remove();
    }
  }
}

function getParentConfigNode(n) {
  let node = n
  while(node && node.notRoot) {
    if (node.node.path) {
      return node.node;
    }
  }
  return null;
}

function stringifyPath(pathArr) {
  return ['$'].concat(pathArr).join('.');
}

function buildIdPath(node, tail = []) {
  const value = node.node;
  if (!node.parent) {
    return tail;
  }
  if (value && value.id) {
    if (value.type === 'group' && value.is_array) {
      // Add an array index placeholder
      return buildIdPath(node.parent, [value.id, '*'].concat(tail));
    }
    return buildIdPath(node.parent, [value.id].concat(tail));
  }
  return buildIdPath(node.parent, tail);
}

function sortEdges(edges) {
  const edgeEvaluationOrder = getEdgeEvaluationOrder(edges);
  edges.sort(function (a, b) {
    const aToIndex = edgeEvaluationOrder.indexOf(a.to);
    const aFromIndex = edgeEvaluationOrder.indexOf(a.from);
    const bToIndex = edgeEvaluationOrder.indexOf(b.to);
    const bFromIndex = edgeEvaluationOrder.indexOf(b.from);
    if (aFromIndex < bFromIndex) {
      return -1;
    }
    if (aFromIndex > bFromIndex) {
      return 1;
    }
    if (aToIndex > bFromIndex) {
      return -1;
    }
    if (aToIndex < bFromIndex) {
      return 1;
    }
    return 0;
  });
  return edges;
}

function getEdgeEvaluationOrder(edges = []) {
  const dependencies = [['END', 'START']]; // END depends on START
  edges.forEach(edge => {
    dependencies.push([edge.to, edge.from]);
  });
  return toposort(dependencies).reverse();
}


module.exports = {
  create
};
