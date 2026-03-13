import React, { useMemo, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Button, Box, Typography } from "@mui/material";
import {
  Code as CodeIcon,
  Note as NoteIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useFilterBuilder } from "../../../hooks/useContexts";
import { flattenFieldOptions } from "../../../constants/filterConstants";
import AddVariableDialog from "./dialog/AddVariableDialog";
import BlockComponent from "./block/BlockComponent";
import AddListConditionDialog from "./dialog/AddListConditionDialog";
import AddSwitchDialog from "./dialog/AddSwitchDialog";
import SaveBlockDialogMenu from "./block/SaveBlockDialogMenu";
import MongoQueryDialog from "./dialog/MongoQueryDialog";
import { filterBuilderStyles } from "../../../styles/componentStyles";
import { showNotification } from "baselayer/components/Notifications";

import { updateGroupFilter } from "../../../ducks/boom_filter";
import { fetchSchema } from "../../../ducks/boom_filter_modules";

// Helper function to recursively collect all block IDs (excluding root blocks)
const collectAllBlockIds = (blocks, isRoot = true) => {
  const blockIds = [];

  if (!blocks || !Array.isArray(blocks)) return blockIds;

  blocks.forEach((block) => {
    if (!block || block.category !== "block") return;

    // Don't collect root block IDs, only nested ones
    if (!isRoot && block.id) {
      blockIds.push(block.id);
    }

    // Recursively collect from children
    if (block.children && block.children.length > 0) {
      const childBlockIds = collectAllBlockIds(block.children, false);
      blockIds.push(...childBlockIds);
    }
  });

  return blockIds;
};

