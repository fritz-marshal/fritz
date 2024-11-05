import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import Paper from "@mui/material/Paper";
import { useTheme } from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Tooltip from "@mui/material/Tooltip";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { CopyToClipboard } from "react-copy-to-clipboard";
import TextField from "@mui/material/TextField";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";

import ReactDiffViewer from "react-diff-viewer";
import { useForm, Controller } from "react-hook-form";
import { showNotification } from "baselayer/components/Notifications";

import * as filterVersionActions from "../../ducks/kowalski_filter";
import * as allocationActions from "../../ducks/allocations";
import * as instrumentsActions from "../../ducks/instruments";

const useStyles = makeStyles((theme) => ({
  pre: {
    lineHeight: 8,
  },
  paperDiv: {
    padding: "1rem",
    height: "100%",
  },
  nested: {
    paddingLeft: theme.spacing(1),
  },
  heading: {
    fontSize: "1.0625rem",
    fontWeight: 500,
  },
  accordion_details: {
    flexDirection: "column",
  },
  appBar: {
    position: "relative",
  },
  button_add: {
    marginRight: 10,
    height: "3.5rem",
  },
  divider: {
    width: "100%",
    height: 2,
    backgroundColor: "rgba(0, 0, 0, .125)",
    margin: "1rem 0",
  },
  infoLine: {
    // Get its own line
    flexBasis: "100%",
    display: "flex",
    flexFlow: "row wrap",
    padding: "0.25rem 0",
  },
  formControl: {
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    minWidth: "12rem",
  },
  marginLeft: {
    marginLeft: theme.spacing(2),
  },
  marginTop: {
    marginTop: theme.spacing(2),
  },
  root: {
    minWidth: "18rem",
  },
  bullet: {
    display: "inline-block",
    margin: "0 2px",
    transform: "scale(0.8)",
  },
  filter_details: {
    marginTop: "1rem",
    marginBottom: "1rem",
    fontSize: "0.875rem",
  },
  big_font: {
    fontSize: "1rem",
  },
  pos: {
    marginBottom: "0.75rem",
  },
  header: {
    paddingBottom: 10,
  },
}));

