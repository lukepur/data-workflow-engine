# Data Workflow Engine

A configurable data workflow engine. Configure an engine with:

  1. a workflow configuration JSON
  2. a `computation_context`

## Use cases

The engine is designed as generically as possible, so that a wide range of workflows can be implemented. Some examples might include:
  - A dynamic loan application
  - Customer support tool

The engine is environment agnostic, so the same workflow configuration can be applied client and server side for secure workflow instance verification/validation.

## Demo

View an online demo here: [https://lukepur.github.io/data-workflow-engine](https://lukepur.github.io/data-workflow-engine).

## Workflow configuration

The workflow configuration object has the following properties:
  - `sections`: an array of items with a `type` of 'section' - nodes which make up the input components of the workflow
  - `decisions`: nodes which allow conditional paths through the workflow
  - `edges`: an array of `edge` items which describe the paths connecting the nodes of the workflow
  - `derived_data`: an array of derived data items which compute the output of running custom functions on a data instance

These entities have the following properties:

#### `section`

  - `id`: a unique string reference to this `section`
  - `children`: an array of the `section`'s items (either `group`, or `value`)

An `section` of a data instance can be in one of the following states:

  - `invalid`: there are validation errors in the `section`
  - `valid`: there are no validation errors in the `section`

#### `decision`

  - `id`: a unique string reference to this `decision`
  - `output`: the `func_ref` that will be evaluated on the data instance to return either true or false as the input for a connected outgoing `edge`

#### `edge`

  - `from`: the id of the node this edge directs from
  - `to`: the id of the node this edge direct to
  - `when_input_is`: [optional] activate this edge when the input node is `true` or `false`. This property is only appropriate when the `from` id refers to a `decision` node

#### `derived_data`

  - `id`: a unique string reference for this `derived_data`
  - `fn`: the `func_ref` that will be evaluated on the current data instance to determine the value assigned to `id` in the output data

### `func_ref`

A `func_ref` is a descriptor for run-time computations against a data instance. A `func_ref` has the following properties:

  - `fn`: the name of the function to invoke. This must be a pre-configured method available on the `computation_context` used to configure the engine instance
  - `args`: an array of arguments to pass into the function. The following special tokens can be used as items:
    - `$.<path>`: de-reference the value at `path` of the data instance. See [path resolving](#/path_resolving) for more details
    - `$value`: de-reference the value of the current node. Undefined if node `type` is not `value`

### Path resolving <a href="/#path_resolving"></a>

The following special characters can be used in paths:

- `*`: selects all array items at this level in the path. Note, can be used more than once in a path, and items from other path branches will be included
- `^`: selects the array index that matches the instance index of this node. Useful, for example, to select sibling values

### Data mapping

If a different structure of the data returned by the `getWorkflowState` method is
required, the `data_mapping` property can be used to specify what a `value` or `group` node's value is bound to in the `mapped_data` object. The `mapped_data` object
is included in addition to the `data` property which maintains the hierarchy defined in the
configuration.

For example, consider the following configuration snippet:

```
{
  id: name,
  type: group
  children: [
    {
      id: title,
      type: value
      data_mapping: title
    }
  ]
}
```

By default, the `data` property returned in the response of `getWorkflowState`
would assign a title value as follows:

```
{
  name: {
    title: 'miss'
  }
}
```

But with the above `data_mapping: title` configuration, the value of title would
be assigned directly to the root (or relative to any array ancestor paths) property
of 'title' in the `mapped_data` object:

```
{
  title: 'miss'
}
```

Note that `data_mapping` only applies to the output data - all refs in `func_ref`s
must use the full (unmapped) data path.

## Data Engine API

To get started, create a Data Engine instance:

1. Import data-engine:
```
const DataEngine = require('data-workflow-engine');
```
2. Create a data engine instance:
```
const configuration = require('./path/to/configuration');
// optional - use a custom computation_context which is merged with the default context
const ctx = require('./path/to/computation-context');
const engine = DataEngine.create(configuration, ctx);
```

### Instance methods

#### `getWorkflowState(dataInstanceObject)`

**Usage:** `engine.getWorkflowState(dataInstanceObject)`

Returns an object with the following shape:

```
{
  data: Object, // a 'pruned' representation of `dataInstanceObject` - unmet preconditions and unspecified data items are removed
  derived: Object, // object containing the results of the derived calculations (derived id's are object keys, with results the values)
  section_states: Object, // object containing the state of the workflow nodes for `dataInstanceObject`. Each section's ID is a key in the object, and the value has the properties: `status` (either 'valid' or 'invalid') and `validationMessages` which contains an array of `validationMessage` objects
  edge_states: Array // an array of the edge states of the configuration, enhanced with a `status` property - 'active' or 'inactive' depending on whether the `dataInstanceObject` activates this edge
}
```

#### `nextSection(currentSectionId, dataInstanceObject)`

**Usage:** `engine.nextSection(currentSectionId, dataInstanceObject)`

Returns an object representing the next `section` node that should be visited in
the workflow:

```
{
  sectionId: id_of_next_section,
  validationMessages: [{path: path.to.target, message: message}]
}
```

The next `section` will be determined according to the following rules:

- If the current section is reachable by active edges *and* is valid, the next section
  will be determined by the next active edge(s) which point to that section
- If the current section is reachable by active edges *and* is invalid, the same
  section's id will be returned, indicating the section needs to be made valid before
  the next section can be reached. In this case, the return object will also have a
  `validationMessages` property
- If the current section is unreachable by active edges, then the last reachable section's
  id will be returned, and any applicable `validationMessages`

#### `previousSection(currentSectionId, dataInstanceObject)`

**Usage:** `engine.previousSection(currentSectionId, dataInstanceObject)`

Returns an object representing the previous `section` in the workflow tree:

```
{
  sectionId: id_of_previous_section
}
```

The previous `section` will be determined according to the following rules:

- If the current section is reachable by active edges, the previous section
  will be determined by the previous active edge(s) which point from that section
- If the current section is unreachable by active edges, then the last reachable section's
  id will be returned

#### `isSectionReachable(requestedSectionId, dataInstanceObject)`

**Usage:** `engine.isSectionReachable(requestedSectionId, dataInstanceObject)`

Return a boolean determining whether `requestedSectionId` is reachable for the
given `dataInstanceObject`

## Example configuration

See the file [`test/test-configuration.yaml`](test/test-configuration.yaml) for an up-to-date example of how to configure a workflow.
