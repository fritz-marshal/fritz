import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import {
  fetchElement,
  postElement,
} from "../../../../ducks/boom_filter_modules";
import { useCurrentBuilder } from "../../../../hooks/useContexts";
import { useDispatch, useSelector } from "react-redux";

const SaveBlockDialogMenu = () => {
  const {
    saveDialog,
    setSaveDialog,
    saveName,
    setSaveName,
    saveError,
    setSaveError,
    setCustomBlocks,
    setCollapsedBlocks,
    setFilters,
    localFiltersUpdater,
    customVariables,
    customListVariables,
  } = useCurrentBuilder();

  const dispatch = useDispatch();
  const stream = useSelector((state) => state.boom_filter_v.stream?.name);

  const handleSaveDialogConfirm = async () => {
    if (!saveName || !saveName.trim()) {
      setSaveError("Name is required.");
      return;
    }

    const nameValue = saveName.trim();
    const streamName = stream?.split(" ")[0];

    const notAvailable = await dispatch(
      fetchElement({ survey: nameValue, elements: "blocks" }),
    );
    if (notAvailable?.data?.blocks != null) {
      const existingStreams = notAvailable.data.blocks.streams;
      // Name conflicts only if the existing block belongs to the same stream
      const isConflict =
        !existingStreams ||
        existingStreams.length === 0 ||
        !streamName ||
        existingStreams.includes(streamName);
      if (isConflict) {
        setSaveError("Name already exists. Please choose another.");
        return;
      }
    }

    const saved = await dispatch(
      postElement({
        name: nameValue,
        data: { block: saveDialog.block, streams: [stream] },
        elements: "blocks",
      }),
    );
    if (saved) {
      const blockId = saveDialog.block.id;

      const updateFilters = localFiltersUpdater || setFilters;

      updateFilters((prevFilters) => {
        const replaceBlock = (block) => {
          if (block.id !== blockId) {
            return {
              ...block,
              children:
                block.children?.map((child) =>
                  child.category === "block" ? replaceBlock(child) : child,
                ) || [],
            };
          }

          const updatedBlock = {
            ...block,
            customBlockName: nameValue,
            isTrue: true,
          };
          return updatedBlock;
        };
        return prevFilters.map(replaceBlock);
      });

      setCustomBlocks((prev) => {
        const newName = `Custom.${nameValue}`;
        return [
          ...prev.filter(
            (cb) => cb.block?.id !== blockId && cb.name !== newName,
          ),
          { name: newName, block: saveDialog.block },
        ];
      });

      // Finally collapse the block
      setCollapsedBlocks((prev) => ({
        ...prev,
        [blockId]: true,
      }));
      setSaveDialog({ open: false, block: null });
      setSaveName("");
      setSaveError("");
    } else {
      setSaveError("Failed to save block.");
    }
  };

  return (
    <Dialog
      open={saveDialog.open}
      onClose={() => {
        setSaveDialog({ open: false, block: null });
        setSaveName("");
        setSaveError("");
      }}
    >
      <DialogTitle>Save Block</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Block Name"
          fullWidth
          value={saveName}
          onChange={(e) => {
            setSaveName(e.target.value);
            setSaveError("");
          }}
          error={!!saveError}
          helperText={saveError || "Enter a unique name for this custom block"}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setSaveDialog({ open: false, block: null });
            setSaveName("");
            setSaveError("");
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSaveDialogConfirm} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveBlockDialogMenu;
