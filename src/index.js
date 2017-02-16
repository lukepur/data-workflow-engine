const { cloneDeep, merge, set, get, find, dropRight, reduce } = require('lodash');
const traverse = require('traverse');
const toposort = require('toposort');

const resolve = require('./resolver/resolver');
const DataDescriptor = require('./data-descriptor/data-descriptor');
const prettyJSON = require('./util/pretty-json');
const {
  getDataPathsForRefPath,
  getRefPathForDataPath,
  getParentConfigNodePath,
  getParentDataPath,
  getNearestRepeatableAncestorRefPath,
  getMappedPath
} = require('./util/path-utils');
const defaultContext = require('./context/context');

module.exports = {
  create: function(config, context) {
    return new DataEngine(config, context);
  }
};

function DataEngine(c, ctx = {}) {
  const config = DataDescriptor.create(cloneDeep(c));
  const context = merge({}, defaultContext, ctx);
  const preconditionOrder = orderPreconditions(config);

  this.getConfig = function getConfig() {
    return config;
  };

  this.getContext = function getContext() {
    return context;
  };

  this.getPreconditionOrder = function getPreconditionOrder() {
    return preconditionOrder;
  }
}

DataEngine.prototype.getWorkflowState = function (data) {
  const valueCandidates = this.getConfig().getValueCandidatePaths(data);
  const prunedData = pruneData(data, this.getConfig(), this.getPreconditionOrder(), this.getContext());
  const sectionStates = evaluateSectionStates(prunedData, this.getConfig(), this.getContext());
  const edgeStates = evaluateEdgeStates(prunedData, this.getConfig(), this.getContext(), sectionStates);
  const finalData = removeUnreachableSectionData(prunedData, edgeStates);
  const finalSectionStates = updateUnreachableSections(sectionStates, edgeStates);
  const currentPathway = getCurrentPathway(edgeStates);
  return {
    data: finalData,
    mapped_data: applyDataMappings(finalData, valueCandidates, this.getConfig()),
    derived: evaluateDerived(finalData, this.getConfig().derived, this.getContext()),
    section_states: sectionStates,
    edge_states: edgeStates,
    current_pathway: currentPathway
  };
};

DataEngine.prototype.isSectionReachable = function (requestedSectionId, data) {
  const { edge_states } = this.getWorkflowState(data);
  return _isSectionReachable(edge_states, requestedSectionId);
}

DataEngine.prototype.nextSection = function (currentSectionId, data) {
  const { section_states, edge_states } = this.getWorkflowState(data);
  // Case: first section from start
  if (currentSectionId === 'START') {
    return {
      sectionId: find(edge_states, {from: 'START'}).to
    };
  }
  // Case: currentSectionId is END
  if (currentSectionId === 'END') {
    return null;
  }
  // Case: sectionId does not exist
  if (section_states[currentSectionId] === undefined) {
    return null;
  }
  if (_isSectionReachable(edge_states, currentSectionId)) {
    // Case: currentSectionId is reachable and valid
    if (_isSectionValid(section_states, currentSectionId)) {
      return {
        sectionId: _nextSection(edge_states, currentSectionId)
      };
    }

    // Case: currentSectionId is reachable and invalid
    return {
      sectionId: currentSectionId,
      validationMessages: section_states[currentSectionId].validationMessages
    };
  }

  // Case: currentSectionId is unreachable - return furthest reachable section
  const frontier = getFurthest(edge_states);
  return {
    sectionId: frontier.to,
    validationMessages: section_states[frontier.to].validationMessages
  };
}

DataEngine.prototype.previousSection = function (currentSectionId, data) {
  const { section_states, edge_states } = this.getWorkflowState(data);
  // Case: currentSectionId is START
  if (currentSectionId === 'START') {
    return null;
  }
  // Case: current section is first section
  if (find(edge_states, {from: 'START', to: currentSectionId, status: 'active'})) {
    return {
      sectionId: 'START'
    };
  }
  // Case: sectionId does not exist
  if (section_states[currentSectionId] === undefined) {
    return null;
  }
  // Case: current section is reachable - go back
  if (_isSectionReachable(edge_states, currentSectionId)) {
    return {
      sectionId: _previousSection(edge_states, currentSectionId)
    }
  }
  // Case: currentSectionId is unreachable - return previous reachable section
  const previousActiveSection = edgeSearch(
    find(edge_states, {to: currentSectionId}),
    'from',
    'to',
    edge => edge.status === 'active' && edge.toType === 'section',
    edge_states
  );
  const previousActiveSectionId = previousActiveSection && previousActiveSection.to;
  return {
    sectionId: previousActiveSectionId,
    validationMessages: section_states[previousActiveSectionId].validationMessages
  };
}

