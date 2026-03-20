import React from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { useConditionContext } from "../../../../hooks/useContexts";
import {
  Button,
  Switch,
  FormControlLabel,
  Popover,
  Paper,
} from "@mui/material";
import AutocompleteFields from "./AutocompleteFields";
import ConditionalValueBuilder from "./ConditionalValueBuilder";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";
import {
  mongoOperatorTypes,
  flattenFieldOptions,
} from "../../../../constants/filterConstants";
import {
  getFieldOptionsWithVariable,
  normalizeFieldValue,
} from "../../../../utils/conditionHelpers";

const underscoreLatexForDisplay = (text) => {
  if (!text) return text;
  return text.replace(/_/g, "\\_");
};

export const EquationPopover = ({
  openEquationIds,
  conditionId,
  selectedChip,
  fieldOptionsWithVariable,
  conditionOrBlock,
  customVariables,
  anchorEl,
  onClose,
}) => {
  const isOpen = openEquationIds.includes(conditionId) && anchorEl;

  if (!isOpen) return null;

  let variableOption;
  if (selectedChip === "left") {
    variableOption = fieldOptionsWithVariable.find(
      (opt) =>
        opt.label ===
          (conditionOrBlock.field || conditionOrBlock.variableName) &&
        opt.isVariable,
    );
  }
  if (selectedChip === "right") {
    variableOption = fieldOptionsWithVariable.find(
      (opt) => opt.label === conditionOrBlock.value && opt.isVariable,
    );
  }

  if (!variableOption) return null;

  const eqObj = customVariables.find(
    (eq) => eq.variable === variableOption.label,
  );
  const equation = eqObj ? eqObj.variable : variableOption.equation;
  const displayEquation = underscoreLatexForDisplay(equation);

  return (
    <Popover
      open={!!isOpen}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "center",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "center",
        horizontal: "left",
      }}
      sx={{
        "& .MuiPopover-paper": {
          maxWidth: 600,
          minWidth: 300,
        },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 2,
          background: "#fef3c7",
          border: "1px solid #fde68a",
          borderRadius: 2,
        }}
      >
        <Latex>{`$$${displayEquation}$$`}</Latex>
      </Paper>
    </Popover>
  );
};

EquationPopover.propTypes = {
  openEquationIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  conditionId: PropTypes.string.isRequired,
  selectedChip: PropTypes.string.isRequired,
  fieldOptionsWithVariable: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  conditionOrBlock: PropTypes.shape({
    field: PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})]),
    variableName: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.shape({})),
      PropTypes.shape({}),
    ]),
    fieldType: PropTypes.string,
    booleanSwitch: PropTypes.bool,
  }).isRequired,
  customVariables: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  anchorEl: PropTypes.shape({}),
  onClose: PropTypes.func.isRequired,
};

const shouldSkipValueInput = (conditionOrBlock) => {
  return (
    mongoOperatorTypes[conditionOrBlock.operator] === "exists" ||
    mongoOperatorTypes[conditionOrBlock.operator] === "array_single" ||
    mongoOperatorTypes[conditionOrBlock.operator] === "array_number" ||
    mongoOperatorTypes[conditionOrBlock.operator] === "round" ||
    (mongoOperatorTypes[conditionOrBlock.operator] === "aggregation" &&
      conditionOrBlock.value &&
      typeof conditionOrBlock.value === "object" &&
      conditionOrBlock.value.type === "array" &&
      conditionOrBlock.value.subField)
  );
};

const ArrayFieldInput = ({ conditionOrBlock, block }) => {
  const { setListConditionDialog } = useConditionContext();

  // For all array operators that should show the "+ List Variable" button
  return (
    <Button
      variant="outlined"
      color="primary"
      onClick={() => {
        if (setListConditionDialog) {
          setListConditionDialog({
            open: true,
            blockId: block.id,
            conditionId: conditionOrBlock.id,
          });
        }
      }}
      sx={{
        minWidth: 150,
        height: 40,
        borderStyle: "fixed",
        borderWidth: 2,
        "&:hover": {
          borderStyle: "fixed",
          borderWidth: 2,
        },
      }}
    >
      + List Variable
    </Button>
  );
};

ArrayFieldInput.propTypes = {
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    operator: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.shape({})),
      PropTypes.shape({}),
    ]),
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};

