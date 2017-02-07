# Data Workflow Engine

A configurable data workflow engine. Configure an engine with:

  1. a workflow configuration JSON
  2. a `computation_context`

## Demo

View an online demo here: [https://lukepur.github.io/data-workflow-engine](https://lukepur.github.io/data-workflow-engine).

## Workflow configuration

The workflow configuration object has the following properties:
  - `nodes`: an array of items with a `type` of 'input-section' - nodes which make up the input components of the workflow
  - `decisions`: nodes which allow conditional paths through the workflow
  - `edges`: an array of `edge` items which describe the paths connecting the nodes of the workflow
  - `derived_data`: an array of derived data items which compute the output of running custom functions on a data instance

These entities have the following properties:

#### `input_section`

  - `id`: a unique string reference to this `input_section`
  - `children`: an array of the `input_section`'s items (either `group`, `array_group`, or `value`)

An `input_section` of a data instance can be in one of the following states:

  - `invalid`: there are validation errors in the `input_section`
  - `valid`: there are no validation errors in the `input_section`

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

  - `name`: the name of the function to invoke. This must be a pre-configured method available on the `computation_context` used to configure the engine instance
  - `args`: an array of arguments to pass into the function. The following special tokens can be used as items:
    - `$.<path>`: de-reference the value at `path` of the data instance. See [path resolving](#/path_resolving) for more details
    - `$value`: de-reference the value of the current node. Undefined if node `type` is not `value`

### Path resolving <a href="/#path_resolving"></a>

The following special characters can be used in paths:

- `*`: selects all array items at this level in the path. Note, can be used more than once in a path, and items from other path branches will be included
- `^`: selects the array index that matches the instance index of this node. Useful, for example, to select sibling values

## Data Engine API

To get started, create a Data Engine instance:

1. Import data-engine:
```
const DataEngine = require('data-engine');
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
  input_section_states: Object, // object containing the state of the workflow nodes for `dataInstanceObject`. Each section's ID is a key in the object, and the value has the properties: `status` (either 'valid' or 'invalid') and `validationMessages` which contains an array of `validationMessage` objects
  edge_states: Array // an array of the edge states of the configuration, enhanced with a `status` property - 'active' or 'inactive' depending on whether the `dataInstanceObject` activates this edge
}
```

## Example configuration

See the file [`test/test-configuration.yaml`](test/test-configuration.yaml) for an up-to-date example of how to configure a workflow.
