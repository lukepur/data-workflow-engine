module.exports = {
  CONFIG_UNDEFINED: 'Configuration undefined. `create` must be called with a valid configuration object',
  CONFIG_NOT_OBJECT: 'Configuration is not an object. `create` must be called with a valid configuration object',
  DUPLICATE_NODE_ID: (id) => `Duplicate id: ${id} encountered`,
  // sections
  NO_SECTIONS: 'Configuration does not contain any sections. At least one section is required',
  SECTIONS_NOT_ARRAY: 'Sections property is not an array',
  SECTIONS_EMPTY_ARRAY: 'Sections array is empty',
  // edges
  EDGES_NOT_ARRAY: 'Decisions exist, but edges not an array',
  EDGES_EMPTY: 'Decsions exist, but edges array is empty',
  MULTIPLE_PRE_START_NODES: (edge) => `Multiple nodes before START (from: ${edge.from}, to: ${edge.to})`,
  EDGE_TO_NON_EXISTENT: (id) => `Edge \`to\` points to non-existent node: ${id}`,
  EDGE_FROM_NON_EXISTENT: (id) => `Edge \`from\` points to non-existent node: ${id}`,
  EDGE_UNEXPECTED_PATH_TERMINATION: (id) => `No edges defined going from section: ${id}`,
  EDGE_MULTIPLE_EDGES_FROM_SECTION: (id) => `Multiple edges defined going from section: ${id}`,
  EDGE_UNREACHABLE_NODE: (id) => `No edges defined going to section: ${id}`,
  EDGE_NO_TRUE_DECISION_PATH: (id) => `No edges defined going from decision: ${id} for true conditions`,
  EDGE_NO_FALSE_DECISION_PATH: (id) => `No edges defined going from decision: ${id} for false conditions`,
  EDGE_TOO_MANY_DECISION_PATHS: (id) => `Too many edges going from decision: ${id} for false conditions`,
};
