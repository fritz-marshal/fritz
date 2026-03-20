import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  IconButton,
  Paper,
  Collapse,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";
import {
  useCurrentBuilder,
  useFilterBuilder,
} from "../../../../hooks/useContexts";
import BlockComponent from "../block/BlockComponent";
import AutocompleteFields from "../condition/AutocompleteFields";
import {
  getFieldOptionsWithVariable,
  normalizeFieldValue,
} from "../../../../utils/conditionHelpers";
import { postElement } from "../../../../ducks/boom_filter_modules";

const defaultBlock = () => ({
  id: uuidv4(),
  category: "block",
  logic: "and",
  operator: "$and",
  children: [
    {
      id: uuidv4(),
      category: "condition",
      field: "",
      operator: "",
      value: "",
      createdAt: Date.now(),
    },
  ],
  createdAt: Date.now(),
});

const AddSwitchDialog = () => {
  const dispatch = useDispatch();
  const stream = useSelector((state) => state.boom_filter_v.stream?.name);
  const {
    switchDialog,
    closeSwitchDialog,
    setCustomSwitchCases,
    setFilters,
    fieldOptions: fieldOptionsList,
  } = useFilterBuilder();
  const { customVariables, customListVariables, customSwitchCases } =
    useCurrentBuilder();
  const [switchName, setSwitchName] = useState("");
  const [targetField, setTargetField] = useState("");
  const [nameError, setNameError] = useState("");
  const [switchCases, setSwitchCases] = useState([
    { id: uuidv4(), block: defaultBlock(), then: "" },
  ]);
  const [defaultValue, setDefaultValue] = useState("");
  const [collapsedCases, setCollapsedCases] = useState(new Set());

  // Get all field options including variables for the target field selector
  // Memoize to recalculate when dependencies change
  const allFieldOptions = useMemo(
    () =>
      getFieldOptionsWithVariable(
        fieldOptionsList || [],
        customVariables || [],
        customListVariables || [],
        customSwitchCases || [],
        [],
        null, // Switch dialog shows all switch cases since we're creating a new one
        stream,
      ),
    [
      fieldOptionsList,
      customVariables,
      customListVariables,
      customSwitchCases,
      stream,
    ],
  );

  useEffect(() => {
    if (switchDialog.open) {
      // Reset form when dialog opens
      setSwitchName("");
      setTargetField("");
      setNameError("");
      setSwitchCases([{ id: uuidv4(), block: defaultBlock(), then: "" }]);
      setDefaultValue("");
      setCollapsedCases(new Set());
    } else {
      // Clear error when dialog closes
      setNameError("");
    }
  }, [switchDialog.open]);

  const validateName = (name) => {
    // Normalize the value to handle both string and object formats
    const normalizedName = normalizeFieldValue(name);
    if (!normalizedName.trim()) {
      return "Name is required";
    }
    // Check if name starts with a number
    if (/^[0-9]/.test(normalizedName)) {
      return "Variable names cannot start with a number";
    }
    // Check if name contains invalid characters
    const invalidChars = /[\s\-+*^\/%= ]/;
    if (invalidChars.test(normalizedName)) {
      return "Variable names cannot contain spaces or mathematical operators (-, +, *, ^, /, %, =)";
    }
    // Check if name already exists in custom switch cases
    const exists = customSwitchCases?.some(
      (v) => v.name === normalizedName.trim(),
    );
    if (exists) {
      return "A switch case with this name already exists";
    }
    return "";
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setSwitchName(newName);
    setNameError(validateName(newName));
  };

  const handleAddCase = () => {
    setSwitchCases([
      ...switchCases,
      { id: uuidv4(), block: defaultBlock(), then: "" },
    ]);
  };

  const handleRemoveCase = (caseId) => {
    if (switchCases.length > 1) {
      setSwitchCases(switchCases.filter((c) => c.id !== caseId));
    }
  };

  const handleBlockChange = (caseId, newBlock) => {
    setSwitchCases(
      switchCases.map((c) => (c.id === caseId ? { ...c, block: newBlock } : c)),
    );
  };

  const handleThenChange = (caseId, thenValue) => {
    setSwitchCases(
      switchCases.map((c) => (c.id === caseId ? { ...c, then: thenValue } : c)),
    );
  };

  const toggleCaseCollapse = (caseId) => {
    setCollapsedCases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    const error = validateName(switchName);
    if (error) {
      setNameError(error);
      return;
    }

    // Validate that at least one case has conditions
    const hasValidCase = switchCases.some(
      (c) => c.block && c.block.children && c.block.children.length > 0,
    );
    if (!hasValidCase) {
      setNameError("Please add at least one condition to a case");
      return;
    }

    // Create the switch condition structure
    const switchCondition = {
      operator: "$switch",
      value: {
        cases: switchCases.map((c) => ({
          block: c.block,
          then: c.then,
        })),
        default: defaultValue,
      },
      targetField: targetField ? normalizeFieldValue(targetField) : null, // Store normalized target field if specified
    };

    // Save to database
    dispatch(
      postElement({
        name: switchName.trim(),
        data: { switchCondition, type: "switch_variable", streams: [stream] },
        elements: "switchCases",
      }),
    );

    // Add to custom switch cases - use functional update to ensure latest state
    setCustomSwitchCases((prev) => {
      // Filter out any existing switch case with the same name, then add the new one
      const filtered = prev.filter((sc) => sc.name !== switchName.trim());
      return [
        ...filtered,
        {
          name: switchName.trim(),
          type: "switch_variable",
          switchCondition,
          createdAt: Date.now(),
        },
      ];
    });

    // Add condition to the filter
    const newCondition = {
      id: uuidv4(),
      category: "condition",
      field: targetField ? normalizeFieldValue(targetField) : switchName.trim(), // Use normalized target field if specified, otherwise use switch name
      operator: "$switch",
      value: switchCondition.value,
      createdAt: Date.now(),
      isSwitchVariable: true,
      targetField: targetField ? normalizeFieldValue(targetField) : null,
    };

    // Helper function to add condition to block
    const addConditionToBlock = (block) => {
      if (block.id === switchDialog.blockId) {
        return {
          ...block,
          children: [...block.children, newCondition],
        };
      }
      if (block.children) {
        return {
          ...block,
          children: block.children.map(addConditionToBlock),
        };
      }
      return block;
    };

    setFilters((prevFilters) => prevFilters.map(addConditionToBlock));

    closeSwitchDialog();
  };

  return (
    <Dialog
      open={switchDialog.open}
      onClose={closeSwitchDialog}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Create Switch Condition</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3, mt: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
            >
              SWITCH NAME
            </Typography>
            <AutocompleteFields
              fieldOptions={allFieldOptions}
              value={targetField || ""}
              onChange={(newValue) => {
                // Extract string value from AutocompleteFields (handles both string and object formats)
                const normalizedValue = normalizeFieldValue(newValue);
                setTargetField(newValue);
                setSwitchName(normalizedValue);
                setNameError(validateName(normalizedValue));
              }}
              conditionOrBlock={{ id: "switch-dialog-target-field" }}
              side="right"
              customVariables={customVariables || []}
              customListVariables={customListVariables || []}
              setOpenEquationIds={() => {}}
              setSelectedChip={() => {}}
              setEquationAnchor={() => {}}
            />
            {nameError && (
              <Typography
                variant="caption"
                color="error"
                sx={{ display: "block", mt: 0.5 }}
              >
                {nameError}
              </Typography>
            )}
          </Box>
        </Box>

        {switchCases.map((caseItem, index) => (
          <Paper
            key={caseItem.id}
            sx={{
              mb: 2,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => toggleCaseCollapse(caseItem.id)}
                  sx={{
                    transform: collapsedCases.has(caseItem.id)
                      ? "rotate(0deg)"
                      : "rotate(180deg)",
                    transition: "transform 0.3s",
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
                <Typography variant="subtitle2" fontWeight="600">
                  CASE {index + 1}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => handleRemoveCase(caseItem.id)}
                disabled={switchCases.length === 1}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Box>

            <Collapse in={!collapsedCases.has(caseItem.id)}>
              <Box sx={{ pl: 4 }}>
                <BlockComponent
                  block={caseItem.block}
                  parentBlockId={null}
                  isRoot={true}
                  fieldOptionsList={fieldOptionsList}
                  disableSwitchOption={true}
                  localFilters={[caseItem.block]}
                  setLocalFilters={(updater) => {
                    const newFilters =
                      typeof updater === "function"
                        ? updater([caseItem.block])
                        : updater;
                    if (newFilters && newFilters[0]) {
                      handleBlockChange(caseItem.id, newFilters[0]);
                    }
                  }}
                />

                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
                  >
                    THEN
                  </Typography>
                  <AutocompleteFields
                    fieldOptions={allFieldOptions}
                    value={caseItem.then || ""}
                    onChange={(newValue) =>
                      handleThenChange(caseItem.id, newValue)
                    }
                    conditionOrBlock={{
                      id: `switch-dialog-case-${index}-then`,
                    }}
                    side="right"
                    customVariables={customVariables || []}
                    customListVariables={customListVariables || []}
                    setOpenEquationIds={() => {}}
                    setSelectedChip={() => {}}
                    setEquationAnchor={() => {}}
                  />
                </Box>
              </Box>
            </Collapse>
          </Paper>
        ))}

        <Button startIcon={<AddIcon />} onClick={handleAddCase} sx={{ mb: 2 }}>
          Add Case
        </Button>

        <Box sx={{ mt: 2 }}>
          <Typography
            variant="caption"
            sx={{ display: "block", mb: 0.5, fontWeight: 500 }}
          >
            DEFAULT
          </Typography>
          <AutocompleteFields
            fieldOptions={allFieldOptions}
            value={defaultValue || ""}
            onChange={(newValue) => setDefaultValue(newValue)}
            conditionOrBlock={{ id: "switch-dialog-default" }}
            side="right"
            customVariables={customVariables || []}
            customListVariables={customListVariables || []}
            setOpenEquationIds={() => {}}
            setSelectedChip={() => {}}
            setEquationAnchor={() => {}}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeSwitchDialog}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!!nameError || !switchName.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSwitchDialog;
