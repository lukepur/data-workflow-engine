const traverse = require('traverse');

function create(config) {
  var map = {};
  traverse(config.nodes).forEach(applyPathsFn(map));
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
