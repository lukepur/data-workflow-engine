const traverse = require('traverse');
const { cloneDeep } = require('lodash');

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
  'item_validations',
  'data_mapping',
  'fn',
  'args',
  'message',
  'path'
];

function create(c) {
  var map = {};
  const config = TOP_LEVEL_PROPS.reduce((memo, prop) => {
    memo[prop] = cloneDeep(c[prop]);
    return memo;
  }, {});


  traverse(config.sections).forEach(applyPathsFn(map));
  traverse(config.decisions).forEach(applyPathsFn(map, 'decision'));

  config.getConfigNodeByPath = function getConfigNodeByPath(path) {
    return map[path] || map[path.concat('.*')];
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
    if (value.type === 'array_group') {
      // Add an array index placeholder
      return buildIdPath(node.parent, [value.id, '*'].concat(tail));
    }
    return buildIdPath(node.parent, [value.id].concat(tail));
  }
  return buildIdPath(node.parent, tail);
}

module.exports = {
  create
};
