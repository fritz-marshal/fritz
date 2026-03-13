import React, { useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { FormControlLabel, Switch } from "@mui/material";
import {
  mongoOperatorLabels,
  flattenFieldOptions,
} from "../../../../constants/filterConstants";
import {
  getOperatorsForField,
  getFieldType,
} from "../../../../utils/conditionHelpers";
import { useConditionContext } from "../../../../hooks/useContexts";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { styled, lighten, darken } from "@mui/system";

const GroupHeader = styled("div")(({ theme }) => {
  // Fallbacks for palette
  const primaryMain = theme.palette?.primary?.main || "#1976d2";
  const primaryLight = theme.palette?.primary?.light || "#42a5f5";
  const isDark = theme.palette?.mode === "dark";
  return {
    position: "sticky",
    top: "-8px",
    padding: "4px 10px",
    color: primaryMain,
    backgroundColor: isDark
      ? darken(primaryMain, 0.8)
      : lighten(primaryLight, 0.85),
  };
});

const GroupItems = styled("ul")({
  padding: 0,
});

const AutocompleteOperators = ({
  operators = [],
  value,
  onChange,
  mongoOperatorLabels_ = {},
}) => {
  // Prepare options with label
  const options = (operators || []).map((op) => ({
    value: op,
    label: mongoOperatorLabels_[op] || op,
    group: "Operators",
  }));

  return (
    <Autocomplete
      size="small"
      options={options}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      sx={{
        width: "100%",
        minWidth: 150,
        "& .MuiAutocomplete-popper": {
          zIndex: 1300,
        },
      }}
      value={options.find((opt) => opt.value === value) || null}
      onChange={(_, newValue) =>
        onChange && onChange(newValue ? newValue.value : "")
      }
      renderInput={(params) => <TextField {...params} label="Operator" />}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <li key={option.value} {...otherProps}>
            {option.label}
          </li>
        );
      }}
      renderGroup={(params) => (
        <li key={params.key}>
          <GroupHeader>{params.group}</GroupHeader>
          <GroupItems>{params.children}</GroupItems>
        </li>
      )}
      isOptionEqualToValue={(option, val) => option.value === val.value}
    />
  );
};

AutocompleteOperators.propTypes = {
  operators: PropTypes.arrayOf(PropTypes.string),
  value: PropTypes.string,
  onChange: PropTypes.func,
  mongoOperatorLabels_: PropTypes.shape({}),
  key: PropTypes.string,
};

AutocompleteOperators.defaultProps = {
  operators: [],
  value: "",
  onChange: null,
  mongoOperatorLabels_: {},
};

// Helper function to check if a field is boolean (same logic as ValueInput)
const isBooleanField = (
  conditionOrBlock,
  customVariables,
  fieldOptionsList,
  customSwitchCases = [],
  schema = null,
  fieldOptions = [],
) => {
  // Use getFieldType to properly check the type, including for switch cases
  const fieldType = getFieldType(
    conditionOrBlock.field,
    customVariables,
    schema,
    fieldOptions,
    fieldOptionsList,
    [], // customListVariables - not needed for boolean check
    customSwitchCases,
  );

  return fieldType === "boolean";
};

const OperatorSelector = ({
  conditionOrBlock,
  block,
  operatorOptions,
  updateCondition,
}) => {
  const {
    customListVariables,
    customVariables,
    fieldOptionsList,
    customSwitchCases,
  } = useConditionContext();

  const schema = useSelector((state) => state.filter_modules?.schema);
  const fieldOptions = flattenFieldOptions(schema);

  // Check if this is a list variable
  const fieldName =
    typeof conditionOrBlock.field === "string"
      ? conditionOrBlock.field
      : conditionOrBlock.field?.name || conditionOrBlock.field;

  const listVariable = customListVariables.find((lv) => lv.name === fieldName);

  if (listVariable) {
    return (
      <ListVariableOperator
        conditionOrBlock={conditionOrBlock}
        block={block}
        updateCondition={updateCondition}
        listOperator={listVariable.listCondition.operator}
      />
    );
  }

  // Check if this is a boolean field - using the same logic as ValueInput
  if (
    isBooleanField(
      conditionOrBlock,
      customVariables,
      fieldOptionsList,
      customSwitchCases,
      schema,
      fieldOptions,
    )
  ) {
    return (
      <BooleanFieldSwitch
        conditionOrBlock={conditionOrBlock}
        block={block}
        updateCondition={updateCondition}
      />
    );
  }

  // Regular operator autocomplete
  return (
    <AutocompleteOperators
      operators={operatorOptions}
      value={conditionOrBlock.operator}
      onChange={(op) =>
        updateCondition(block.id, conditionOrBlock.id, "operator", op)
      }
      mongoOperatorLabels_={mongoOperatorLabels}
      style={{ minWidth: 60, maxWidth: 80 }}
    />
  );
};

OperatorSelector.propTypes = {
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    field: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    operator: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.object,
    ]),
  }).isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  operatorOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  updateCondition: PropTypes.func.isRequired,
};

// Helper function to determine the output type of a list variable based on its creation operator
const getListVariableOutputType = (listOperator) => {
  // Boolean-returning operators
  if (["$anyElementTrue", "$allElementsTrue"].includes(listOperator)) {
    return "boolean";
  }
  // Array-returning operators
  if (["$filter", "$map"].includes(listOperator)) {
    return "array";
  }
  // Number-returning operators
  if (
    ["$min", "$max", "$avg", "$sum", "$size", "$stdDevPop", "$median"].includes(
      listOperator,
    )
  ) {
    return "number";
  }
  // Default to array for unknown operators
  return "array";
};

