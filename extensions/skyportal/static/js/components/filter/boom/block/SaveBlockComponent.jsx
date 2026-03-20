import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, Typography } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

const SaveBlockComponent = ({
  setSaveDialog,
  setSaveName,
  setSaveError,
  setFilters,
  isCustomBlock,
  isCollapsed,
  block,
}) => {
  const [localSaveError, setLocalSaveError] = useState("");

  // TODO: Implement robust validation logic for the block
  const validateBlock = (b) => {
    if (b.category === "condition") {
      if (b.isListVariable) {
        return !!b.field;
      }

      // Operators that don't require a value or accept boolean/special values
      const operatorsWithOptionalValue = [
        "$exists",
        "$isNumber",
        "$anyElementTrue",
        "$allElementsTrue",
      ];
      if (operatorsWithOptionalValue.includes(b.operator)) {
        return true; // Value is optional or can be any type (including false)
      }

      // Check if field and operator are present
      if (!b.field || !b.operator) {
        return false;
      }

      // Regular conditions need field, operator, and value
      return b.value !== "" && b.value !== null && b.value !== undefined;
    }
    if (b.category === "block") {
      return b.children.length > 0 && b.children.every(validateBlock);
    }
    return false;
  };

  const handleSaveBlock = () => {
    if (!validateBlock(block)) {
      setLocalSaveError("Please fill all fields before saving.");
      setTimeout(() => setLocalSaveError(""), 3000);
      return;
    }

    try {
      setFilters((prevFilters) => {
        const updateBlock = (b) => {
          if (b.id !== block.id) {
            return {
              ...b,
              children: b.children
                ? b.children.map((child) =>
                    child.category === "block" ? updateBlock(child) : child,
                  )
                : [],
            };
          }
          return { ...b, isTrue: true };
        };
        return prevFilters.map(updateBlock);
      });
      const updatedBlock = { ...block, isTrue: true };
      setSaveDialog({ open: true, block: updatedBlock });
      setSaveName("");
      setSaveError("");
    } catch (error) {
      console.error("Error saving block:", error);
      setLocalSaveError("An error occurred while saving. Please try again.");
      setTimeout(() => setLocalSaveError(""), 3000);
    }
  };

  return (
    <>
      {/* Save Block Button (always right-aligned) */}
      {!isCustomBlock || !isCollapsed ? (
        <Button
          size="medium"
          startIcon={<SaveIcon />}
          variant="outlined"
          onClick={handleSaveBlock}
          sx={{
            minHeight: 40, // Match the typical height of a small Select component
            px: 2, // Add some horizontal padding to match Select width better
          }}
        >
          Save Block
        </Button>
      ) : null}
      {localSaveError && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 1, display: "block" }}
        >
          {localSaveError}
        </Typography>
      )}
    </>
  );
};

SaveBlockComponent.propTypes = {
  setSaveDialog: PropTypes.func.isRequired,
  setSaveName: PropTypes.func.isRequired,
  setSaveError: PropTypes.func.isRequired,
  setFilters: PropTypes.func.isRequired,
  isCustomBlock: PropTypes.bool.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
    category: PropTypes.string,
    children: PropTypes.arrayOf(PropTypes.shape({})),
    field: PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})]),
    operator: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.shape({})),
      PropTypes.shape({}),
    ]),
    isListVariable: PropTypes.bool,
  }).isRequired,
};

export default SaveBlockComponent;