const ListVariableInput = ({
  listVariable,
  conditionOrBlock,
  block,
  updateCondition,
  setOpenEquationIds,
  setSelectedChip,
  setEquationAnchor = null,
}) => {
  const {
    customVariables,
    customListVariables,
    fieldOptionsList,
    customSwitchCases,
    isListDialogOpen,
    setListConditionDialog,
  } = useConditionContext();
  const currentStream = useSelector(
    (state) => state.boom_filter_v.stream?.name,
  );
  const operator =
    listVariable.listCondition?.operator || listVariable.operator;
  const selectedOperator = conditionOrBlock.operator;

  // For $in and $nin operators, always show AutocompleteFields
  if (selectedOperator === "$in" || selectedOperator === "$nin") {
    return (
      <AutocompleteFields
        key={`${conditionOrBlock.id}.right`}
        fieldOptions={getFieldOptionsWithVariable(
          fieldOptionsList,
          customVariables,
          customListVariables,
          customSwitchCases || [],
          [],
          conditionOrBlock.createdAt,
          currentStream,
        )}
        value={(() => {
          const val = conditionOrBlock.value;
          if (!val) return "";
          if (typeof val === "string") return val;
          if (typeof val === "object" && val.name) return val.name;
          return String(val);
        })()}
        onChange={(newValue) =>
          updateCondition(block.id, conditionOrBlock.id, "value", newValue)
        }
        conditionOrBlock={conditionOrBlock}
        setOpenEquationIds={setOpenEquationIds}
        customVariables={[]}
        setSelectedChip={setSelectedChip}
        side={"right"}
        style={{ width: "100%" }}
        isListDialog={isListDialogOpen}
        customListVariables={customListVariables}
        setEquationAnchor={setEquationAnchor}
      />
    );
  }

  // For array operators ($anyElementTrue, $allElementsTrue), show a boolean switch
  if (
    conditionOrBlock.operator === "$anyElementTrue" ||
    conditionOrBlock.operator === "$allElementsTrue"
  ) {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={conditionOrBlock.booleanSwitch !== false}
            onChange={(e) =>
              updateCondition(
                block.id,
                conditionOrBlock.id,
                "booleanSwitch",
                e.target.checked,
              )
            }
            color="primary"
          />
        }
        label={conditionOrBlock.booleanSwitch !== false ? "True" : "False"}
        labelPlacement="end"
        style={{ marginLeft: 0, marginRight: 8, minWidth: 100 }}
      />
    );
  }

  // For aggregation list variables with comparison operators, show regular value input
  if (
    mongoOperatorTypes[operator] === "aggregation" &&
    mongoOperatorTypes[conditionOrBlock.operator] === "comparison"
  ) {
    return (
      <AutocompleteFields
        key={`${conditionOrBlock.id}.right`}
        fieldOptions={getFieldOptionsWithVariable(
          fieldOptionsList,
          customVariables,
          customListVariables,
          customSwitchCases || [],
          [],
          conditionOrBlock.createdAt,
          currentStream,
        )}
        value={(() => {
          const val = conditionOrBlock.value;
          if (!val) return "";
          if (typeof val === "string") return val;
          if (typeof val === "object" && val.name) return val.name;
          return String(val);
        })()}
        onChange={(newValue) =>
          updateCondition(block.id, conditionOrBlock.id, "value", newValue)
        }
        conditionOrBlock={conditionOrBlock}
        setOpenEquationIds={setOpenEquationIds}
        customVariables={[]}
        setSelectedChip={setSelectedChip}
        side={"right"}
        style={{ width: "100%" }}
        isListDialog={isListDialogOpen}
        customListVariables={customListVariables}
        setEquationAnchor={setEquationAnchor}
      />
    );
  }

  // Check if we need the "+ List Variable" button
  const isFilterVariable =
    listVariable &&
    (listVariable.listCondition?.operator === "$filter" ||
      listVariable.operator === "$filter");
  const currentOperator = conditionOrBlock.operator;
  const isArrayOrAggregationOperator =
    mongoOperatorTypes[currentOperator] === "array" ||
    mongoOperatorTypes[currentOperator] === "aggregation";

  if (isFilterVariable && isArrayOrAggregationOperator) {
    return (
      <Button
        variant="outlined"
        color="primary"
        onClick={() => {
          if (setListConditionDialog) {
            setListConditionDialog({
              open: true,
              blockId: block.id,
              conditionId: conditionOrBlock.id,
            });
          }
        }}
        sx={{
          minWidth: 150,
          height: 40,
          borderStyle: "fixed",
          borderWidth: 2,
          "&:hover": {
            borderStyle: "fixed",
            borderWidth: 2,
          },
        }}
      >
        + List Variable
      </Button>
    );
  }

  // For other list variables, show empty AutocompleteFields (disabled)
  return (
    <AutocompleteFields
      key={`${conditionOrBlock.id}.right`}
      fieldOptions={[]}
      value={""}
      onChange={() => {}} // Disabled for list variables
      conditionOrBlock={{ ...conditionOrBlock, value: "" }}
      setOpenEquationIds={setOpenEquationIds}
      customVariables={[]}
      setSelectedChip={setSelectedChip}
      side={"right"}
      style={{ width: "100%", opacity: 0.5 }}
      isListDialog={isListDialogOpen}
      customListVariables={customListVariables}
      setEquationAnchor={setEquationAnchor}
    />
  );
};

