import React, { useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import {
  useConditionContext,
  useCurrentBuilder,
} from "../../../../hooks/useContexts";
import { Box, IconButton } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import AutocompleteFields from "./AutocompleteFields";
import OperatorSelector from "./OperatorSelector";
import ListConditionPopover from "./ListConditionPopover";
import SwitchCasePopover from "./SwitchCasePopover";
import { ConditionProvider } from "../../../../contexts/ConditionContext";
import { usePopoverRegistry } from "../../../../hooks/useDialog";
import { useHoverState } from "../../../../hooks/useFilter";
import {
  getOperatorsForField,
  getFieldOptionsWithVariable,
  createUpdateConditionFunction,
  createRemoveItemFunction,
  isFieldType,
} from "../../../../utils/conditionHelpers";
import { flattenFieldOptions } from "../../../../constants/filterConstants";
import ValueInput, {
  EquationPopover,
  ConditionalValueInput,
} from "./ValueInputs";
import SpecialOperatorInputs from "./SpecialOperatorInputs";

const FieldSelector = ({
  conditionOrBlock,
  fieldOptionsWithVariable,
  handleFieldChange,
  setOpenEquationIds,
  setSelectedChip,
  customVariables,
  customListVariables,
  setEquationAnchor,
}) => {
  const conditionComponentStyles = {
    deleteIcon: {
      color: "red",
      fontSize: "medium",
    },

    container: {
      display: "flex",
      alignItems: "center",
      width: "100%",
      minWidth: 0, // Allow shrinking in grid layout
    },
  };

  return (
    <div
      style={{
        ...conditionComponentStyles.container,
        maxWidth: "100%",
        overflow: "visible", // Changed from 'hidden' to 'visible' to allow dropdown to show
        position: "relative",
        zIndex: 1, // Reduced from 10 to avoid interfering with dropdown
      }}
    >
      <div style={{ position: "relative", width: "100%" }}>
        <AutocompleteFields
          key={`${conditionOrBlock.id}.left`}
          fieldOptions={fieldOptionsWithVariable}
          value={conditionOrBlock.field || conditionOrBlock.variableName || ""}
          onChange={handleFieldChange}
          conditionOrBlock={conditionOrBlock}
          setOpenEquationIds={setOpenEquationIds}
          customVariables={customVariables}
          setSelectedChip={setSelectedChip}
          side={"left"}
          style={{ width: "100%" }}
          customListVariables={customListVariables}
          setEquationAnchor={setEquationAnchor}
        />
      </div>
    </div>
  );
};

FieldSelector.propTypes = {
  conditionOrBlock: PropTypes.shape({
    id: PropTypes.string.isRequired,
    field: PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})]),
    variableName: PropTypes.string,
  }).isRequired,
  fieldOptionsWithVariable: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  handleFieldChange: PropTypes.func.isRequired,
  setOpenEquationIds: PropTypes.func.isRequired,
  setSelectedChip: PropTypes.func.isRequired,
  customVariables: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  customListVariables: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  setEquationAnchor: PropTypes.func.isRequired,
};