function getCurrentPathway(edgeStates) {
  return edgeStates.reduce((memo, edge, index) => {
    if (edge.status === 'active' && edge.to !== 'START') {
      const decisionString = (edge.when_input_is !== undefined ? ':'+edge.when_input_is : '');
      memo.push(`${edge.from}${decisionString}`);
    }
    return memo;
  }, []).filter(id => id !== 'START' && id !== 'END');
}

function previousActiveSectionId(currentSectionId, edge_states) {
  let previousSection = find(edge_states, {to: currentSectionId, status: 'active'});
}

// Depth first edge search
function edgeSearch(_frontier, idProp, linkProp, activationFn, searchSpace) {
  // ensure frontier is array
  const frontier = (Array.isArray(_frontier) ? [..._frontier] : [_frontier]);
  if (frontier.length === 0) {
    return null;
  }
  for (let i = 0; i < frontier.length; i++) {
    const candidate = frontier[i];
    if (activationFn(candidate)) {
      return candidate;
    }
  }
  const nextLevel = frontier.reduce((memo, edge) => {
    return memo.concat(find(searchSpace, {[linkProp]: edge[idProp]}));
  }, []);
  return edgeSearch(nextLevel, idProp, linkProp, activationFn, searchSpace);
}

function removeUnreachableSectionData(data, edge_states) {
  return reduce(data, (memo, item, sectionId) => {
    if (_isSectionReachable(edge_states, sectionId)) {
      memo[sectionId] = item;
    }
    return memo;
  }, {});
}

function updateUnreachableSections(sections, edge_states) {
  const _sections = Object.assign({}, sections);
  return reduce(_sections, (memo, section, sectionId) => {
    if (!_isSectionReachable(edge_states, sectionId)) {
      section.status = 'unreachable';
    }
    memo[sectionId] = section;
    return memo;
  }, {});
}

function _isSectionReachable(edge_states, requestedSectionId) {
  return !!find(edge_states, {to: requestedSectionId, status: 'active'})
         || !!find(edge_states, {to: 'START', from: requestedSectionId})
         || requestedSectionId === 'START';
}

function _isSectionValid(section_states, requestedSectionId) {
  return section_states[requestedSectionId].status === 'valid';
}

function _nextSection(edge_states, currentSectionId) {
  const nextSection = find(edge_states, {from: currentSectionId, status: 'active'});
  if (nextSection) {
    if (nextSection.toType === 'section' || nextSection.to === 'END') {
      return nextSection.to;
    }
    return _nextSection(edge_states, nextSection.to);
  }
  return null;
}

function _previousSection(edge_states, currentSectionId) {
  const previousSection = find(edge_states, {to: currentSectionId, status: 'active'});
  if (previousSection) {
    if (previousSection.fromType === 'section' || previousSection.from === 'START') {
      return previousSection.from;
    }
    return _previousSection(edge_states, previousSection.from);
  }
  return null;
}

function getFurthest(edge_states) {
  let edge = find(edge_states, {from: 'START', status: 'active'});
  let nextEdge = find(edge_states, {from: edge.to, status: 'active'});
  while (nextEdge && nextEdge.to !== 'END') {
    const newNextEdge = find(edge_states, {from: edge.to, status: 'active'});
    edge = nextEdge;
    nextEdge = newNextEdge;
  }
  return edge;
}

