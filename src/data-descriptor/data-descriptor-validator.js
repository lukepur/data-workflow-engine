const { cloneDeep, merge, each, find } = require('lodash');

const MESSAGES = require('./validation-message-map');

module.exports = (config) => {
  // Validation: Config is defined
  if (config === undefined) {
    throw new Error(MESSAGES.CONFIG_UNDEFINED);
  }

  // Validation: Config is an object
  if (typeof config !== 'object') {
    throw new Error(MESSAGES.CONFIG_NOT_OBJECT);
  }

  const { sections, decisions, edges } = config;
  const map = {};

  /*** Validate sections ***/

  // Validation: sections defined
  if (sections === undefined) {
    throw new Error(MESSAGES.NO_SECTIONS);
  }

  // Validation: sections is array
  if (!Array.isArray(sections)) {
    throw new Error(MESSAGES.SECTIONS_NOT_ARRAY);
  }

  // Validation: sections array isn't empty
  if (sections.length === 0) {
    throw new Error(MESSAGES.SECTIONS_EMPTY_ARRAY);
  }

  // add sections to map
  sections.forEach(section => {
    map[section.id] = merge(
      cloneDeep(section),
      {
        edgesTo: [],
        edgesFrom: []
      }
    );
  });

  /*** Validate edges ***/

  // edges required if there are decisions
  if (decisions && decisions.length > 0) {
    // Validation: edges is array
    if (!Array.isArray(edges)) {
      throw new Error(MESSAGES.EDGES_NOT_ARRAY);
    }
    // Validation: edges array is not empty
    if (edges.length < 1) {
      throw new Error(MESSAGES.EDGES_EMPTY);
    }

    // add decisions to map
    decisions.forEach(decision => {
      // Validation: duplicate id
      if (map[decision.id]) {
        throw new Error(MESSAGES.DUPLICATE_NODE_ID(decision.id));
      }
      map[decision.id] = merge(
        cloneDeep(decision),
        {
          edgesTo: [],
          edgesFrom: []
        }
      );
    });
    // add edges to map
    edges.forEach(edge => {
      if (!isTerminalId(edge.to)) {
        // Validation: non-existent `to` node
        if (!map[edge.to]) {
          throw new Error(MESSAGES.EDGE_TO_NON_EXISTENT(edge.to));
        }
        map[edge.to].edgesTo.push(cloneDeep(edge));
      }
      if (!isTerminalId(edge.from)) {
        // Validation: non-existent `from` node
        if (!map[edge.from]) {
          throw new Error(MESSAGES.EDGE_FROM_NON_EXISTENT(edge.from));
        }
        map[edge.from].edgesFrom.push(cloneDeep(edge));
      }
    });

    each(map, (section, id) => {
      // Validation: multiple pre start nodes
      const edgeToStart = find(section.edgesFrom, {to: 'START'});
      if (edgeToStart && section.edgesTo.length > 0) {
        throw new Error(MESSAGES.MULTIPLE_PRE_START_NODES(section.edgesTo[0]));
      }

      // Validation: no edge from a node
      if (section.edgesFrom.length === 0) {
        throw new Error(MESSAGES.EDGE_UNEXPECTED_PATH_TERMINATION(section.id));
      }

      // Validation: multiple edges from section type
      if (section.type === 'section' && section.edgesFrom.length > 1) {
        throw new Error(MESSAGES.EDGE_MULTIPLE_EDGES_FROM_SECTION(section.id));
      }

      // Validation: no edge going to a node
      if (!edgeToStart && section.edgesTo.length === 0) {
        throw new Error(MESSAGES.EDGE_UNREACHABLE_NODE(section.id));
      }

      if (section.type !== 'section') { // implicitly decision
        // Validation: no when_input_is: true
        if (!find(section.edgesFrom, {when_input_is: true})){
          throw new Error(MESSAGES.EDGE_NO_TRUE_DECISION_PATH(section.id));
        }

        // Validation: no when_input_is: false
        if (!find(section.edgesFrom, {when_input_is: false})){
          throw new Error(MESSAGES.EDGE_NO_FALSE_DECISION_PATH(section.id));
        }

        if (section.edgesFrom.length > 2) {
          throw new Error(MESSAGES.EDGE_TOO_MANY_DECISION_PATHS(section.id));
        }
      }
    });

  }

};

function isTerminalId(id) {
  return id === 'START' || id === 'END';
}