ListVariableInput.propTypes = {
  listVariable: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.shape({})),
      PropTypes.shape({}),
    ]),
    operator: PropTypes.string,
    listCondition: PropTypes.shape({
      operator: PropTypes.string,
    }),
  }).isRequired,
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    operator: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.shape({})),
      PropTypes.shape({}),
    ]),
    booleanSwitch: PropTypes.bool,
    createdAt: PropTypes.number,
  }).isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  updateCondition: PropTypes.func.isRequired,
  setOpenEquationIds: PropTypes.func.isRequired,
  setSelectedChip: PropTypes.func.isRequired,
  setEquationAnchor: PropTypes.func,
};

export const ConditionalValueInput = ({
  conditionOrBlock,
  block,
  updateCondition,
  defaultCondition,
  defaultBlock,
  fieldOptionsList,
}) => {
  const handleSwitchDataChange = (newSwitchData) => {
    updateCondition(block.id, conditionOrBlock.id, "value", newSwitchData);
  };

  return (
    <ConditionalValueBuilder
      value={conditionOrBlock.value}
      onChange={handleSwitchDataChange}
      defaultCondition={defaultCondition}
      defaultBlock={defaultBlock}
      fieldOptionsList={fieldOptionsList}
    />
  );
};

ConditionalValueInput.propTypes = {
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    operator: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.shape({})),
      PropTypes.shape({}),
    ]),
  }).isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  updateCondition: PropTypes.func.isRequired,
  defaultCondition: PropTypes.func.isRequired,
  defaultBlock: PropTypes.func.isRequired,
  fieldOptionsList: PropTypes.arrayOf(PropTypes.shape({})),
};

const RegularValueInput = ({
  conditionOrBlock,
  block,
  updateCondition,
  setOpenEquationIds,
  setSelectedChip,
  setEquationAnchor = null,
}) => {
  const {
    customVariables,
    customListVariables,
    customSwitchCases,
    fieldOptionsList,
    isListDialogOpen,
  } = useConditionContext();
  const currentStream = useSelector(
    (state) => state.boom_filter_v.stream?.name,
  );

  return (
    <AutocompleteFields
      key={`${conditionOrBlock.id}.right`}
      fieldOptions={getFieldOptionsWithVariable(
        fieldOptionsList,
        customVariables,
        customListVariables,
        customSwitchCases || [],
        [],
        conditionOrBlock.createdAt,
        currentStream,
      )}
      value={(() => {
        // Check if this is an aggregation operator that should be shown on the left
        const isAggregationOnLeft =
          conditionOrBlock.value &&
          typeof conditionOrBlock.value === "object" &&
          conditionOrBlock.value.type === "array" &&
          conditionOrBlock.value.subField &&
          ["$min", "$max", "$avg", "$sum"].includes(conditionOrBlock.operator);

        const rawValue = isAggregationOnLeft ? "" : conditionOrBlock.value;

        // Normalize value to handle both string and object formats
        if (rawValue === null || rawValue === undefined) {
          return "";
        }
        if (typeof rawValue === "string") return rawValue;
        if (typeof rawValue === "object" && rawValue.name) return rawValue.name;
        return String(rawValue);
      })()}
      onChange={(newValue) => {
        updateCondition(block.id, conditionOrBlock.id, "value", newValue);
      }}
      conditionOrBlock={(() => {
        // Check if this is an aggregation operator that should be shown on the left
        const isAggregationOnLeft =
          conditionOrBlock.value &&
          typeof conditionOrBlock.value === "object" &&
          conditionOrBlock.value.type === "array" &&
          conditionOrBlock.value.subField &&
          ["$min", "$max", "$avg", "$sum"].includes(conditionOrBlock.operator);

        if (isAggregationOnLeft) {
          return {
            ...conditionOrBlock,
            value: "", // This prevents the aggregation chip from showing on the right
          };
        }

        return conditionOrBlock;
      })()}
      setOpenEquationIds={setOpenEquationIds}
      customVariables={[]}
      setSelectedChip={setSelectedChip}
      side={"right"}
      style={{ width: "100%" }}
      isListDialog={isListDialogOpen}
      customListVariables={customListVariables}
      setEquationAnchor={setEquationAnchor}
    />
  );
};

RegularValueInput.propTypes = {
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    operator: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.shape({})),
      PropTypes.shape({}),
    ]),
    createdAt: PropTypes.number,
  }).isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  updateCondition: PropTypes.func.isRequired,
  setOpenEquationIds: PropTypes.func.isRequired,
  setSelectedChip: PropTypes.func.isRequired,
  setEquationAnchor: PropTypes.func,
};

