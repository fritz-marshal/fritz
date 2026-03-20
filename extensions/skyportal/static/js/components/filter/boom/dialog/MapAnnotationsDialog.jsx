import React, { useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Box,
  Typography,
  Paper,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";

const getOutputFieldName = (arrayField) => {
  return arrayField?.outputName
    ? `${arrayField.outputName}`
    : `${arrayField.fieldName}_mapped`;
};

const getMongoMapQuery = (arrayField, mapProjectionFields) => {
  if (!arrayField || !arrayField.fieldName || mapProjectionFields.length === 0)
    return null;
  const inObj = {};
  mapProjectionFields.forEach((f) => {
    if (!f.outputName || !f.fieldName) return;
    let value;
    switch (f.type) {
      case "exclude":
        value = 0;
        break;
      case "round":
        value = {
          $round: [
            `$$match.${f.fieldName.label}`,
            typeof f.roundDecimals === "number" ? f.roundDecimals : 4,
          ],
        };
        break;
      case "include":
      default:
        value = `$$match.${f.fieldName.label}`;
    }
    inObj[f.outputName] = value;
  });
  return {
    $map: {
      input: `$${arrayField.fieldName}`,
      as: "match",
      in: inObj,
    },
  };
};

const MapAnnotationsDialog = ({
  open,
  onClose,
  arrayField,
  mapProjectionFields,
  setMapProjectionFields,
  onSave,
}) => {
  // Ensure there's always at least one empty field when dialog opens
  useEffect(() => {
    if (open && mapProjectionFields.length === 0) {
      setMapProjectionFields([
        {
          id: Date.now(),
          fieldName: "",
          outputName: "",
          type: "include",
        },
      ]);
    }
  }, [open, mapProjectionFields.length, setMapProjectionFields]);

  const subFields = arrayField?.subFields || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Map Annotations to Array Field
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {arrayField && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Selected Array Field:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
              {arrayField.fieldName}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {mapProjectionFields.map((mapField, idx) => (
            <Paper key={mapField.id || idx} variant="outlined" sx={{ p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <TextField
                  label="Annotation Name"
                  value={mapField.outputName}
                  onChange={(e) =>
                    setMapProjectionFields((fields) =>
                      fields.map((f) =>
                        f.id === mapField.id
                          ? { ...f, outputName: e.target.value }
                          : f,
                      ),
                    )
                  }
                  size="small"
                  sx={{ minWidth: 150 }}
                  placeholder={mapField.fieldName}
                />
                <Autocomplete
                  value={
                    mapField.fieldName
                      ? subFields
                          .map((sf) => ({ label: sf, name: sf }))
                          .find((opt) => opt.name === mapField.fieldName) ||
                        null
                      : null
                  }
                  onChange={(_, newValue) => {
                    setMapProjectionFields((fields) =>
                      fields.map((f) =>
                        f.id === mapField.id
                          ? {
                              ...f,
                              fieldName:
                                typeof newValue === "string"
                                  ? newValue
                                  : newValue?.name || newValue?.label || "",
                            }
                          : f,
                      ),
                    );
                  }}
                  options={subFields.map((sf) => ({ label: sf, name: sf }))}
                  isOptionEqualToValue={(option, value) =>
                    option.name === value?.name
                  }
                  getOptionLabel={(option) => {
                    if (
                      typeof option.label === "object" &&
                      option.label !== null
                    ) {
                      return option.label.label || "";
                    }
                    if (
                      typeof option.name === "object" &&
                      option.name !== null
                    ) {
                      return option.name.label || "";
                    }
                    return option.label || option.name || "";
                  }}
                  sx={{ minWidth: 250 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Field (subfield)"
                      size="small"
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={option.name || option.label} {...otherProps}>
                        {option.label || option.name || ""}
                      </li>
                    );
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={mapField.type || "include"}
                    onChange={(e) =>
                      setMapProjectionFields((fields) =>
                        fields.map((f) =>
                          f.id === mapField.id
                            ? { ...f, type: e.target.value }
                            : f,
                        ),
                      )
                    }
                    label="Type"
                  >
                    <MenuItem value="include">Include</MenuItem>
                    <MenuItem value="exclude">Exclude</MenuItem>
                    <MenuItem value="round">Round</MenuItem>
                  </Select>
                </FormControl>
                {mapField.type === "round" && (
                  <TextField
                    label="Decimals"
                    type="number"
                    value={
                      typeof mapField.roundDecimals === "number"
                        ? mapField.roundDecimals
                        : 4
                    }
                    onChange={(e) => {
                      const val = Math.max(
                        0,
                        Math.min(10, parseInt(e.target.value) || 0),
                      );
                      setMapProjectionFields((fields) =>
                        fields.map((f) =>
                          f.id === mapField.id
                            ? { ...f, roundDecimals: val }
                            : f,
                        ),
                      );
                    }}
                    size="small"
                    sx={{ width: 100 }}
                    inputProps={{ min: 0, max: 10 }}
                  />
                )}
                <IconButton
                  onClick={() =>
                    setMapProjectionFields((fields) =>
                      fields.filter((f) => f.id !== mapField.id),
                    )
                  }
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          ))}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={() =>
              setMapProjectionFields((fields) => [
                ...fields,
                { id: Date.now(), fieldName: "", outputName: "" },
              ])
            }
          >
            Add Map Annotation
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (onSave) {
              const mongoMapQuery = getMongoMapQuery(
                arrayField,
                mapProjectionFields,
              );
              const outputFieldName = getOutputFieldName(arrayField);
              onSave({ outputFieldName, mongoMapQuery });
            }
            onClose();
          }}
        >
          Save
        </Button>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

MapAnnotationsDialog.propTypes = {
  key: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  arrayField: PropTypes.shape({
    outputName: PropTypes.string,
    fieldName: PropTypes.string,
    subFields: PropTypes.arrayOf(PropTypes.string),
  }),
  mapProjectionFields: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      fieldName: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      outputName: PropTypes.string,
      type: PropTypes.string,
      roundDecimals: PropTypes.number,
    }),
  ).isRequired,
  setMapProjectionFields: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default MapAnnotationsDialog;
