import React from "react";
import PropTypes from "prop-types";
import { Popover, Paper } from "@mui/material";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";

const escapeLatexForDisplay = (text) => {
  if (!text) return text;
  return text.replace(/_/g, "\\_");
};

const EquationPopover = ({
  open,
  anchorEl,
  onClose,
  variableName,
  customVariables,
}) => {
  if (!open || !anchorEl || !variableName) return null;

  const eqObj = customVariables.find(
    (eq) => eq.variable === variableName || eq.name === variableName,
  );
  const equation = eqObj ? eqObj.variable : null;

  if (!equation) return null;

  const displayEquation = escapeLatexForDisplay(equation);

  return (
    <Popover
      open={open}
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
  open: PropTypes.bool.isRequired,
  anchorEl: PropTypes.shape({
    getBoundingClientRect: PropTypes.func,
  }),
  onClose: PropTypes.func.isRequired,
  variableName: PropTypes.string,
  customVariables: PropTypes.arrayOf(
    PropTypes.shape({
      variable: PropTypes.string,
      name: PropTypes.string,
    }),
  ).isRequired,
};

export default EquationPopover;
