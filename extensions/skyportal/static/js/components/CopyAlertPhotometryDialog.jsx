import React from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useForm, Controller } from "react-hook-form";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import { showNotification } from "baselayer/components/Notifications";
import Button from "./Button";

import { saveAlertAsSource } from "../ducks/alert";
import FormValidationError from "./FormValidationError";

const CopyAlertPhotometryDialog = ({
  alert,
  duplicate,
  dialogOpen,
  closeDialog,
}) => {
  const dispatch = useDispatch();

  const groups = useSelector((state) => state.groups.userAccessible);

  const {
    handleSubmit,
    reset,
    control,
    getValues,

    formState: { errors },
  } = useForm();

  const currentGroupIds = duplicate.groups?.map((g) => g.id);

  const savedGroups = groups?.filter((g) => currentGroupIds.includes(g.id));

  const validateGroups = () => {
    const formState = getValues();
    return (
      formState.groupIds?.length &&
      formState.groupIds.filter((value) => Boolean(value)).length >= 1
    );
  };

  const onSubmit = async (data) => {
    const savedGroupIds = savedGroups?.map((g) => g.id);
    const groupIds = savedGroupIds?.filter((ID, idx) => data.groupIds[idx]);
    data.group_ids = groupIds;
    data.copyToSource = duplicate.id;
    const result = await dispatch(
      saveAlertAsSource({
        id: alert.objectId,
        payload: data,
      })
    );
    if (result.status === "success") {
      dispatch(
        showNotification("Source photometry updated successfully", "info")
      );
      reset();
    }
    closeDialog();
  };

  return (
    <>
      <Dialog open={dialogOpen} onClose={closeDialog} sx={{ "z-index": 99999 }}>
        <DialogTitle>Copy photometry to selected groups:</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {(errors.inviteGroupIds || errors.unsaveGroupIds) && (
              <FormValidationError message="Select at least one group." />
            )}
            {!!savedGroups.length && (
              <>
                {savedGroups.map((savedGroup, idx) => (
                  <FormControlLabel
                    key={savedGroup.id}
                    control={
                      <Controller
                        render={({ field: { onChange, value } }) => (
                          <Checkbox
                            onChange={(event) => onChange(event.target.checked)}
                            checked={value}
                            data-testid={`copyGroupCheckbox_${savedGroup.id}`}
                          />
                        )}
                        name={`groupIds[${idx}]`}
                        control={control}
                        rules={{ validate: validateGroups }}
                        defaultValue={false}
                      />
                    }
                    label={savedGroup.name}
                  />
                ))}
              </>
            )}
            <div style={{ textAlign: "center" }}>
              <Button
                secondary
                type="submit"
                name={`copyPhotometryButton_${alert.objectId}`}
              >
                Copy Photometry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
CopyAlertPhotometryDialog.propTypes = {
  alert: PropTypes.shape({
    objectId: PropTypes.string,
  }).isRequired,
  duplicate: PropTypes.string.isRequired,
  dialogOpen: PropTypes.bool.isRequired,
  closeDialog: PropTypes.func.isRequired,
};

export default CopyAlertPhotometryDialog;