const ConditionComponentInner = ({
  conditionOrBlock,
  block,
  setFilters,
  filters,
  createDefaultCondition,
  createDefaultBlock,
  customVariables,
  fieldOptionsList,
  customListVariables,
  customSwitchCases,
  isListDialogOpen = false,
}) => {
  const [openEquationIds, setOpenEquationIds] = useState([]);
  const [selectedChip, setSelectedChip] = useState("");
  const [listPopoverAnchor, setListPopoverAnchor] = useState(null);
  const [switchPopoverAnchor, setSwitchPopoverAnchor] = useState(null);
  const [equationAnchor, setEquationAnchor] = useState(null);
  const schema = useSelector((state) => state.filter_modules?.schema);
  const currentStream = useSelector(
    (state) => state.boom_filter_v.stream?.name,
  );
  const final_schema = schema?.versions?.find(
    (v) => v.vid === schema.active_id,
  )?.schema;
  const fieldOptions = flattenFieldOptions(final_schema);

  // Custom hooks
  usePopoverRegistry(
    conditionOrBlock.id,
    customListVariables,
    setListPopoverAnchor,
    customSwitchCases,
    setSwitchPopoverAnchor,
  );
  const { isYoungestHovered, handleMouseEnter, handleMouseLeave } =
    useHoverState(conditionOrBlock.id, filters);

  // Helper to normalize values that might contain metadata objects
  const normalizeFieldOrValue = (val) => {
    if (!val) return val;
    if (typeof val === "string") return val;
    if (typeof val === "object" && val.name) {
      return val.name;
    }
    return val;
  };

  // Helper functions
  const baseUpdateCondition = createUpdateConditionFunction(
    filters,
    setFilters,
  );

  // Wrapper that normalizes field and value before updating
  const updateCondition = (blockId, conditionId, key, value) => {
    const normalizedValue =
      key === "field" || key === "value" ? normalizeFieldOrValue(value) : value;
    baseUpdateCondition(blockId, conditionId, key, normalizedValue);
  };

  const removeItem = createRemoveItemFunction(
    filters,
    setFilters,
    createDefaultCondition,
  );

  // For empty conditions (no field selected), show all switch cases to allow using newly created ones
  // For conditions with fields, use createdAt to prevent circular references
  const contextTime = conditionOrBlock.field
    ? conditionOrBlock.createdAt
    : null;

  const fieldOptionsWithVariable = getFieldOptionsWithVariable(
    fieldOptionsList,
    customVariables,
    customListVariables,
    customSwitchCases || [],
    fieldOptions,
    contextTime,
    currentStream,
  );

  const operatorOptions = conditionOrBlock.field
    ? getOperatorsForField(
        conditionOrBlock.field,
        customVariables,
        schema,
        fieldOptions,
        fieldOptionsList,
        customListVariables,
        customSwitchCases,
      )
    : [];

  const handleFieldChange = (newField) => {
    // Extract string value from newField if it's an object with metadata
    const normalizeField = (field) => {
      if (!field) return "";
      if (typeof field === "string") return field;
      if (typeof field === "object" && field.name) {
        return field.name;
      }
      console.warn(
        "[BlockComponent handleFieldChange] Unexpected field format:",
        field,
      );
      return String(field);
    };

    const fieldValue = normalizeField(newField);

    // If field is being explicitly cleared (empty/null/undefined), just update the field without changing operator/value
    if (fieldValue === "" || fieldValue === null || fieldValue === undefined) {
      setFilters((prevFilters) => {
        const updateBlockTree = (currentBlock) => {
          if (currentBlock.id !== block.id) {
            return {
              ...currentBlock,
              children: currentBlock.children.map((child) =>
                child.category === "block" ? updateBlockTree(child) : child,
              ),
            };
          }
          return {
            ...currentBlock,
            children: currentBlock.children.map((child) =>
              child.id === conditionOrBlock.id
                ? {
                    ...child,
                    field: "",
                    variableName: undefined,
                    // Keep operator and value intact
                  }
                : child,
            ),
          };
        };
        return prevFilters.map(updateBlockTree);
      });
      return;
    }

    const ops = getOperatorsForField(
      fieldValue,
      customVariables,
      schema,
      fieldOptions,
      fieldOptionsList,
      customListVariables,
      customSwitchCases,
    );
    const isBooleanField = isFieldType(
      fieldValue,
      "boolean",
      customVariables,
      schema,
      fieldOptions,
      fieldOptionsList,
      customListVariables,
      customSwitchCases,
    );

    // Check if this is a list variable and get its operator
    const listVariable = customListVariables?.find(
      (lv) => lv.name === fieldValue,
    );
    const defaultOperator = listVariable
      ? listVariable.listCondition?.operator
      : ops.length > 0
        ? ops[0]
        : null;

    setFilters((prevFilters) => {
      const updateBlockTree = (currentBlock) => {
        if (currentBlock.id !== block.id) {
          return {
            ...currentBlock,
            children: currentBlock.children.map((child) =>
              child.category === "block" ? updateBlockTree(child) : child,
            ),
          };
        }
        return {
          ...currentBlock,
          children: currentBlock.children.map((child) =>
            child.id === conditionOrBlock.id
              ? {
                  ...child,
                  field: fieldValue,
                  variableName: undefined,
                  operator:
                    child.operator && ops.includes(child.operator)
                      ? child.operator
                      : defaultOperator,
                  value: (() => {
                    const currentIsBool = typeof child.value === "boolean";
                    const newIsBool = isBooleanField;

                    if (newIsBool) {
                      // Switching to boolean field - use boolean value or default to true
                      return currentIsBool ? child.value : true;
                    } else {
                      if (currentIsBool) {
                        // Clear boolean value when switching to non-boolean field
                        return undefined;
                      } else {
                        return child.operator && ops.includes(child.operator)
                          ? child.value
                          : undefined;
                      }
                    }
                  })(),
                }
              : child,
          ),
        };
      };
      return prevFilters.map(updateBlockTree);
    });
  };

  const renderEquationPopover = () => (
    <EquationPopover
      openEquationIds={openEquationIds}
      conditionId={conditionOrBlock.id}
      selectedChip={selectedChip}
      fieldOptionsWithVariable={fieldOptionsWithVariable}
      conditionOrBlock={conditionOrBlock}
      customVariables={customVariables}
      anchorEl={equationAnchor}
      onClose={() => {
        setOpenEquationIds((prev) =>
          prev.filter((id) => id !== conditionOrBlock.id),
        );
        setEquationAnchor(null);
      }}
    />
  );

  // Special rendering for Switch operator - replaces entire condition row
  if (conditionOrBlock.operator === "$switch") {
    return (
      <Box
        key={conditionOrBlock.id}
        sx={{
          ml: 2,
          pr: "140px",
          position: "relative",
          transition: "all 0.2s ease",
          display: "flex",
          gap: 1,
          alignItems: "flex-start",
          flex: 1,
          p: 1,
          borderRadius: 1,
          border: 1,
          borderColor: isYoungestHovered ? "primary.light" : "transparent",
          background: isYoungestHovered
            ? "linear-gradient(to right, #e3f2fd, #f3e5f5)"
            : "transparent",
          boxShadow: isYoungestHovered ? 2 : 0,
          zIndex: 1,
        }}
        onMouseEnter={() => handleMouseEnter(conditionOrBlock.id)}
        onMouseLeave={() => handleMouseLeave(conditionOrBlock.id)}
      >
        {/* Remove button on the left */}
        <IconButton
          size="small"
          color="error"
          onClick={() => removeItem(block.id, conditionOrBlock.id)}
          sx={{ p: 0.5, mt: 1 }}
        >
          <ClearIcon fontSize="small" />
        </IconButton>

        {/* Main switch content */}
        <Box sx={{ flex: 1 }}>
          {/* Switch Logic Builder */}
          <ConditionalValueInput
            conditionOrBlock={conditionOrBlock}
            block={block}
            updateCondition={updateCondition}
            defaultCondition={createDefaultCondition}
            defaultBlock={createDefaultBlock}
            fieldOptionsList={fieldOptionsList}
          />
        </Box>
      </Box>
    );
  }

  // Regular condition rendering
  return (
    <Box
      key={conditionOrBlock.id}
      sx={{
        ml: 2,
        pr: "140px",
        display: "grid",
        gridTemplateColumns:
          "auto minmax(250px, 2fr) minmax(200px, 1fr) minmax(250px, 2fr)",
        gap: 1,
        alignItems: "center",
        position: "relative",
        transition: "all 0.2s ease",
        p: 1,
        borderRadius: 1,
        border: 1,
        borderColor: isYoungestHovered ? "primary.light" : "transparent",
        background: isYoungestHovered
          ? "linear-gradient(to right, #e3f2fd, #f3e5f5)"
          : "transparent",
        boxShadow: isYoungestHovered ? 2 : 0,
        zIndex: 1,
      }}
      onMouseEnter={() => handleMouseEnter(conditionOrBlock.id)}
      onMouseLeave={() => handleMouseLeave(conditionOrBlock.id)}
    >
      {/* Remove button */}
      <IconButton
        size="small"
        color="error"
        onClick={() => removeItem(block.id, conditionOrBlock.id)}
        sx={{ p: 0.5 }}
      >
        <ClearIcon fontSize="small" />
      </IconButton>

      {/* Field Autocomplete */}
      <FieldSelector
        conditionOrBlock={conditionOrBlock}
        fieldOptionsWithVariable={fieldOptionsWithVariable}
        handleFieldChange={handleFieldChange}
        setOpenEquationIds={setOpenEquationIds}
        setSelectedChip={setSelectedChip}
        customVariables={customVariables}
        customListVariables={customListVariables}
        isListDialogOpen={isListDialogOpen}
        setEquationAnchor={setEquationAnchor}
      />

      {/* Operator Selector */}
      <OperatorSelector
        conditionOrBlock={conditionOrBlock}
        block={block}
        operatorOptions={operatorOptions}
        updateCondition={updateCondition}
      />

      {/* Value Input */}
      <ValueInput
        conditionOrBlock={conditionOrBlock}
        block={block}
        updateCondition={updateCondition}
        setOpenEquationIds={setOpenEquationIds}
        setSelectedChip={setSelectedChip}
        setEquationAnchor={setEquationAnchor}
        createDefaultCondition={createDefaultCondition}
        createDefaultBlock={createDefaultBlock}
      />

      {/* Special Operator Inputs */}
      <SpecialOperatorInputs
        conditionOrBlock={conditionOrBlock}
        block={block}
        updateCondition={updateCondition}
      />

      {/* Equation Popover */}
      {renderEquationPopover()}

      {/* List Condition Popover */}
      <ListConditionPopover
        listPopoverAnchor={listPopoverAnchor}
        setListPopoverAnchor={setListPopoverAnchor}
        conditionOrBlock={conditionOrBlock}
        customListVariables={customListVariables}
        createDefaultCondition={createDefaultCondition} // Fixed: use createDefaultCondition
        customVariables={customVariables}
        block={block}
        updateCondition={updateCondition}
        fieldOptions={fieldOptions}
        fieldOptionsList={fieldOptionsList}
      />

      {/* Switch Case Popover */}
      <SwitchCasePopover
        switchPopoverAnchor={switchPopoverAnchor}
        setSwitchPopoverAnchor={setSwitchPopoverAnchor}
        customSwitchCases={customSwitchCases}
        customVariables={customVariables}
        customListVariables={customListVariables}
        fieldOptionsList={fieldOptionsList}
      />
    </Box>
  );
};

