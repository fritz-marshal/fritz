import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { styled, lighten, darken } from "@mui/system";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  mongoOperatorTypes,
  mongoOperatorLabels,
} from "../../../../constants/filterConstants";

const GroupHeader = styled("div")(({ theme }) => {
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
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    userSelect: "none",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: isDark
        ? darken(primaryMain, 0.7)
        : lighten(primaryLight, 0.75),
    },
  };
});

const GroupItems = styled("ul")({
  padding: 0,
});

const ChipSpan = styled("span")({
  // Hide scrollbars across all browsers
  scrollbarWidth: "none", // Firefox
  msOverflowStyle: "none", // IE/Edge
  "&::-webkit-scrollbar": {
    display: "none", // Chrome, Safari, Opera
  },
});

const AutocompleteFields = ({
  fieldOptions,
  value,
  onChange,
  conditionOrBlock,
  setOpenEquationIds,
  setSelectedChip,
  side,
  setEquationAnchor = null,
}) => {
  // Show full path by default; clicking the chip toggles showing the group name vs short name
  const [showGroupName, setShowGroupName] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  // Initialize collapsed groups as empty Set, will be populated when groups are computed
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Helper function to normalize value to a searchable format
  // Supports both string values (legacy) and object values with metadata
  const normalizeValue = (val) => {
    if (!val) return { name: "", meta: {} };
    if (typeof val === "string") return { name: val, meta: {} };
    if (typeof val === "object" && val.type === "array") {
      // List condition objects are handled separately
      // Ensure name is a string
      const nameValue = val.name || val.field || "";
      return {
        name: typeof nameValue === "string" ? nameValue : String(nameValue),
        meta: { isListCondition: true },
      };
    }
    // New format: object with name and _meta
    if (typeof val === "object" && val.name) {
      // Recursively handle nested name objects
      const extractName = (nameVal) => {
        if (!nameVal) return "";
        if (typeof nameVal === "string") return nameVal;
        if (typeof nameVal === "object" && nameVal.name) {
          return extractName(nameVal.name);
        }
        return String(nameVal);
      };
      const extracted = extractName(val.name);
      return { name: extracted, meta: val._meta || {} };
    }
    return { name: "", meta: {} };
  };

  // Helper function to find exact matching option using metadata
  const findExactOption = (options, normalizedValue) => {
    const { name, meta } = normalizedValue;
    if (!name) return null;

    // If no metadata, find first match (backward compatibility)
    if (!meta || Object.keys(meta).length === 0) {
      const result = options.find((opt) => opt.label === name);
      return result;
    }

    // Find exact match using metadata
    const candidates = options.filter((opt) => opt.label === name);
    if (candidates.length === 0) {
      return null;
    }
    if (candidates.length === 1) {
      return candidates[0];
    }

    // Multiple candidates with same name - use metadata to disambiguate
    const exactMatch = candidates.find((opt) => {
      // Match based on type flags - treat undefined as false for comparison
      const normalizeFlag = (flag) => !!flag;
      if (
        meta.isVariable !== undefined &&
        normalizeFlag(opt.isVariable) !== normalizeFlag(meta.isVariable)
      )
        return false;
      if (
        meta.isListVariable !== undefined &&
        normalizeFlag(opt.isListVariable) !== normalizeFlag(meta.isListVariable)
      )
        return false;
      if (
        meta.isSwitchCase !== undefined &&
        normalizeFlag(opt.isSwitchCase) !== normalizeFlag(meta.isSwitchCase)
      )
        return false;
      if (
        meta.isSchemaField !== undefined &&
        normalizeFlag(opt.isSchemaField) !== normalizeFlag(meta.isSchemaField)
      )
        return false;
      // Match based on type if specified
      if (meta.type !== undefined && opt.type !== meta.type) return false;
      return true;
    });

    // Fall back to first match if no exact match found
    return exactMatch || candidates[0];
  };

  // Helper function to create metadata object from an option
  const createMetadata = (option) => {
    if (!option) return {};
    return {
      isVariable: option.isVariable || false,
      isListVariable: option.isListVariable || false,
      isSwitchCase: option.isSwitchCase || false,
      isSchemaField: option.isSchemaField || false,
      type: option.type,
    };
  };

  // Helper function to get operator display label
  const getOperatorDisplayLabel = (operator) => {
    return mongoOperatorLabels[operator] || operator;
  };

  // Group by category and collect unique group names
  const { options, allGroups } = useMemo(() => {
    const baseOptions = fieldOptions || [];
    let processedOptions = baseOptions.map((option) => {
      return {
        ...option,
        group: option.isVariable
          ? "Arithmetic Variables"
          : option.isListVariable
            ? "Database List Variables"
            : option.isSwitchCase
              ? "Switch Cases"
              : option.group ||
                (option.label?.split(".").length > 1
                  ? option.label?.split(".")[0]
                  : "Other Fields"),
      };
    });

    // Sort options by group alphabetically to avoid duplicated headers warning
    processedOptions = processedOptions.sort((a, b) => {
      if (a.group < b.group) return -1;
      if (a.group > b.group) return 1;
      return 0;
    });

    // Collect all unique group names and sort them alphabetically
    const uniqueGroups = [
      ...new Set(processedOptions.map((option) => option.group)),
    ].sort();

    const schemaFieldCount = processedOptions.filter(
      (opt) => opt.isSchemaField,
    ).length;

    uniqueGroups.forEach((group) => {
      const groupOptions = processedOptions.filter(
        (opt) => opt.group === group,
      );
    });

    return { options: processedOptions, allGroups: uniqueGroups };
  }, [fieldOptions]);

  // Set all field options groups as collapsed when they change (only on initial load)
  useEffect(() => {
    if (allGroups.length > 0 && allGroups.length > collapsedGroups.size) {
      setCollapsedGroups(new Set(allGroups));
    }
  }, [allGroups]);

  // Auto-expand groups that contain search matches
  useEffect(() => {
    if (searchInput && searchInput.trim().length > 0) {
      const searchTerm = searchInput.toLowerCase();
      const groupsWithMatches = new Set();

      // Find groups that contain options matching the search term
      options.forEach((option) => {
        if (option.label && option.label.toLowerCase().includes(searchTerm)) {
          groupsWithMatches.add(option.group);
        }
      });

      // Expand groups that have matching options
      if (groupsWithMatches.size > 0) {
        setCollapsedGroups((prev) => {
          const newCollapsed = new Set(prev);
          groupsWithMatches.forEach((groupName) => {
            newCollapsed.delete(groupName);
          });
          return newCollapsed;
        });
      }
    }
  }, [searchInput, options]);

  // Toggle group collapse state
  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups((prev) => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(groupName)) {
        newCollapsed.delete(groupName);
      } else {
        newCollapsed.add(groupName);
      }
      return newCollapsed;
    });
  };

  // Helper function to get display name for nested fields
  const getDisplayName = (fieldName) => {
    if (!fieldName) return "";
    const parts = fieldName.split(".");
    return parts.length > 1 ? parts[parts.length - 1] : fieldName;
  };

  // Helper function to check if field is nested
  const isNestedField = (fieldName) => {
    return fieldName && fieldName.includes(".");
  };

  // Helper function to calculate chip width and styling based on text length
  const getChipStyles = (text, baseStyles) => {
    return {
      ...baseStyles,
      maxWidth: "calc(100% - 16px)",
      fontSize: 15,
      padding: "2px 12px",
      transition: "all 0.2s ease",
      overflowX: "auto",
      overflowY: "hidden",
      whiteSpace: baseStyles.whiteSpace || "nowrap",
      textOverflow: "ellipsis",
      WebkitOverflowScrolling: "touch",
      // Note: Pseudo-elements like ::-webkit-scrollbar cannot be used in inline styles
      // Hide scrollbars using standard properties
      scrollbarWidth: "none", // Firefox
      msOverflowStyle: "none", // IE/Edge
      // Chrome/Safari scrollbar hiding requires a CSS class or styled component
    };
  };

  // Helper function to get comprehensive tooltip text
  const getTooltipText = (fieldOption, displayText) => {
    const parts = [];

    if (fieldOption.label !== displayText) {
      parts.push(`Full path: ${fieldOption.label}`);
    }

    if (fieldOption.group && fieldOption.group !== "Other Fields") {
      parts.push(`Category: ${fieldOption.group}`);
    }

    if (fieldOption.type) {
      parts.push(`Type: ${fieldOption.type}`);
    }

    parts.push("Click to toggle path display");

    return parts.join(" | ");
  };

  // // Helper function to check if field is nested in condition
  // const isNestedFieldCondition = (field) => {
  //   if (!field.label) return false;
  //   else if (!field.group) return field.label.includes('.');
  //   else {
  //     return !!field.label;
  //   }
  // };

  const togglePathDisplay = () => {
    setShowGroupName((s) => !s);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 200,
        width: "100%",
        maxWidth: "100%",
        position: "relative",
      }}
    >
      <div style={{ position: "relative", width: "100%" }}>
        <Autocomplete
          key={conditionOrBlock.id}
          freeSolo
          size="small"
          options={options}
          groupBy={(option) => option.group}
          getOptionLabel={(option) => {
            // Handle string labels
            if (typeof option === "string") return option;
            // Handle option objects
            if (option && option.label) {
              const result =
                typeof option.label === "string"
                  ? option.label
                  : String(option.label);
              return result;
            }
            // Handle unexpected objects
            return "";
          }}
          sx={{
            width: "100%",
            minWidth: 200,
            maxWidth: "100%",
            "& .MuiAutocomplete-inputRoot": {
              minWidth: 200,
              width: "100%",
              maxWidth: "100%",
            },
          }}
          slotProps={{
            popper: {
              sx: {
                zIndex: 10000,
              },
              placement: "bottom-start",
              modifiers: [
                {
                  name: "offset",
                  options: {
                    offset: [0, 4],
                  },
                },
              ],
            },
            paper: {
              sx: {
                marginTop: "4px",
              },
            },
          }}
          disablePortal={false} // Ensure dropdown is rendered in a portal to escape clipping
          value={(() => {
            // Handle list condition objects
            if (value && typeof value === "object" && value.type === "array") {
              return null; // Don't show in autocomplete dropdown, let chip handle display
            }
            // Handle regular options using exact matching
            const normalized = normalizeValue(value);
            const exactOption = findExactOption(options, normalized);
            return (
              exactOption ||
              (normalized.name ? { label: normalized.name } : null)
            );
          })()}
          onChange={(_, newValue) => {
            if (!onChange) return;

            if (!newValue) {
              onChange("");
              return;
            }

            // If it's a string, pass it as-is (shouldn't happen with Autocomplete)
            if (typeof newValue === "string") {
              onChange(newValue);
              return;
            }

            // If it's an option object, pass back object with name and metadata
            const metadata = createMetadata(newValue);
            const resultObject = {
              name: newValue.label,
              _meta: metadata,
            };
            onChange(resultObject);
          }}
          onInputChange={(_, newInputValue, reason) => {
            if (reason === "input" || reason === "clear") {
              setSearchInput(newInputValue || "");
              onChange && onChange(newInputValue);
            }
          }}
          renderInput={(params) => {
            const normalized = normalizeValue(value);
            const exactOption = findExactOption(options, normalized);

            const variableOption = exactOption?.isVariable ? exactOption : null;
            const fieldOption =
              exactOption &&
              !exactOption.isVariable &&
              !exactOption.isListVariable &&
              !exactOption.isSwitchCase
                ? exactOption
                : null;
            const listOption =
              exactOption?.type === "array" && !exactOption.isListVariable
                ? exactOption
                : null;
            const listVariableOption = exactOption?.isListVariable
              ? exactOption
              : null;
            const switchCaseOption = exactOption?.isSwitchCase
              ? exactOption
              : null;
            const isListCondition = normalized.meta.isListCondition;
            const hasChip =
              variableOption ||
              fieldOption ||
              listOption ||
              listVariableOption ||
              switchCaseOption ||
              isListCondition;

            return (
              <TextField
                {...params}
                label="Fields"
                sx={{
                  "& .MuiInputBase-input": {
                    color: hasChip ? "transparent" : "inherit",
                  },
                }}
              />
            );
          }}
          renderOption={(props, option) => {
            // Note: React's 'key' prop is handled automatically and shouldn't be destructured
            // For list variables, include the operator in the display
            let displayText = option.label;
            if (option.isListVariable && option.listCondition?.operator) {
              const operatorDisplay = getOperatorDisplayLabel(
                option.listCondition.operator,
              );
              displayText = `${option.label}`;
            } else if (
              option.group !== "Arithmetic Variables" &&
              option.group !== "Other Fields"
            ) {
              // For other grouped options, show only the last part after the dot
              displayText = option.label.includes(option.group)
                ? option.label.split(".").slice(-1)[0] // Show only the last part after the dot
                : option.label;
            }

            return <li {...props}>{displayText}</li>;
          }}
          renderGroup={(params) => {
            const isCollapsed = collapsedGroups.has(params.group);
            return (
              <li key={params.key}>
                <GroupHeader
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleGroupCollapse(params.group);
                  }}
                  title={`Click to ${isCollapsed ? "expand" : "collapse"} ${
                    params.group
                  } section`}
                >
                  {isCollapsed ? (
                    <ChevronRightIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                  {params.group}
                </GroupHeader>
                <GroupItems style={{ display: isCollapsed ? "none" : "block" }}>
                  {params.children}
                </GroupItems>
              </li>
            );
          }}
        />
        {/* Chip for variable field, clickable to show equation */}
        {(() => {
          // Don't render chips for empty values
          const normalized = normalizeValue(value);
          if (!normalized.name) {
            return null;
          }

          const exactOption = findExactOption(options, normalized);
          const variableOption = exactOption?.isVariable ? exactOption : null;
          const fieldOption =
            exactOption &&
            !exactOption.isVariable &&
            !exactOption.isListVariable &&
            !exactOption.isSwitchCase
              ? exactOption
              : null;
          const listVariableOption = exactOption?.isListVariable
            ? exactOption
            : null;
          const switchCaseOption = exactOption?.isSwitchCase
            ? exactOption
            : null;

          // Check for switch case variable
          if (switchCaseOption) {
            return (
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 8,
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  background:
                    "linear-gradient(90deg, #e5e7eb 60%, #d1d5db 100%)",
                  color: "#374151",
                  borderRadius: 16,
                  padding: "2px 12px",
                  fontWeight: 700,
                  fontSize: 15,
                  border: "1.5px solid #6b7280",
                  cursor: "pointer",
                  minWidth: 0,
                  maxWidth: "calc(100% - 16px)",
                  whiteSpace: "nowrap",
                  overflowX: "auto",
                  overflowY: "hidden",
                  textOverflow: "ellipsis",
                  pointerEvents: "auto",
                  zIndex: 2,
                  boxShadow: "0 2px 8px 0 rgba(168,85,247,0.12)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Use the global switch case popover callback
                  if (window.openSwitchCasePopover) {
                    window.openSwitchCasePopover(
                      switchCaseOption.label,
                      e.currentTarget,
                    );
                  }
                }}
                title={`Click to view switch case: ${switchCaseOption.label}`}
              >
                {switchCaseOption.label}
              </span>
            );
          }

          // Check for aggregation list condition (when conditionOrBlock has aggregation value)
          if (
            conditionOrBlock &&
            conditionOrBlock.value &&
            typeof conditionOrBlock.value === "object" &&
            conditionOrBlock.value.type === "array" &&
            conditionOrBlock.value.subField &&
            mongoOperatorTypes[conditionOrBlock.operator] === "aggregation"
          ) {
            return (
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 8,
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  background:
                    "linear-gradient(90deg, #bbf7d0 60%, #a7f3d0 100%)",
                  color: "#166534",
                  borderRadius: 16,
                  padding: "2px 12px",
                  fontWeight: 700,
                  fontSize: 15,
                  border: "1.5px solid #4ade80",
                  cursor: "pointer",
                  minWidth: 0,
                  maxWidth: "calc(100% - 16px)",
                  whiteSpace: "nowrap",
                  overflowX: "auto",
                  overflowY: "hidden",
                  textOverflow: "ellipsis",
                  pointerEvents: "auto",
                  zIndex: 2,
                  boxShadow: "0 2px 8px 0 rgba(16,185,129,0.08)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Trigger the list popover to open
                  if (
                    conditionOrBlock &&
                    conditionOrBlock.id &&
                    window.openListPopover
                  ) {
                    window.openListPopover(
                      conditionOrBlock.id,
                      e.currentTarget,
                    );
                  }
                }}
                title={`Click to view aggregation details: ${conditionOrBlock.value.name}`}
              >
                {conditionOrBlock.value.name}
              </span>
            );
          }

          // Check for list variable (used with $filter operator or database variables)
          if (listVariableOption) {
            // Get the operator for display
            const operatorDisplay = listVariableOption.listCondition?.operator
              ? getOperatorDisplayLabel(
                  listVariableOption.listCondition.operator,
                )
              : "";

            // Create display text with operator if available
            const displayText = listVariableOption.label;

            return (
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 8,
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  background: listVariableOption.isDbVariable
                    ? "linear-gradient(90deg, #ddd6fe 60%, #c4b5fd 100%)"
                    : "linear-gradient(90deg, #bbf7d0 60%, #a7f3d0 100%)",
                  color: listVariableOption.isDbVariable
                    ? "#5b21b6"
                    : "#166534",
                  borderRadius: 16,
                  padding: "2px 12px",
                  fontWeight: 700,
                  fontSize: 15,
                  border: listVariableOption.isDbVariable
                    ? "1.5px solid #8b5cf6"
                    : "1.5px solid #4ade80",
                  cursor: "pointer",
                  minWidth: 0,
                  maxWidth: "calc(100% - 16px)",
                  whiteSpace: "nowrap",
                  overflowX: "auto",
                  overflowY: "hidden",
                  textOverflow: "ellipsis",
                  pointerEvents: "auto",
                  zIndex: 2,
                  boxShadow: listVariableOption.isDbVariable
                    ? "0 2px 8px 0 rgba(139,92,246,0.08)"
                    : "0 2px 8px 0 rgba(16,185,129,0.08)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Use the global list variable popover callback
                  if (window.openListVariablePopover) {
                    window.openListVariablePopover(
                      listVariableOption.label,
                      e.currentTarget,
                    );
                  }
                }}
                title={`Click to view ${
                  listVariableOption.isDbVariable ? "database " : ""
                }list variable: ${listVariableOption.label}${
                  operatorDisplay ? ` (${operatorDisplay})` : ""
                }`}
              >
                {displayText}
              </span>
            );
          }

          // Check for array field (used in list conditions)
          const arrayFieldOption =
            exactOption?.type === "array" && !exactOption.isListVariable
              ? exactOption
              : null;
          if (arrayFieldOption) {
            const hasCategory =
              arrayFieldOption.group &&
              arrayFieldOption.group !== "Other Fields";
            const displayText = () => {
              return arrayFieldOption.label;
            };

            const currentDisplayText = displayText();
            const baseStyles = {
              position: "absolute",
              top: "50%",
              left: 8,
              transform: "translateY(-50%)",
              display: "inline-flex",
              alignItems: "center",
              background: "linear-gradient(90deg, #bbf7d0 60%, #a7f3d0 100%)",
              color: "#166534",
              borderRadius: 16,
              fontWeight: 700,
              border: "1.5px solid #4ade80",
              cursor: "pointer",
              minWidth: 0,
              whiteSpace: "nowrap",
              overflowX: "auto",
              overflowY: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "auto",
              zIndex: 2,
              boxShadow: "0 2px 8px 0 rgba(16,185,129,0.08)",
            };

            return (
              <ChipSpan
                style={getChipStyles(currentDisplayText, baseStyles)}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePathDisplay();
                }}
                title={getTooltipText(arrayFieldOption, currentDisplayText)}
              >
                {currentDisplayText}
              </ChipSpan>
            );
          }

          // Check for configured list condition
          if (
            value &&
            typeof value === "object" &&
            value.type === "array" &&
            value.field
          ) {
            return (
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 8,
                  transform: "translateY(-50%)",
                  display: "inline-flex",
                  alignItems: "center",
                  background:
                    "linear-gradient(90deg, #bbf7d0 60%, #a7f3d0 100%)",
                  color: "#166534",
                  borderRadius: 16,
                  padding: "2px 12px",
                  fontWeight: 700,
                  fontSize: 15,
                  border: "1.5px solid #4ade80",
                  cursor: "pointer",
                  minWidth: 0,
                  maxWidth: "calc(100% - 16px)",
                  whiteSpace: "nowrap",
                  overflowX: "auto",
                  overflowY: "hidden",
                  textOverflow: "ellipsis",
                  pointerEvents: "auto",
                  zIndex: 2,
                  boxShadow: "0 2px 8px 0 rgba(16,185,129,0.08)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    conditionOrBlock &&
                    conditionOrBlock.id &&
                    window.openListPopover
                  ) {
                    window.openListPopover(
                      conditionOrBlock.id,
                      e.currentTarget,
                    );
                  }
                }}
                title={`Click to view list condition: ${
                  value.name || value.field
                }`}
              >
                {value.name}
              </span>
            );
          }

          // Show chip if value matches a variable, a field option, or a list option (array type)
          if (variableOption) {
            const displayText = () => {
              return variableOption.label;
            };

            const currentDisplayText = displayText();
            const baseStyles = {
              position: "absolute",
              top: "50%",
              left: 8,
              transform: "translateY(-50%)",
              display: "inline-flex",
              alignItems: "center",
              background: "#fde68a",
              color: "#b45309",
              borderRadius: 16,
              fontWeight: 700,
              border: "1.5px solid #fbbf24",
              cursor: "pointer",
              minWidth: 0,
              whiteSpace: "nowrap",
              overflowX: "auto",
              overflowY: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "auto",
              zIndex: 2,
            };

            return (
              <ChipSpan
                style={getChipStyles(currentDisplayText, baseStyles)}
                onClick={(e) => {
                  if (
                    isNestedField(variableOption.label) ||
                    (variableOption.group &&
                      variableOption.group !== "Arithmetic Variables")
                  ) {
                    e.stopPropagation();
                    togglePathDisplay();
                  } else {
                    e.stopPropagation();
                    setSelectedChip(side);
                    if (setEquationAnchor) {
                      setEquationAnchor(e.currentTarget);
                    }
                    setOpenEquationIds((prev) =>
                      prev.includes(conditionOrBlock.id)
                        ? prev.filter((id) => id !== conditionOrBlock.id)
                        : [...prev, conditionOrBlock.id],
                    );
                  }
                }}
                title={
                  isNestedField(variableOption.label) ||
                  (variableOption.group &&
                    variableOption.group !== "Arithmetic Variables")
                    ? getTooltipText(variableOption, currentDisplayText)
                    : "Click to view equation"
                }
              >
                {currentDisplayText}
              </ChipSpan>
            );
          }
          if (fieldOption) {
            const hasCategory =
              fieldOption.group &&
              !["candidate", "Other Fields"].includes(fieldOption.group);
            const displayText = () => {
              return fieldOption.label;
            };

            const currentDisplayText = displayText();
            const baseStyles = {
              position: "absolute",
              top: "50%",
              left: 8,
              transform: "translateY(-50%)",
              display: "inline-flex",
              alignItems: "center",
              background: "#e0e7ff",
              color: "#3730a3",
              borderRadius: 16,
              fontWeight: 600,
              boxShadow: "0 1px 4px 0 rgba(80,120,255,0.08)",
              border: "1.5px solid #a5b4fc",
              cursor: "pointer",
              minWidth: 0,
              whiteSpace: "nowrap",
              overflowX: "auto",
              overflowY: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "auto",
              zIndex: 2,
            };

            return (
              <ChipSpan
                style={getChipStyles(currentDisplayText, baseStyles)}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePathDisplay();
                }}
                title={getTooltipText(fieldOption, currentDisplayText)}
              >
                {currentDisplayText}
              </ChipSpan>
            );
          }
          // Show chip for list/array type options
          const listOption =
            exactOption?.type === "array" && !exactOption.isListVariable
              ? exactOption
              : null;
          if (listOption) {
            const hasCategory =
              listOption.group && listOption.group !== "Other Fields";
            const displayText = () => {
              return listOption.label;
            };

            const currentDisplayText = displayText();
            const baseStyles = {
              position: "absolute",
              top: "50%",
              left: 8,
              transform: "translateY(-50%)",
              display: "inline-flex",
              alignItems: "center",
              background: "#bbf7d0",
              color: "#166534",
              borderRadius: 16,
              fontWeight: 700,
              border: "1.5px solid #4ade80",
              cursor: "pointer",
              minWidth: 0,
              whiteSpace: "nowrap",
              overflowX: "auto",
              overflowY: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "auto",
              zIndex: 2,
            };

            return (
              <ChipSpan
                style={getChipStyles(currentDisplayText, baseStyles)}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePathDisplay();
                }}
                title={getTooltipText(listOption, currentDisplayText)}
              >
                {currentDisplayText}
              </ChipSpan>
            );
          }
          // Do not show chip for free input values
          return null;
        })()}
      </div>
    </div>
  );
};

AutocompleteFields.propTypes = {
  fieldOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string,
      group: PropTypes.string,
      isVariable: PropTypes.bool,
      isListVariable: PropTypes.bool,
    }),
  ).isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
    PropTypes.object, // Supports metadata format: {name: "field", _meta: {...}}
  ]),
  onChange: PropTypes.func.isRequired,
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
  setOpenEquationIds: PropTypes.func.isRequired,
  setSelectedChip: PropTypes.func.isRequired,
  side: PropTypes.string.isRequired,
  setEquationAnchor: PropTypes.func,
};

export default AutocompleteFields;