const FilterPlugins = ({ group }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { register, handleSubmit, setValue, control } = useForm();

  const theme = useTheme();
  const darkTheme = theme.palette.mode === "dark";

  const profile = useSelector((state) => state.profile);

  const filter = useSelector((state) => state.filter);
  const filter_v = useSelector((state) => state.filter_v);
  const { fid } = useParams();
  const loadedId = useSelector((state) => state.filter.id);

  const { users } = useSelector((state) => state.users);

  const allGroups = useSelector((state) => state.groups.all);
  const userAccessibleGroups = useSelector(
    (state) => state.groups.userAccessible,
  );
  const { allocationListApiClassname } = useSelector(
    (state) => state.allocations,
  );
  const { instrumentList, instrumentFormParams } = useSelector(
    (state) => state.instruments,
  );

  useEffect(() => {
    if (!instrumentList || instrumentList.length === 0) {
      dispatch(instrumentsActions.fetchInstruments());
    }
    if (
      !allocationListApiClassname ||
      allocationListApiClassname.length === 0
    ) {
      dispatch(allocationActions.fetchAllocationsApiClassname());
    }
  }, [dispatch]);

  const groupLookUp = {};
  // eslint-disable-next-line no-unused-expressions
  allGroups?.forEach((g) => {
    groupLookUp[g.id] = g;
  });

  const allocationLookUp = {};
  // eslint-disable-next-line no-unused-expressions
  allocationListApiClassname?.forEach((allocation) => {
    allocationLookUp[allocation.id] = allocation;
  });

  const instLookUp = {};
  // eslint-disable-next-line no-unused-expressions
  instrumentList?.forEach((instrumentObj) => {
    instLookUp[instrumentObj.id] = instrumentObj;
  });

  const [autosaveComment, setAutosaveComment] = useState("");
  const [autoFollowupComment, setAutoFollowupComment] = useState("");
  const [autoFollowupRadius, setAutoFollowupRadius] = useState(0.5);
  const [autoFollowupTnsAge, setAutoFollowupTnsAge] = useState(null);

  const [otherVersion, setOtherVersion] = React.useState("");

  const handleSelectFilterVersionDiff = (event) => {
    setOtherVersion(event.target.value);
  };

  const [panelKowalskiExpanded, setPanelKowalskiExpanded] = useState(true);

  const handlePanelKowalskiChange = (panel) => (event, isExpanded) => {
    setPanelKowalskiExpanded(isExpanded ? panel : false);
  };

  const handleChangeUpdateAnnotations = async (event) => {
    const target = event.target.checked;
    const result = await dispatch(
      filterVersionActions.editUpdateAnnotations({
        filter_id: filter.id,
        update_annotations: target,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Set update_annotations to ${target}`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleChangeAutosave = async (event) => {
    const target = event.target.checked;
    let newAutoSave = false;
    // the the current autosave is an object and not a boolean, copy that object
    if (typeof filter_v.autosave === "object") {
      newAutoSave = { ...filter_v.autosave };
      newAutoSave.active = target;
    } else {
      newAutoSave = target;
    }
    const result = await dispatch(
      filterVersionActions.editAutosave({
        filter_id: filter.id,
        autosave: newAutoSave,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Set autosave to ${target}`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleChangeAutosaveComment = async () => {
    let newAutosaveComment = autosaveComment;
    if (newAutosaveComment === "") {
      newAutosaveComment = null;
    }
    let newAutoSave = {};
    // the the current autosave is an object and not a boolean, copy that object
    if (typeof filter_v.autosave === "object") {
      newAutoSave = { ...filter_v.autosave, comment: newAutosaveComment };
    } else {
      newAutoSave = { active: true, comment: newAutosaveComment };
    }
    const result = await dispatch(
      filterVersionActions.editAutosave({
        filter_id: filter.id,
        autosave: newAutoSave,
      }),
    );
    if (result.status === "success") {
      dispatch(
        showNotification(`Set autosave comment to ${newAutosaveComment}`),
      );
    } else {
      dispatch(
        showNotification(
          `Failed to set autosave comment to ${newAutosaveComment}`,
        ),
      );
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleChangeAutoFollowupComment = async () => {
    let newAutoFollowupComment = autoFollowupComment;
    if (newAutoFollowupComment === "") {
      newAutoFollowupComment = null;
    }
    let newAutoFollowup = {};
    // the the current autosave is an object and not a boolean, copy that object
    if (typeof filter_v.auto_followup === "object") {
      newAutoFollowup = {
        ...filter_v.auto_followup,
        comment: newAutoFollowupComment,
      };
    } else {
      newAutoFollowup = { active: true, comment: newAutoFollowupComment };
    }
    const result = await dispatch(
      filterVersionActions.editAutoFollowup({
        filter_id: filter.id,
        auto_followup: newAutoFollowup,
      }),
    );
    if (result.status === "success") {
      dispatch(
        showNotification(
          `Set auto followup comment to ${newAutoFollowupComment}`,
        ),
      );
    } else {
      dispatch(
        showNotification(
          `Failed to set auto followup comment to ${newAutoFollowupComment}`,
        ),
      );
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleChangeAutoFollowup = async (event) => {
    const target = event.target.checked;
    let newAutoFollowup = { active: target };
    // if there is no auto_followup object, create one
    if (filter_v.auto_followup) {
      newAutoFollowup = { ...filter_v.auto_followup, active: target };
    }
    const result = await dispatch(
      filterVersionActions.editAutoFollowup({
        filter_id: filter.id,
        auto_followup: newAutoFollowup,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Set auto_followup to ${target}`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleChangeAutoFollowupConstraints = async () => {
    const newAutoFollowup = {
      ...filter_v.auto_followup,
      radius: autoFollowupRadius,
      not_if_tns_reported: autoFollowupTnsAge,
    };
    const result = await dispatch(
      filterVersionActions.editAutoFollowup({
        filter_id: filter.id,
        auto_followup: newAutoFollowup,
      }),
    );
    if (result.status === "success") {
      dispatch(
        showNotification(
          `Set auto_followup radius constraint to ${autoFollowupRadius}, and TNS age constraint to ${autoFollowupTnsAge}`,
        ),
      );
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleChangeActiveFilter = async (event) => {
    const active_target = event.target.checked;
    const result = await dispatch(
      filterVersionActions.editActiveFilterVersion({
        filter_id: filter.id,
        active: active_target,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Set active to ${active_target}`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleFidChange = async (event) => {
    const activeFidTarget = event.target.value;
    const result = await dispatch(
      filterVersionActions.editActiveFidFilterVersion({
        filter_id: filter.id,
        active_fid: activeFidTarget,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Set active filter ID to ${activeFidTarget}`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  // forms
  const [openNew, setOpenNew] = React.useState(false);
  const [openDiff, setOpenDiff] = React.useState(false);
  const [openAutosaveFilter, setOpenAutosaveFilter] = React.useState(false);
  const [openAutoFollowupFilter, setOpenAutoFollowupFilter] =
    React.useState(false);
  const [openAutoFollowupPayload, setOpenAutoFollowupPayload] =
    React.useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState(null);
  const [selectedAllocationParams, setSelectedAllocationParams] =
    useState(null);
  const [selectedIgnoreGroupIds, setSelectedIgnoreGroupIds] = useState([]);
  const [selectedTargetGroupIds, setSelectedTargetGroupIds] = useState([]);
  const [selectedIgnoreAllocationIds, setSelectedIgnoreAllocationIds] =
    useState([]);
  const [selectedSaver, setSelectedSaver] = useState(null);

  useEffect(() => {
    // set the allocation_id if there's one in the filter
    if (filter_v?.auto_followup?.allocation_id) {
      setSelectedAllocationId(filter_v.auto_followup.allocation_id);
    }
    if (filter_v?.auto_followup?.target_group_ids?.length > 0) {
      setSelectedTargetGroupIds(filter_v.auto_followup.target_group_ids);
    }
    if (filter_v?.auto_followup?.ignore_allocation_ids?.length > 0) {
      setSelectedIgnoreAllocationIds(
        filter_v.auto_followup.ignore_allocation_ids,
      );
    }
    if (filter_v?.autosave?.ignore_group_ids?.length > 0) {
      setSelectedIgnoreGroupIds(filter_v.autosave.ignore_group_ids);
    }
    if (filter_v?.autosave?.saver_id) {
      setSelectedSaver(filter_v.autosave.saver_id);
    }
    let newPipeline = (filter_v?.fv || []).filter(
      (fv) => fv.fid === filter_v.active_fid,
    );
    if (newPipeline.length > 0) {
      newPipeline = newPipeline[0].pipeline;
    } else {
      newPipeline = "";
    }
    if (filter_v?.fv?.length > 0 && filter_v?.active_fid) {
      setValue("pipeline", newPipeline);
    }
    if (filter_v?.autosave?.pipeline) {
      setValue("pipeline_autosave", filter_v.autosave.pipeline);
    }
    if (filter_v?.auto_followup?.pipeline) {
      setValue("pipeline_auto_followup", filter_v.auto_followup.pipeline);
    }
    if (filter?.autosave?.comment) {
      setAutosaveComment(filter.autosave.comment);
    }
    if (filter?.auto_followup?.comment) {
      setAutoFollowupComment(filter.auto_followup.comment);
    }
  }, [filter_v]);

  useEffect(() => {
    if (!allocationLookUp[selectedAllocationId] || !instrumentFormParams) {
      return;
    }
    const existingParams = {
      ...instrumentFormParams[
        allocationLookUp[selectedAllocationId].instrument_id
      ],
    };
    // we make a copy of the existing params so we don't modify the original
    const params = JSON.parse(JSON.stringify(existingParams));
    // remove priority, start_date, and end_date if they exist in params.schema and params.uiSchema
    const deleted = [];
    if (params.formSchema) {
      if (params.formSchema.properties.start_date) {
        delete params.formSchema.properties.start_date;
        deleted.push("start_date");
      }
      if (params.formSchema.properties.end_date) {
        delete params.formSchema.properties.end_date;
        deleted.push("end_date");
      }
      // if deleted is not empty, remove these fields from the "required" list
      if (deleted.length > 0) {
        params.formSchema.required = (params.formSchema?.required || []).filter(
          (item) => !deleted.includes(item),
        );
      }
      setSelectedAllocationParams(params);
    }
  }, [selectedAllocationId, instrumentFormParams]);

  // save new filter version
  const onSubmitSaveFilterVersion = async (data) => {
    const result = await dispatch(
      filterVersionActions.addFilterVersion({
        filter_id: filter.id,
        pipeline: data.pipeline,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Saved new filter version`));
      setOpenNew(false);
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const onSubmitSaveAutosaveFilter = async (data) => {
    let newAutosave = filter_v.autosave;
    if (typeof filter_v.autosave === "boolean") {
      newAutosave = { active: filter_v.autosave };
    }
    newAutosave.pipeline = data.pipeline_autosave;
    const result = await dispatch(
      filterVersionActions.editAutosave({
        filter_id: filter.id,
        autosave: newAutosave,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Saved new autosave filter`));
      setOpenAutosaveFilter(false);
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const onSubmitSaveAutoFollowupFilter = async (data) => {
    const newAutoFollowup = filter_v.auto_followup;
    newAutoFollowup.pipeline = data.pipeline_auto_followup;
    const result = await dispatch(
      filterVersionActions.editAutoFollowup({
        filter_id: filter.id,
        auto_followup: newAutoFollowup,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Saved new auto followup filter`));
      setOpenAutoFollowupFilter(false);
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const onSubmitSaveAutoFollowupAllocation = async (e) => {
    setSelectedAllocationId(e.target.value);
    if (e.target.value === filter_v.auto_followup.allocation_id) {
      return;
    }
    const newAutoFollowup = {
      ...filter_v.auto_followup,
      allocation_id: e.target.value,
      payload: {},
    };
    const result = await dispatch(
      filterVersionActions.editAutoFollowup({
        filter_id: filter.id,
        auto_followup: newAutoFollowup,
      }),
    );
    if (result.status === "success") {
      dispatch(
        showNotification(
          `Saved new auto followup allocation_id to ${e.target.value}`,
        ),
      );
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const onSubmitSaveAutoFollowupPayload = async ({ formData }) => {
    const newAutoFollowup = {
      ...filter_v.auto_followup,
      payload: formData || {},
    };
    const result = await dispatch(
      filterVersionActions.editAutoFollowup({
        filter_id: filter.id,
        auto_followup: newAutoFollowup,
      }),
    );
    if (result.status === "success") {
      dispatch(showNotification(`Saved new auto followup payload`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const onSubmitSaveAutosaveGroups = async (e) => {
    let newAutosave = filter_v.autosave;
    if (typeof filter_v.autosave === "boolean") {
      newAutosave = { active: filter_v.autosave };
    }
    newAutosave.ignore_group_ids = e.target.value;
    const result = await dispatch(
      filterVersionActions.editAutosave({
        filter_id: filter.id,
        autosave: newAutosave,
      }),
    );
    if (result.status === "success") {
      dispatch(
        showNotification(
          `Saved new autosave ignore_group_ids to ${e.target.value}`,
        ),
      );
      setSelectedIgnoreGroupIds(e.target.value);
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const onSubmitSaveAutoFollowupGroups = async (e) => {
    const newAutoFollowup = filter_v.auto_followup;
    newAutoFollowup.target_group_ids = e.target.value;
    const result = await dispatch(
      filterVersionActions.editAutoFollowup({
        filter_id: filter.id,
        auto_followup: newAutoFollowup,
      }),
    );
    if (result.status === "success") {
      dispatch(
        showNotification(
          `Saved new auto followup target_group_ids to ${e.target.value}`,
        ),
      );
      setSelectedTargetGroupIds(e.target.value);
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const onSubmitSaveAutosaveSaver = async (e) => {
    let newAutosave = filter_v.autosave;
    if (typeof filter_v.autosave === "boolean") {
      newAutosave = { active: filter_v.autosave };
    }
    if (e.target.value === "unassigned") {
      newAutosave.saver_id = null;
    } else {
      newAutosave.saver_id = e.target.value;
    }
    const result = await dispatch(
      filterVersionActions.editAutosave({
        filter_id: filter.id,
        autosave: newAutosave,
      }),
    );
    if (result.status === "success") {
      if (e.target.value === "unassigned") {
        dispatch(
          showNotification(
            `Unassigned autosave saver, will use Kowalski's default saver`,
          ),
        );
        setSelectedSaver(null);
      } else {
        dispatch(
          showNotification(
            `Changed autosave saver to user with id ${e.target.value}`,
          ),
        );
        setSelectedSaver(e.target.value);
      }
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const onSubmitSaveAutoFollowupIgnoreAllocations = async (e) => {
    const newAutoFollowup = filter_v.auto_followup;
    newAutoFollowup.ignore_allocation_ids = e.target.value;
    const result = await dispatch(
      filterVersionActions.editAutoFollowup({
        filter_id: filter.id,
        auto_followup: newAutoFollowup,
      }),
    );
    if (result.status === "success") {
      dispatch(
        showNotification(
          `Saved new auto followup ignore_allocation_ids to ${e.target.value}`,
        ),
      );
      setSelectedIgnoreAllocationIds(e.target.value);
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleNew = () => {
    setOpenNew(true);
  };

  const handleCloseNew = () => {
    setOpenNew(false);
  };

  const handleDiff = () => {
    setOpenDiff(true);
  };

  const handleCloseDiff = () => {
    setOpenDiff(false);
  };

  const handleOpenAutosaveFilter = () => {
    setOpenAutosaveFilter(true);
  };

  const handleCloseAutosaveFilter = () => {
    setOpenAutosaveFilter(false);
  };

  const handleOpenAutoFollowupFilter = () => {
    setOpenAutoFollowupFilter(true);
  };

  const handleCloseAutoFollowupFilter = () => {
    setOpenAutoFollowupFilter(false);
  };

  const handleOpenAutoFollowupPayload = () => {
    setOpenAutoFollowupPayload(true);
  };

  const handleCloseAutoFollowupPayload = () => {
    setOpenAutoFollowupPayload(false);
  };

  // renders
  if (!filter_v) {
    return (
      <div>
        <CircularProgress color="secondary" />
      </div>
    );
  }

  const highlightSyntax = (str) => (
    <pre
      style={{
        display: "inline",
        fontSize: "0.75rem",
        fontFamily: "Lucida Console, sans-serif",
      }}
      dangerouslySetInnerHTML={{
        __html: str,
      }}
    />
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // not using API/kowalski_filter duck here as that would throw an error if filter does not exist on K
    const fetchInit = {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "GET",
    };

    const fetchFilterVersion = async () => {
      const response = await fetch(`/api/filters/${fid}/v`, fetchInit);

      let json = "";
      try {
        json = await response.json();
      } catch (error) {
        throw new Error(`JSON decoding error: ${error}`);
      }
      // exists on Kowalski?
      if (json.status === "success") {
        await dispatch(filterVersionActions.fetchFilterVersion(fid));
      }
    };

    if (loadedId !== fid) {
      fetchFilterVersion();
    }
  }, [fid, loadedId, dispatch]);

  return (
    <div>
      {filter && (
        <Accordion
          expanded={panelKowalskiExpanded}
          onChange={handlePanelKowalskiChange(true)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel-streams-content"
            id="panel-header"
            style={{ borderBottom: "1px solid rgba(0, 0, 0, .125)" }}
          >
            <Typography className={classes.heading}>
              Kowalski filter details
            </Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordion_details}>
            {filter_v?.fv && (
              <div className={classes.infoLine}>
                <FormControlLabel
                  className={classes.formControl}
                  control={
                    <Switch
                      checked={filter_v.active}
                      size="small"
                      onChange={handleChangeActiveFilter}
                      name="filterActive"
                    />
                  }
                  label="Active"
                />
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "end",
                gap: "1rem",
              }}
            >
              {filter_v?.fv && (
                <FormControl className={classes.formControl}>
                  <InputLabel id="alert-stream-select-required-label">
                    Active version
                  </InputLabel>
                  <Select
                    disabled={!filter_v.active}
                    labelId="alert-stream-select-required-label"
                    id="alert-stream-select"
                    value={filter_v.active_fid}
                    onChange={handleFidChange}
                    className={classes.marginTop}
                  >
                    {filter_v.fv.map((fv) => (
                      <MenuItem key={fv.fid} value={fv.fid}>
                        {fv.fid}: {fv.created_at.slice(0, 19)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNew}
                  className={classes.button_add}
                >
                  New version
                </Button>
                <Dialog
                  fullWidth
                  maxWidth="md"
                  open={openNew}
                  onClose={handleCloseNew}
                  aria-labelledby="max-width-dialog-title"
                >
                  <DialogTitle id="max-width-dialog-title">
                    Save new filter version
                  </DialogTitle>
                  <form onSubmit={handleSubmit(onSubmitSaveFilterVersion)}>
                    <DialogContent>
                      <DialogContentText>
                        Kowalski filter definition. For a detailed discussion,
                        please refer to the&nbsp;
                        <a
                          href="https://docs.fritz.science/user_guide.html#alert-filters-in-fritz"
                          target="_blank"
                          rel="noreferrer"
                        >
                          docs
                        </a>
                      </DialogContentText>
                      <Controller
                        render={({ field: { onChange, value } }) => (
                          <TextareaAutosize
                            maxRows={30}
                            minRows={6}
                            placeholder=""
                            name="pipeline"
                            style={{ width: "100%" }}
                            ref={register("pipeline")}
                            onChange={onChange}
                            value={value}
                          />
                        )}
                        name="pipeline"
                        control={control}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button
                        variant="contained"
                        color="primary"
                        type="submit"
                        className={classes.button_add}
                      >
                        Save
                      </Button>
                      <Button autoFocus onClick={handleCloseNew}>
                        Dismiss
                      </Button>
                    </DialogActions>
                  </form>
                </Dialog>
                {filter_v?.fv && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleDiff}
                    className={classes.button_add}
                  >
                    Inspect versions/diff
                  </Button>
                )}
                {filter_v?.fv && (
                  <Dialog fullScreen open={openDiff} onClose={handleCloseDiff}>
                    <AppBar className={classes.appBar}>
                      <Toolbar>
                        <IconButton
                          edge="start"
                          color="inherit"
                          onClick={handleCloseDiff}
                          aria-label="close"
                          size="large"
                        >
                          <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" className={classes.marginLeft}>
                          Inspect filter versions and diffs
                        </Typography>
                      </Toolbar>
                    </AppBar>
                    <Paper className={classes.paperDiv}>
                      <Grid container spacing={2}>
                        <Grid item xs={6} align="center">
                          <FormControl className={classes.formControl}>
                            <Select
                              labelId="fv-diff-label"
                              id="fv-diff"
                              name="filter_diff"
                              value={otherVersion}
                              onChange={handleSelectFilterVersionDiff}
                              className={classes.marginTop}
                            >
                              {filter_v.fv.map((fv) => (
                                <MenuItem key={fv.fid} value={fv.fid}>
                                  {fv.fid}: {fv.created_at.slice(0, 19)}
                                </MenuItem>
                              ))}
                            </Select>
                            <FormHelperText>
                              Select version to diff
                            </FormHelperText>
                          </FormControl>
                          {otherVersion.length > 0 && (
                            <CopyToClipboard
                              text={JSON.stringify(
                                JSON.parse(
                                  filter_v.fv.filter(
                                    (fv) => fv.fid === otherVersion,
                                  )[0].pipeline,
                                ),
                                null,
                                2,
                              )}
                            >
                              <IconButton
                                color="primary"
                                aria-label="Copy def to clipboard"
                                className={classes.marginTop}
                                size="large"
                              >
                                <FileCopyIcon />
                              </IconButton>
                            </CopyToClipboard>
                          )}
                        </Grid>
                        <Grid item xs={6} align="center">
                          <Typography
                            className={classes.big_font}
                            color="textSecondary"
                            gutterBottom
                          >
                            Active version:
                          </Typography>
                          <Typography
                            className={classes.big_font}
                            color="textPrimary"
                            gutterBottom
                          >
                            {`${filter_v.active_fid}: ${filter_v.fv
                              .filter((fv) => fv.fid === filter_v.active_fid)[0]
                              .created_at.slice(0, 19)}`}
                            <CopyToClipboard
                              text={JSON.stringify(
                                JSON.parse(
                                  filter_v.fv.filter(
                                    (fv) => fv.fid === filter_v.active_fid,
                                  )[0].pipeline,
                                ),
                                null,
                                2,
                              )}
                            >
                              <IconButton
                                color="primary"
                                aria-label="Copy def to clipboard"
                                size="large"
                              >
                                <FileCopyIcon />
                              </IconButton>
                            </CopyToClipboard>
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <ReactDiffViewer
                            newValue={JSON.stringify(
                              JSON.parse(
                                filter_v.fv.filter(
                                  (fv) => fv.fid === filter_v.active_fid,
                                )[0].pipeline,
                              ),
                              null,
                              2,
                            )}
                            oldValue={
                              otherVersion.length > 0
                                ? JSON.stringify(
                                    JSON.parse(
                                      filter_v.fv.filter(
                                        (fv) => fv.fid === otherVersion,
                                      )[0].pipeline,
                                    ),
                                    null,
                                    2,
                                  )
                                : otherVersion
                            }
                            splitView
                            showDiffOnly={false}
                            useDarkTheme={darkTheme}
                            renderContent={highlightSyntax}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Dialog>
                )}
              </>
            </div>
            <div className={classes.divider} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* AUTO UPDATE ANNOTATIONS */}
              <div style={{ display: "flex", flexDirection: "row" }}>
                {filter_v?.fv && (
                  <FormControlLabel
                    // style={{ marginLeft: "0.2rem", marginTop: "1rem" }}
                    className={classes.formControl}
                    disabled={!filter_v.active}
                    control={
                      <Switch
                        checked={filter_v.update_annotations}
                        size="small"
                        onChange={handleChangeUpdateAnnotations}
                        name="filterUpdateAnnotations"
                      />
                    }
                    label="Update auto-annotations every time an object passes the filter"
                  />
                )}
              </div>
              <div className={classes.divider} />
              {/* AUTO SAVE */}
              <div style={{ display: "flex", flexDirection: "row" }}>
                {filter_v?.fv && (
                  <FormControlLabel
                    className={classes.formControl}
                    disabled={!filter_v.active}
                    control={
                      <Switch
                        checked={
                          filter_v.autosave === true ||
                          filter_v.autosave?.active === true
                        }
                        size="small"
                        onChange={handleChangeAutosave}
                        name="filterAutosave"
                      />
                    }
                    label={
                      group?.name &&
                      `Automatically save all passing objects to ${group.name}`
                    }
                  />
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "end",
                  gap: "1rem",
                }}
              >
                {filter_v?.fv &&
                  (filter_v.autosave === true ||
                    filter_v.autosave?.active === true) && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenAutosaveFilter}
                        className={classes.button_add}
                      >
                        Autosave filter
                      </Button>
                      <Dialog
                        fullWidth
                        maxWidth="md"
                        open={openAutosaveFilter}
                        onClose={handleCloseAutosaveFilter}
                        aria-labelledby="max-width-dialog-title"
                      >
                        <DialogTitle id="max-width-dialog-title">
                          Save new autosave filter
                        </DialogTitle>
                        <form
                          onSubmit={handleSubmit(onSubmitSaveAutosaveFilter)}
                        >
                          <DialogContent>
                            <DialogContentText>
                              Kowalski filter definition. For a detailed
                              discussion, please refer to the&nbsp;
                              <a
                                href="https://docs.fritz.science/user_guide.html#alert-filters-in-fritz"
                                target="_blank"
                                rel="noreferrer"
                              >
                                docs
                              </a>
                            </DialogContentText>
                            <Controller
                              render={({ field: { onChange, value } }) => (
                                <TextareaAutosize
                                  maxRows={30}
                                  minRows={6}
                                  placeholder=""
                                  name="pipeline_autosave"
                                  style={{ width: "100%" }}
                                  ref={register("pipeline_autosave")}
                                  onChange={onChange}
                                  value={value}
                                />
                              )}
                              name="pipeline_autosave"
                              control={control}
                            />
                          </DialogContent>
                          <DialogActions>
                            <Button
                              variant="contained"
                              color="primary"
                              type="submit"
                              className={classes.button_add}
                            >
                              Save
                            </Button>
                            <Button
                              autoFocus
                              onClick={handleCloseAutosaveFilter}
                            >
                              Dismiss
                            </Button>
                          </DialogActions>
                        </form>
                      </Dialog>
                    </>
                  )}
                {filter_v?.fv &&
                  (filter_v.autosave === true ||
                    filter_v.autosave?.active === true) && (
                    <>
                      <TextField
                        className={classes.formControl}
                        disabled={!filter_v.active}
                        id="autosave-comment"
                        label="Autosave comment"
                        rows={1}
                        defaultValue={filter_v.autosave?.comment}
                        onChange={(event) =>
                          setAutosaveComment(event.target.value)
                        }
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleChangeAutosaveComment}
                        className={classes.button_add}
                      >
                        Save comment
                      </Button>
                    </>
                  )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "end",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {filter_v?.fv &&
                  (filter_v?.autosave?.active === true ||
                    filter_v?.autosave === true) && (
                    <div>
                      <InputLabel id="groupsSelectLabel">
                        {`Don't autosave if in groups (optional)`}
                      </InputLabel>
                      <Select
                        inputProps={{ MenuProps: { disableScrollLock: true } }}
                        labelId="groupsSelectLabel"
                        value={selectedIgnoreGroupIds}
                        onChange={onSubmitSaveAutosaveGroups}
                        name="autosaveGroupsSelect"
                        className={classes.allocationSelect}
                        multiple
                      >
                        {(userAccessibleGroups || []).map((target_group) => (
                          <MenuItem
                            value={target_group.id}
                            key={target_group.id}
                            className={classes.SelectItem}
                          >
                            {target_group.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "end",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {filter_v?.fv &&
                  (filter_v?.autosave?.active === true ||
                    filter_v?.autosave === true) &&
                  ((group?.group_users || []).filter(
                    (group_user) =>
                      group_user?.user_id === profile?.id &&
                      group_user?.admin === true,
                  ).length === 1 ||
                    (profile?.roles || []).includes("Super admin")) && (
                    <div>
                      <InputLabel id="saverSelectLabel">
                        Group user to use as the saver (optional, group admin
                        only)
                      </InputLabel>
                      <Select
                        inputProps={{ MenuProps: { disableScrollLock: true } }}
                        labelId="groupsSelectLabel"
                        value={selectedSaver}
                        onChange={onSubmitSaveAutosaveSaver}
                        name="autosaveSaverSelect"
                        className={classes.allocationSelect}
                      >
                        <MenuItem
                          value={"unassigned"}
                          key={"unassigned"}
                          className={classes.SelectItem}
                        >
                          Unassigned (use default)
                        </MenuItem>
                        {(group?.group_users || [])
                          .filter((group_user) => group_user.can_save === true)
                          .map((group_user) => (
                            <MenuItem
                              value={group_user.user_id}
                              key={group_user.id}
                              className={classes.SelectItem}
                            >
                              {(users || []).find(
                                (user) => user.id === group_user.user_id,
                              )?.username || "Loading..."}
                            </MenuItem>
                          ))}
                      </Select>
                    </div>
                  )}
              </div>
              <div className={classes.divider} />
              {/* AUTO FOLLOWUP */}
              <div style={{ display: "flex", flexDirection: "row" }}>
                {filter_v?.fv && (
                  <FormControlLabel
                    className={classes.formControl}
                    disabled={!filter_v.active}
                    control={
                      <Switch
                        checked={filter_v?.auto_followup?.active === true}
                        size="small"
                        onChange={handleChangeAutoFollowup}
                        name="filterAutoFollowup"
                      />
                    }
                    label={
                      group?.name &&
                      `Run auto followup filter too. Passing objects trigger followup requests`
                    }
                  />
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "end",
                  gap: "1rem",
                }}
              >
                {filter_v?.fv && filter_v?.auto_followup?.active === true && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleOpenAutoFollowupFilter}
                      className={classes.button_add}
                    >
                      Auto Followup Filter
                    </Button>
                    <Dialog
                      fullWidth
                      maxWidth="md"
                      open={openAutoFollowupFilter}
                      onClose={handleCloseAutoFollowupFilter}
                      aria-labelledby="max-width-dialog-title"
                    >
                      <DialogTitle id="max-width-dialog-title">
                        Save new auto followup filter
                      </DialogTitle>
                      <form
                        onSubmit={handleSubmit(onSubmitSaveAutoFollowupFilter)}
                      >
                        <DialogContent>
                          <DialogContentText>
                            Kowalski filter definition. For a detailed
                            discussion, please refer to the&nbsp;
                            <a
                              href="https://docs.fritz.science/user_guide.html#alert-filters-in-fritz"
                              target="_blank"
                              rel="noreferrer"
                            >
                              docs
                            </a>
                          </DialogContentText>
                          <Controller
                            render={({ field: { onChange, value } }) => (
                              <TextareaAutosize
                                maxRows={30}
                                minRows={6}
                                placeholder=""
                                name="pipeline_auto_followup"
                                style={{ width: "100%" }}
                                ref={register("pipeline_auto_followup")}
                                onChange={onChange}
                                value={value}
                              />
                            )}
                            name="pipeline_auto_followup"
                            control={control}
                          />
                        </DialogContent>
                        <DialogActions>
                          <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            className={classes.button_add}
                          >
                            Save
                          </Button>
                          <Button
                            autoFocus
                            onClick={handleCloseAutoFollowupFilter}
                          >
                            Dismiss
                          </Button>
                        </DialogActions>
                      </form>
                    </Dialog>
                  </>
                )}
                {filter_v?.fv && filter_v.auto_followup?.active === true && (
                  <>
                    <TextField
                      className={classes.formControl}
                      disabled={!filter_v.active}
                      id="auto_followup-comment"
                      label="Auto followup comment"
                      defaultValue={filter_v.auto_followup?.comment}
                      onChange={(event) =>
                        setAutoFollowupComment(event.target.value)
                      }
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleChangeAutoFollowupComment}
                      className={classes.button_add}
                    >
                      Save comment
                    </Button>
                  </>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  marginTop: "1rem",
                  alignItems: "end",
                  gap: "1rem",
                }}
              >
                {filter_v?.fv && filter_v?.auto_followup?.active === true && (
                  <>
                    <div>
                      <InputLabel id="allocationSelectLabel">
                        Allocation
                      </InputLabel>
                      <Select
                        inputProps={{ MenuProps: { disableScrollLock: true } }}
                        labelId="allocationSelectLabel"
                        value={selectedAllocationId}
                        onChange={onSubmitSaveAutoFollowupAllocation}
                        name="followupRequestAllocationSelect"
                        className={classes.allocationSelect}
                      >
                        {allocationListApiClassname?.map((allocation) => (
                          <MenuItem
                            value={allocation.id}
                            key={allocation.id}
                            className={classes.SelectItem}
                          >
                            {`${instLookUp[allocation.instrument_id]?.name} - ${
                              groupLookUp[allocation.group_id]?.name
                            } (PI ${allocation.pi})`}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                    {filter_v?.auto_followup?.allocation_id &&
                      selectedAllocationParams && (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleOpenAutoFollowupPayload}
                            className={classes.button_add}
                          >
                            Auto Followup Payload
                          </Button>
                          <Dialog
                            fullWidth
                            maxWidth="md"
                            open={openAutoFollowupPayload}
                            onClose={handleCloseAutoFollowupPayload}
                            aria-labelledby="max-width-dialog-title"
                          >
                            <DialogTitle id="max-width-dialog-title">
                              Save new auto followup payload
                            </DialogTitle>
                            <DialogContent>
                              <Typography
                                className={classes.big_font}
                                color="textSecondary"
                                gutterBottom
                              >
                                Current payload:
                              </Typography>
                              <Typography
                                className={classes.big_font}
                                color="textPrimary"
                                gutterBottom
                              >
                                {JSON.stringify(
                                  filter_v.auto_followup.payload,
                                  null,
                                  2,
                                )}
                              </Typography>
                              <InputLabel id="allocationSelectLabel">
                                Payload
                              </InputLabel>
                              <Form
                                schema={selectedAllocationParams.formSchema}
                                validator={validator}
                                uiSchema={selectedAllocationParams.uiSchema}
                                liveValidate
                                // customValidate={validate}
                                onSubmit={onSubmitSaveAutoFollowupPayload}
                                // disabled={isSubmitting}
                              />
                            </DialogContent>
                            <DialogActions>
                              <Button
                                autoFocus
                                onClick={handleCloseAutoFollowupPayload}
                              >
                                Dismiss
                              </Button>
                            </DialogActions>
                          </Dialog>
                        </>
                      )}
                  </>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "end",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {filter_v?.fv && filter_v?.auto_followup?.active === true && (
                  <div>
                    <InputLabel id="targetGroupsSelectLabel">
                      Target groups (optional, already includes the group of the
                      filter)
                    </InputLabel>
                    <Select
                      inputProps={{ MenuProps: { disableScrollLock: true } }}
                      labelId="targetGroupsSelectLabel"
                      value={selectedTargetGroupIds}
                      onChange={onSubmitSaveAutoFollowupGroups}
                      name="autoFollowupGroupsSelect"
                      className={classes.allocationSelect}
                      multiple
                    >
                      {(userAccessibleGroups || []).map((ignore_group) => (
                        <MenuItem
                          value={ignore_group.id}
                          key={ignore_group.id}
                          className={classes.SelectItem}
                        >
                          {ignore_group.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {filter_v?.fv && filter_v?.auto_followup?.active === true && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Typography id="autoFollowupGroupsSelectLabel">
                        Triggering constraints
                      </Typography>
                      <Tooltip title="Constraints are applied to triggers from the filter, cancelling them if they are met: classified (on SkyPortal or TNS), has spectra, has requests, ... but not only looking at the source of the alert, but anything within that radius.">
                        <IconButton size="small">
                          <HelpOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <InputLabel id="auto_followup_constraints_radius">
                        Radius (arcsec) to apply constraints
                      </InputLabel>
                      <TextField
                        labelId="auto_followup_constraints_radius"
                        className={classes.formControl}
                        disabled={!filter_v.active}
                        id="auto_followup_constraints_radius"
                        defaultValue={filter_v.auto_followup?.radius}
                        onChange={(event) =>
                          setAutoFollowupRadius(event.target.value)
                        }
                      />
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <InputLabel id="auto_followup_constraints_tns_age">
                        Cancel if TNS reported in the last N hours. Leave empty to disable
                      </InputLabel>
                      <TextField
                        labelId="auto_followup_constraints_tns_age"
                        className={classes.formControl}
                        disabled={!filter_v.active}
                        id="auto_followup_constraints_tns_age"
                        defaultValue={filter_v.auto_followup?.not_if_tns_reported}
                        onChange={(event) =>
                          setAutoFollowupTnsAge(event.target.value)
                        }
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "end",
                        gap: "1rem",
                        marginTop: "1rem",
                      }}
                    >
                      {filter_v?.fv &&
                        filter_v?.auto_followup?.active === true && (
                          <div>
                            <InputLabel id="ignoreAllocationSelectLabel">
                              Cancel if existing pending/completed triggers
                              with:
                            </InputLabel>
                            <Select
                              inputProps={{
                                MenuProps: { disableScrollLock: true },
                              }}
                              labelId="ignoreAllocationSelectLabel"
                              value={selectedIgnoreAllocationIds}
                              onChange={
                                onSubmitSaveAutoFollowupIgnoreAllocations
                              }
                              name="autoFollowupIgnoreAllocationsSelect"
                              className={classes.allocationSelect}
                              multiple
                            >
                              {allocationListApiClassname?.map((allocation) => (
                                <MenuItem
                                  value={allocation.id}
                                  key={allocation.id}
                                  className={classes.SelectItem}
                                >
                                  {`${instLookUp[allocation.instrument_id]?.name} - ${
                                    groupLookUp[allocation.group_id]?.name
                                  } (PI ${allocation.pi})`}
                                </MenuItem>
                              ))}
                            </Select>
                          </div>
                        )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "end",
                        gap: "1rem",
                        marginTop: "1rem",
                      }}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleChangeAutoFollowupConstraints}
                        className={classes.button_add}
                      >
                        Save Constraints
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </AccordionDetails>
        </Accordion>
      )}
    </div>
  );
};

FilterPlugins.propTypes = {
  group: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    group_users: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        user_id: PropTypes.number,
        roles: PropTypes.arrayOf(PropTypes.string),
        admin: PropTypes.bool,
      }),
    ),
  }).isRequired,
};

export default FilterPlugins;