ConditionComponentInner.propTypes = {
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
  setFilters: PropTypes.func.isRequired,
  filters: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  createDefaultCondition: PropTypes.func.isRequired,
  createDefaultBlock: PropTypes.func.isRequired,
  customVariables: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  fieldOptionsList: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  customListVariables: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  customSwitchCases: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  isListDialogOpen: PropTypes.bool,
};

const ConditionComponent = ({
  conditionOrBlock,
  block,
  fieldOptionsList,
  isListDialogOpen = false,
  setListConditionDialog,
  localFilters = null,
  setLocalFilters = null,
}) => {
  const {
    filters: contextFilters,
    setFilters: contextSetFilters,
    customVariables,
    customListVariables,
    customSwitchCases,
    createDefaultCondition, // Fixed: use createDefaultCondition instead of defaultCondition
    createDefaultBlock,
  } = useCurrentBuilder();

  // Use local filters if provided, otherwise use context filters
  const filters = localFilters || contextFilters;
  const setFilters = setLocalFilters || contextSetFilters;
  return (
    <ConditionProvider
      customVariables={customVariables || []}
      customListVariables={customListVariables || []}
      customSwitchCases={customSwitchCases || []}
      fieldOptionsList={fieldOptionsList}
      isListDialogOpen={isListDialogOpen}
      setListConditionDialog={setListConditionDialog}
    >
      <ConditionComponentInner
        conditionOrBlock={conditionOrBlock}
        block={block}
        setFilters={setFilters}
        filters={filters}
        createDefaultCondition={createDefaultCondition} // Fixed: pass createDefaultCondition
        createDefaultBlock={createDefaultBlock}
        customVariables={customVariables || []}
        fieldOptionsList={fieldOptionsList}
        customListVariables={customListVariables || []}
        customSwitchCases={customSwitchCases || []}
        isListDialogOpen={isListDialogOpen}
      />
    </ConditionProvider>
  );
};

ConditionComponent.propTypes = {
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
  fieldOptionsList: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  isListDialogOpen: PropTypes.bool,
  setListConditionDialog: PropTypes.func.isRequired,
  localFilters: PropTypes.arrayOf(PropTypes.shape({})),
  setLocalFilters: PropTypes.func,
};

export default ConditionComponent;