// Helper function to get default operator based on output type and list operator
const getDefaultOperatorForType = (outputType, listOperator = null) => {
  // For arrays, prefer the operator used to create the list variable
  if (outputType === "array" && listOperator) {
    return listOperator;
  }

  // For boolean output types with anyElementTrue/allElementsTrue, use the list operator
  if (
    outputType === "boolean" &&
    listOperator &&
    ["$anyElementTrue", "$allElementsTrue"].includes(listOperator)
  ) {
    return listOperator;
  }

  switch (outputType) {
    case "number":
      return "$eq"; // Most common comparison for numbers
    case "boolean":
      return "$eq"; // Check if true/false
    case "array":
      return "$lengthGt"; // Fallback for arrays without a list operator
    default:
      return "$exists";
  }
};

const ListVariableOperator = ({
  conditionOrBlock,
  block,
  updateCondition,
  listOperator,
}) => {
  const { customVariables, fieldOptionsList, customListVariables } =
    useConditionContext();
  const schema = useSelector((state) => state.filter_modules?.schema);
  const fieldOptions = flattenFieldOptions(schema);

  const handleOperatorChange = useCallback(
    (op) => {
      updateCondition(block.id, conditionOrBlock.id, "operator", op);
    },
    [updateCondition, block.id, conditionOrBlock.id],
  );

  // Determine the output type of this list variable
  const outputType = getListVariableOutputType(listOperator);

  // Get available operators based on the list variable's OUTPUT type
  const getAvailableOperatorsForListVariable = () => {
    // Use getOperatorsForField with the output type to get the appropriate operators
    const operators = getOperatorsForField(
      conditionOrBlock.field,
      customVariables,
      schema,
      fieldOptions,
      fieldOptionsList,
      customListVariables,
      [], // customSwitchCases - empty array since list variables can't be switch cases
    );

    // For number output types, we should use number operators, not array operators
    if (outputType === "number") {
      const baseOperators = ["$exists", "$isNumber"];
      return [
        "$eq",
        "$ne",
        "$gt",
        "$gte",
        "$lt",
        "$lte",
        "$round",
        ...baseOperators,
      ];
    }

    // For boolean output types, use boolean operators
    if (outputType === "boolean") {
      const baseOperators = ["$exists", "$isNumber"];
      // Include the list operator if it's anyElementTrue or allElementsTrue
      if (["$anyElementTrue", "$allElementsTrue"].includes(listOperator)) {
        return [listOperator, "$eq", "$ne", ...baseOperators];
      }
      return ["$eq", "$ne", ...baseOperators];
    }

    // For array output types, use the standard array operators
    return operators;
  };

  const availableOperators = getAvailableOperatorsForListVariable();
  // Set the default operator based on output type if none is currently set
  // OR if the current operator is not valid for this list variable type
  // OR if it looks like a generic default that should be replaced with the list operator
  useEffect(() => {
    // Get the preferred default operator (the operator used to create the list variable)
    const preferredOperator = getDefaultOperatorForType(
      outputType,
      listOperator,
    );

    // Check if we should update the operator
    const hasNoOperator = !conditionOrBlock.operator;
    const hasInvalidOperator =
      conditionOrBlock.operator &&
      !availableOperators.includes(conditionOrBlock.operator);

    // For arrays: also replace if current is a "generic" array operator but preferred is available
    // This handles cases where the operator was auto-set to $anyElementTrue but should be $filter
    const shouldReplaceWithPreferred =
      outputType === "array" &&
      availableOperators.includes(preferredOperator) &&
      ["$anyElementTrue", "$allElementsTrue"].includes(
        conditionOrBlock.operator,
      ) &&
      preferredOperator !== conditionOrBlock.operator;

    if (
      (hasNoOperator || hasInvalidOperator || shouldReplaceWithPreferred) &&
      availableOperators.length > 0
    ) {
      // Use the preferred operator if it's available, otherwise fall back to the first available
      const operatorToSet = availableOperators.includes(preferredOperator)
        ? preferredOperator
        : availableOperators[0];

      updateCondition(block.id, conditionOrBlock.id, "operator", operatorToSet);
    }
  }, [
    block.id,
    conditionOrBlock.id,
    conditionOrBlock.operator,
    availableOperators,
    outputType,
    listOperator,
    updateCondition,
  ]);

  // Use the current operator if set and valid, otherwise fall back to the first available operator
  const currentOperator =
    conditionOrBlock.operator &&
    availableOperators.includes(conditionOrBlock.operator)
      ? conditionOrBlock.operator
      : availableOperators.length > 0
        ? availableOperators[0]
        : null;

  return (
    <AutocompleteOperators
      operators={availableOperators}
      value={currentOperator}
      onChange={handleOperatorChange}
      mongoOperatorLabels_={mongoOperatorLabels}
      style={{ minWidth: 60, maxWidth: 80 }}
    />
  );
};

ListVariableOperator.propTypes = {
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    field: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    operator: PropTypes.string,
  }).isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  updateCondition: PropTypes.func.isRequired,
  listOperator: PropTypes.string.isRequired,
};

const BooleanFieldSwitch = ({ conditionOrBlock, block, updateCondition }) => {
  const handleSwitchChange = useCallback(
    (e) => {
      updateCondition(block.id, conditionOrBlock.id, "value", e.target.checked);
    },
    [updateCondition, block.id, conditionOrBlock.id],
  );

  return (
    <FormControlLabel
      control={
        <Switch
          checked={conditionOrBlock.value === true}
          onChange={handleSwitchChange}
          color="primary"
        />
      }
      label={String(conditionOrBlock.value === true)}
      labelPlacement="end"
      style={{ marginLeft: 0, marginRight: 8 }}
    />
  );
};

BooleanFieldSwitch.propTypes = {
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.object,
    ]),
  }).isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  updateCondition: PropTypes.func.isRequired,
};

export default OperatorSelector;