function applyDataMappings(data, valueCandidates, config) {
  const result = {};
  valueCandidates.forEach(dataPath => {
    const val = get(data, dataPath);
    if (val === undefined) {
      const configNode = config.getConfigNodeByPath(getRefPathForDataPath(dataPath));
      if (configNode.default_value !== undefined) {
        set(result, getMappedPath(dataPath, config), configNode.default_value);
      }
    } else {
      set(result, getMappedPath(dataPath, config), val);
    }
  });
  return result;
}

function orderPreconditions(config) {
  const { sections, edges } = config;
  const deps = [];
  // collect node preconditions '$' ref dependencies
  traverse(sections).forEach(function (node) {
    if (node && node.preconditions) {
      const dependantPath = node.path;
      traverse(node.preconditions).forEach(function (preconNode) {
        if (isRefString (preconNode)) {
          deps.push([dependantPath, preconNode]);
        }
      });
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
  const result = cloneDeep(data);
  depOrder.forEach(function (dep) {
    const paths = getDataPathsForRefPath(dep, data);
    paths.forEach(function (path) {
      if (!evaluatePreconditions(config, dep, data, context, path)) {
        // remove data at path
        set(result, path, undefined);
      }
    });
  });
  return result;
}

function evaluatePreconditions(config, configPath, data, context, dataPath) {
  if (typeof dataPath === 'string') {
    dataPath = dataPath.split('.');
  }
  const configNode = config.getConfigNodeByPath(configPath);
  if (!configNode) {
    return true;
  }
  const preconditions = configNode.preconditions;
  if (!preconditions || !Array.isArray(preconditions)) {
    // no preconditions, so 'met' by default - evaluate parent
    return evaluatePreconditions(config, getParentConfigNodePath(configPath), data, context, getParentDataPath(dataPath));
  }
  return preconditions.reduce((memo, precondition) => {
    return memo && resolve(precondition, data, context, dataPath);
  }, true) && evaluatePreconditions(config, getParentConfigNodePath(configPath), data, context, getParentDataPath(dataPath));
}

function evaluateDerived(data, derivedConfigNode = [], context) {
  return derivedConfigNode.reduce((memo, derived) => {
    memo[derived.id] = resolve(derived, data, context, null);
    return memo;
  }, {});
}

function evaluateSectionStates(data = {}, config = {}, context = {}) {
  const { sections } = config;
  const result = {};
  sections.forEach(node => {
    const sectionId = node.id;
    const validationMessages = [];
    traverse(node).forEach(function (n) {
      // requiredValidations
      // cases:
      //  1. static ref - must be present if node's preconditions met
      //  2. ref is descendant of array (*) - collect all data nodes at descendant ref and apply
      if (n && n.required) {
        if (!isArrayPath(n.path)) {
          // static path, e.g. $.personal_details.name.title
          const dataPath = n.path.replace('$.', '');
          applyRequiredValidationIfMissing(config, n.path, data, context, dataPath, validationMessages);
        } else {
          let pathHead = n.path.split('.');
          pathHead.pop();
          pathHead = pathHead.join('.');
          if (!isArrayPath(pathHead)) {
            applyRequiredValidationIfMissing(config, n.path, data, context, pathHead.replace('$.', ''), validationMessages);
          } else {
            // array descendant
            const ancestorRefPath = getNearestRepeatableAncestorRefPath(pathHead);
            const dataPaths = getDataPathsForRefPath(ancestorRefPath, data);
            dataPaths.forEach(dataPath => {
              const dataPathString = dataPath.join('.')
              const absoluteDataPath = getAbsoluteDataPath(dataPathString, n.path);
              applyRequiredValidationIfMissing(config, n.path, data, context, absoluteDataPath, validationMessages);
            });
          }
        }
      }
    });
    // custom validation checks:
    // for each value in data tree, get associated config node
    // and determine validation message (preconditions met and first validation failure).
    // Add to validationMessages if target path is undefined;
    traverse(data[sectionId]).forEach(function(dataNode) {
      const absolutePath = [sectionId].concat(this.path);
      if (this.isLeaf) {
        const configPath = getRefPathForDataPath(absolutePath);
        applyCustomValidationIfFails(config, configPath, data, context, absolutePath, validationMessages);
      }
    });
    result[sectionId] = {
      status: validationMessages.length ? 'invalid' : 'valid',
      validationMessages
    };
  });
  return result;
}

function evaluateEdgeStates(data = {}, config = {}, context = {}, sectionStates) {
  const { edges } = config;

  return edges.reduce((memo, edge) => {
    let status;
    const activePredescesor = find(memo, {to: edge.from, status: 'active'});
    const fromNode = (config.getConfigNodeByPath('$.' + edge.from) || {});
    const toNode = (config.getConfigNodeByPath('$.' + edge.to) || {});
    if (isTerminalEdgePath(edge.from) || edge.to === 'START') {
      status = 'active';
    } else if (activePredescesor) {
      // can get to this node - is it active?
      if (fromNode.type === 'section') {
        if (sectionStates[edge.from].status === 'valid') {
          status = 'active';
        } else {
          status = 'inactive';
        }
      } else if (fromNode.type === 'decision') {
        status = resolve(fromNode.output, data, context, null);
      }
    } else {
      status = 'inactive';
    }
    // handle edges from decision nodes
    if (fromNode.type === 'decision' && status !== 'inactive') {
      status = (status ?
        (edge.when_input_is ? 'active' : 'inactive') :
        (edge.when_input_is ? 'inactive': 'active')
      );
    }
    memo.push(Object.assign({}, edge, {
      status,
      fromType: fromNode.type,
      toType: toNode.type
    }));
    return memo;
  }, []);
}

function isTerminalEdgePath(path) {
  return path === 'START' || path === 'END';
}

function applyRequiredValidationIfMissing(config, configPath, data, context, path, messageArr) {
  const validationMessage = validateRequired(config, configPath, data, context, path);
  if (validationMessage) {
    messageArr.push(validationMessage);
  }
}

function validateRequired(config, configPath, data, context, path) {
  const configNode = config.getConfigNodeByPath(configPath);
  const requiredMessage = resolveRequiredMessage(configNode.required, data, context, path);
  if (  requiredMessage
        && evaluatePreconditions(config, configPath, data, context, path)
        && dataNodeIsBlank(path, data)
     ) {
    return {
      path,
      message: requiredMessage
    };
  }
  return null; // valid
}

function applyCustomValidationIfFails(config, configPath, data, context, path, messageArr) {
  const configNode = config.getConfigNodeByPath(configPath);
  let dataPath = [...path];
  if (configNode.type === 'array_value') {
    const validationMessage = validateCustom(config, configPath, data, context, dataPath, 'item_validations');
    if (validationMessage && !find(messageArr, {path: dataPath.join('.')})) {
      messageArr.push(validationMessage);
    }
    dataPath = dropRight(dataPath);
  }
  const validationMessage = validateCustom(config, configPath, data, context, dataPath);
  if (validationMessage && !find(messageArr, {path: dataPath.join('.')})) {
    messageArr.push(validationMessage);
  }
}

function validateCustom(config, configPath, data, context, path, validationsProp = 'validations') {
  const configNode = config.getConfigNodeByPath(configPath);
  const validations = configNode[validationsProp];
  if (!validations) {
    return null;
  }
  if ( evaluatePreconditions(config, configPath, data, context, path)
       && !isBlank(get(data, path))) {
    for (let i = 0; i < validations.length; i += 1) {
      const validation = validations[i];
      if (configNode.type === 'array_value') {

      }
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

function getAbsoluteDataPath(rootDataPath, refPath) {
  // crude implementation that doesn't ensure each level is a match
  const dataArr = rootDataPath.split('.');
  const refArr = refPath.replace('$.', '').split('.');
  for (let i = dataArr.length; i < refArr.length; i++) {
    dataArr.push(refArr[i]);
  }
  return dataArr.join('.');
}

function dataNodeIsBlank(path, data) {
  const value = get(data, path);
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
  if (typeof path === 'string') {
    path = path.split('.');
  }
  let resolvedRequired = resolve(requiredNode, data, context, path);
  if (Array.isArray(resolvedRequired)) {
    resolvedRequired = resolvedRequired.reduce((memo, result, index) => {
      if (result && !memo) {
        memo = requiredNode[index].message
      }
      return memo;
    }, false);
  }
  return resolvedRequired;
}