const ValueInput = ({
  conditionOrBlock,
  block,
  updateCondition,
  setOpenEquationIds,
  setSelectedChip,
  setEquationAnchor = null,
  createDefaultCondition,
  createDefaultBlock,
}) => {
  const schema = useSelector((state) => state.filter_modules?.schema);
  const fieldOptions = flattenFieldOptions(schema);

  const {
    customListVariables,
    customVariables,
    customSwitchCases,
    fieldOptionsList,
  } = useConditionContext();

  // Check conditions that don't require context first
  if (shouldSkipValueInput(conditionOrBlock)) {
    return null;
  }

  const isArrayFieldWithArrayOperator = () => {
    const fieldName = normalizeFieldValue(conditionOrBlock.field);
    const fieldVar = customVariables?.find((v) => v.name === fieldName);
    const fieldObjList = fieldOptionsList
      ? fieldOptionsList.find((f) => f.label === fieldName)
      : null;
    const baseFieldOption = fieldOptions.find((f) => f.label === fieldName);

    const isArrayField =
      fieldVar?.type === "array" ||
      fieldObjList?.type === "array" ||
      baseFieldOption?.type === "array";
    const currentOperator = conditionOrBlock.operator;

    // Operators that should show the "+ List Variable" button for array fields
    const arrayOperatorsForButton = [
      "$filter",
      "$min",
      "$max",
      "$avg",
      "$sum",
      "$size",
      "$stdDevPop",
      "$median",
      "$anyElementTrue",
      "$allElementsTrue",
    ];

    return isArrayField && arrayOperatorsForButton.includes(currentOperator);
  };

  // Check if this is an array field with an array operator that should show "+ List Variable" button
  const isArrayWithOperator = isArrayFieldWithArrayOperator(
    conditionOrBlock,
    customVariables,
    fieldOptionsList,
  );

  const isBooleanField = () => {
    const fieldName = normalizeFieldValue(conditionOrBlock.field);
    const fieldVar = customVariables?.find((v) => v.name === fieldName);
    const fieldObjList = fieldOptionsList
      ? fieldOptionsList.find((f) => f.label === fieldName)
      : null;
    const baseFieldOption = fieldOptions.find((f) => f.label === fieldName);

    return (
      fieldVar?.type === "boolean" ||
      fieldObjList?.type === "boolean" ||
      baseFieldOption?.type === "boolean"
    );
  };

  // Check conditions that require context
  if (isBooleanField(conditionOrBlock, customVariables, fieldOptionsList)) {
    return null;
  }

  // Skip value input for operators that have special inputs (handled by SpecialOperatorInputs)
  const operatorsWithSpecialInputs = ["$exists", "$isNumber", "$round", "$in"];
  if (operatorsWithSpecialInputs.includes(conditionOrBlock.operator)) {
    return null;
  }

  if (isArrayWithOperator) {
    return (
      <ArrayFieldInput conditionOrBlock={conditionOrBlock} block={block} />
    );
  }

  // Check if this is a list variable
  const fieldName = normalizeFieldValue(conditionOrBlock.field);
  const listVariable = customListVariables.find((lv) => lv.name === fieldName);
  if (listVariable) {
    return (
      <ListVariableInput
        listVariable={listVariable}
        conditionOrBlock={conditionOrBlock}
        block={block}
        updateCondition={updateCondition}
        setOpenEquationIds={setOpenEquationIds}
        setSelectedChip={setSelectedChip}
        setEquationAnchor={setEquationAnchor}
      />
    );
  }

  // Check if this is a switch operator
  if (conditionOrBlock.operator === "$switch") {
    return (
      <ConditionalValueInput
        conditionOrBlock={conditionOrBlock}
        block={block}
        updateCondition={updateCondition}
        defaultCondition={createDefaultCondition}
        defaultBlock={createDefaultBlock}
      />
    );
  }

  // Regular value input
  return (
    <RegularValueInput
      conditionOrBlock={conditionOrBlock}
      block={block}
      updateCondition={updateCondition}
      setOpenEquationIds={setOpenEquationIds}
      setSelectedChip={setSelectedChip}
      setEquationAnchor={setEquationAnchor}
    />
  );
};

ValueInput.propTypes = {
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    operator: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.shape({})),
      PropTypes.shape({}),
    ]),
    field: PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})]),
    createdAt: PropTypes.number,
  }).isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  updateCondition: PropTypes.func.isRequired,
  setOpenEquationIds: PropTypes.func.isRequired,
  setSelectedChip: PropTypes.func.isRequired,
  setEquationAnchor: PropTypes.func,
  createDefaultCondition: PropTypes.func.isRequired,
  createDefaultBlock: PropTypes.func.isRequired,
};

export default ValueInput;