const FilterBuilderContent = ({
  onToggleAnnotationBuilder,
  filter,
  setInlineNewVersion,
  setShowAnnotationBuilder,
}) => {
  const {
    setMongoDialog,
    hasValidQuery,
    collapsedBlocks,
    setCollapsedBlocks,
    generateMongoQuery,
    setFilters,
    setLocalFiltersUpdater,
    // Use context state for local filter management
    localFilterData,
    setLocalFilterData,
    hasBeenModified,
    setHasBeenModified,
    // Get the factory function for creating default conditions
    createDefaultCondition,
    // Get annotations and projection fields for saving/loading
    annotations,
    setAnnotations,
    projectionFields,
    setProjectionFields,
  } = useFilterBuilder();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const filter_v = useSelector((state) => state.boom_filter_v);
  const filter_stream = useSelector(
    (state) => state.boom_filter_v.stream?.name?.split(" ")[0],
  );
  const store_schema = useSelector((state) => state.filter_modules?.schema);

  const [schema, setSchema] = useState(null);
  const [fieldOptions, setFieldOptions] = useState([]);

  // Helper function to create an empty filter with a default empty condition
  const createEmptyFilterWithDefaultCondition = useCallback(
    () => [
      {
        id: "root-block",
        category: "block",
        operator: "and",
        children: [createDefaultCondition()],
      },
    ],
    [createDefaultCondition],
  );

  // Initialize local filter data when filter prop changes
  useEffect(() => {
    // Don't override if user has already made modifications
    if (hasBeenModified) {
      return;
    }

    // Helper to collapse all blocks after loading filter data
    const collapseAllBlocks = (filterData) => {
      if (setCollapsedBlocks && filterData) {
        const allBlockIds = collectAllBlockIds(filterData);
        if (allBlockIds.length > 0) {
          setCollapsedBlocks((prev) => {
            const newCollapsed = { ...prev };
            allBlockIds.forEach((id) => {
              newCollapsed[id] = true;
            });
            return newCollapsed;
          });
        }
      }
    };

    // First, check if we have filter data in the expected structure
    if (filter && filter.filters && filter.active_fid) {
      // This seems to be the original working structure
      const activeFilters = filter.filters.filter(
        (version) => version.fid === filter.active_fid,
      );

      if (activeFilters.length > 0 && activeFilters[0].version) {
        const versionData = activeFilters[0].version;

        // Check if version data contains both filters and annotations (new format)
        if (versionData.filters && versionData.annotations !== undefined) {
          setLocalFilterData(versionData.filters);
          if (setFilters) {
            setFilters(versionData.filters);
          }
          // Restore annotations if they exist
          if (versionData.annotations && setAnnotations) {
            setAnnotations(versionData.annotations);
          }
          // Restore projection fields if they exist
          if (versionData.projectionFields && setProjectionFields) {
            setProjectionFields(versionData.projectionFields);
          }
          // Collapse blocks after loading
          collapseAllBlocks(versionData.filters);
          return;
        }

        // Fallback: handle old format where version[0] contains filter data
        if (Array.isArray(versionData) && versionData[0]) {
          // Convert the original structure to editable format
          // Extract the actual filter blocks from version[0]
          const editableData = versionData;

          setLocalFilterData(editableData);
          if (setFilters) {
            setFilters(editableData);
          }
          // Collapse blocks after loading
          collapseAllBlocks(editableData);
          return;
        }
      }
    }

    // Fallback: try the pipeline structure
    if (filter && filter.fv && filter.active_fid) {
      const activeVersion = filter.fv.find(
        (version) => version.fid === filter.active_fid,
      );

      if (activeVersion && activeVersion.pipeline) {
        try {
          const pipelineData = JSON.parse(activeVersion.pipeline);
          setLocalFilterData(pipelineData);
          if (setFilters && pipelineData) {
            setFilters(pipelineData);
          }
          // Collapse blocks after loading
          collapseAllBlocks(pipelineData);
        } catch (error) {
          console.error("Error parsing pipeline data:", error);
          const emptyFilter = createEmptyFilterWithDefaultCondition();
          setLocalFilterData(emptyFilter);
          if (setFilters) {
            setFilters(emptyFilter);
          }
        }
      } else {
        const emptyFilter = createEmptyFilterWithDefaultCondition();
        setLocalFilterData(emptyFilter);
        if (setFilters) {
          setFilters(emptyFilter);
        }
      }
    } else if (!localFilterData) {
      const emptyFilter = createEmptyFilterWithDefaultCondition();
      setLocalFilterData(emptyFilter);
      if (setFilters) {
        setFilters(emptyFilter);
      }
    }
  }, [
    filter,
    setFilters,
    hasBeenModified,
    createEmptyFilterWithDefaultCondition,
    setCollapsedBlocks,
    localFilterData,
    setLocalFilterData,
    setAnnotations,
    setProjectionFields,
  ]);

  // Update context filters when local filter data changes
  useEffect(() => {
    if (localFilterData && setFilters) {
      setFilters(localFilterData);
    }
  }, [localFilterData, setFilters]);

  useEffect(() => {
    if (filter_stream) dispatch(fetchSchema(filter_stream));
  }, [filter_stream, dispatch]);

  useEffect(() => {
    if (store_schema) {
      setSchema(store_schema);
      setFieldOptions(flattenFieldOptions(store_schema));
    }
  }, [store_schema]);

  // Callback to handle filter updates from child components
  const handleFilterUpdate = useCallback(
    (updatedFilters) => {
      setHasBeenModified(true); // Mark as modified to prevent useEffect override
      setLocalFilterData(updatedFilters);
      // Also update the context immediately for MongoDB generation
      if (setFilters) {
        setFilters(updatedFilters);
      }
    },
    [setHasBeenModified, setLocalFilterData, setFilters],
  );

  // Set the local filters updater in the context so dialogs can access it
  useEffect(() => {
    if (setLocalFiltersUpdater) {
      setLocalFiltersUpdater(() => handleFilterUpdate);
    }
  }, [setLocalFiltersUpdater, handleFilterUpdate]);

  // Use local filter data or fallback to context filters
  const { filters: contextFilters } = useFilterBuilder();
  const filtersToRender = localFilterData || contextFilters;

  // Find the most nested non-collapsed block to make its header sticky
  // Use useMemo to ensure this recalculates when filters or collapsedBlocks change
  const getMostNestedNonCollapsedBlock = useMemo(() => {
    if (!filtersToRender || filtersToRender.length === 0)
      return { blockId: null, path: [] };

    // Recursively find the deepest non-collapsed block
    const findDeepest = (blocks, path = [], depth = 0) => {
      let deepestBlock = { blockId: null, path: [], depth: -1 };

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (!block || !block.id || block.category !== "block") continue;

        const currentPath = [...path, i];
        // Root blocks (depth 0) are never collapsed, only nested blocks can be collapsed
        const isCollapsed = depth > 0 && collapsedBlocks?.[block.id] === true;

        if (!isCollapsed) {
          // This block is not collapsed, it's a candidate for sticky header
          if (depth >= deepestBlock.depth) {
            deepestBlock = { blockId: block.id, path: currentPath, depth };
          }

          // If this block has children blocks, recursively search them
          if (block.children && block.children.length > 0) {
            const childBlocks = block.children.filter(
              (child) => child?.category === "block",
            );
            if (childBlocks.length > 0) {
              const deepestChild = findDeepest(
                childBlocks,
                currentPath,
                depth + 1,
              );
              // Only update if we found a deeper block
              if (
                deepestChild.blockId &&
                deepestChild.depth > deepestBlock.depth
              ) {
                deepestBlock = deepestChild;
              }
            }
          }
        }
      }

      return deepestBlock;
    };

    const result = findDeepest(filtersToRender);
    return result;
  }, [filtersToRender, collapsedBlocks]);

  const handleShowMongoQuery = () => {
    setMongoDialog({ open: true });
  };

  const handleSaveFilter = async () => {
    const mongoQuery = generateMongoQuery();
    if (!mongoQuery || (Array.isArray(mongoQuery) && mongoQuery.length === 0)) {
      dispatch(showNotification("No valid MongoDB query to save", "error"));
      return;
    }

    try {
      // Use the current local filter data (which includes user modifications)
      const currentFilters =
        localFilterData || contextFilters || filtersToRender;

      // Get current annotations from context
      const currentAnnotations = annotations || [];

      // Combine filters and annotations in the version data
      const versionData = {
        filters: currentFilters,
        annotations: currentAnnotations,
        projectionFields: projectionFields || [],
      };

      const result = await dispatch(
        updateGroupFilter(filter.id, mongoQuery, versionData, filter_v.name),
      );
      dispatch(showNotification("Filter saved to boom database!"));
      if (result.status === "success") {
        setInlineNewVersion(false);
        setShowAnnotationBuilder(false);
      }
    } catch (err) {
      console.error("Error saving filter:", err);
      const errorMessage =
        err.message ||
        "Failed to save filter to boom database. Please try again.";
      dispatch(showNotification(errorMessage, "error"));
    }
  };

  const handleAddAnnotations = () => {
    if (onToggleAnnotationBuilder) {
      onToggleAnnotationBuilder();
    } else {
      navigate("/annotations");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        ...filterBuilderStyles.container,
        // Ensure this container allows sticky positioning
        position: "relative",
        height: "100%",
      }}
    >
      {/* Header with buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h2" sx={{ color: "text.primary" }}>
          Filter Builder
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveFilter}
            disabled={!hasValidQuery()}
            sx={{
              backgroundColor: hasValidQuery() ? "primary.main" : undefined,
              "&:hover": {
                backgroundColor: hasValidQuery() ? "primary.dark" : undefined,
              },
            }}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            startIcon={<NoteIcon />}
            onClick={handleAddAnnotations}
            sx={{
              "&:hover": {
                backgroundColor: "secondary.50",
                borderColor: "secondary.main",
              },
            }}
          >
            Add Annotations
          </Button>
          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={handleShowMongoQuery}
            disabled={!hasValidQuery()}
            sx={{
              borderColor: hasValidQuery() ? "primary.main" : undefined,
              color: hasValidQuery() ? "primary.main" : undefined,
              "&:hover": {
                borderColor: hasValidQuery() ? "primary.dark" : undefined,
                backgroundColor: hasValidQuery() ? "primary.50" : undefined,
              },
            }}
          >
            Test/Preview filter output
          </Button>
        </Box>
      </Box>

      {/* Filter Blocks */}
      {filtersToRender && filtersToRender.length > 0 ? (
        filtersToRender.map((block, index) => {
          return (
            <BlockComponent
              key={block.id || index}
              block={block}
              parentBlockId={null}
              isRoot={index === 0}
              fieldOptionsList={fieldOptions}
              stickyBlockId={getMostNestedNonCollapsedBlock.blockId}
              localFilters={filtersToRender}
              setLocalFilters={handleFilterUpdate}
            />
          );
        })
      ) : (
        <Typography variant="body2" color="text.secondary">
          No filter blocks to display. Add conditions to get started.
        </Typography>
      )}

      {/* Dialogs */}
      <AddVariableDialog />
      <AddListConditionDialog />
      <AddSwitchDialog />
      <SaveBlockDialogMenu />
      <MongoQueryDialog />
    </Box>
  );
};

FilterBuilderContent.propTypes = {
  onToggleAnnotationBuilder: PropTypes.func.isRequired,
  filter: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    stream_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    group_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    filt: PropTypes.shape({}),
    version: PropTypes.arrayOf(PropTypes.shape({})),
    active_fid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fv: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    ),
    filters: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    ),
  }),
  setInlineNewVersion: PropTypes.func.isRequired,
  setShowAnnotationBuilder: PropTypes.func.isRequired,
};

export default FilterBuilderContent;
