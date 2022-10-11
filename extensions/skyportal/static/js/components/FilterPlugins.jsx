import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import Paper from "@mui/material/Paper";
import { useTheme } from "@mui/material/styles";
import makeStyles from '@mui/styles/makeStyles';
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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import {CopyToClipboard} from 'react-copy-to-clipboard';


import ReactDiffViewer from "react-diff-viewer";
import { useForm } from "react-hook-form";
import { showNotification } from "baselayer/components/Notifications";

import * as filterVersionActions from "../ducks/kowalski_filter";

const useStyles = makeStyles((theme) => ({
  pre: {
    lineHeight: 8
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
    position: 'relative',
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

const FilterPlugins = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { register, handleSubmit } = useForm();

  const theme = useTheme();
  const darkTheme = theme.palette.mode === "dark";

  const filter = useSelector((state) => state.filter);
  const filter_v = useSelector((state) => state.filter_v);
  const { fid } = useParams();
  const loadedId = useSelector((state) => state.filter.id);

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
      })
    );
    if (result.status === "success") {
      dispatch(showNotification(`Set update_annotations to ${target}`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleChangeAutosave = async (event) => {
    const target = event.target.checked;
    const result = await dispatch(
      filterVersionActions.editAutosave({
        filter_id: filter.id,
        autosave: target,
      })
    );
    if (result.status === "success") {
      dispatch(showNotification(`Set autosave to ${target}`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  const handleChangeActiveFilter = async (event) => {
    const active_target = event.target.checked;
    const result = await dispatch(
      filterVersionActions.editActiveFilterVersion({
        filter_id: filter.id,
        active: active_target,
      })
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
      })
    );
    if (result.status === "success") {
      dispatch(showNotification(`Set active filter ID to ${activeFidTarget}`));
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  // forms
  const [openNew, setOpenNew] = React.useState(false);
  const [openDiff, setOpenDiff] = React.useState(false);

  // save new filter version
  const onSubmitSaveFilterVersion = async (data) => {
    const result = await dispatch(
      filterVersionActions.addFilterVersion({
        filter_id: filter.id,
        pipeline: data.pipeline,
      })
    );
    if (result.status === "success") {
      dispatch(showNotification(`Saved new filter version`));
      setOpenNew(false);
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

  // renders
  if (!filter_v) {
    return (
      <div>
        <CircularProgress color="secondary" />
      </div>
    );
  }

  const highlightSyntax = str => (
    <pre
      style={{ display: 'inline', fontSize: "0.75rem", fontFamily: "Lucida Console, sans-serif" }}
      dangerouslySetInnerHTML={{
        __html: str
      }}
    />
  );
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
              <div className={classes.infoLine}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNew}
                  style={{ marginRight: 10 }}
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
                  <DialogTitle id="max-width-dialog-title">Save new filter version</DialogTitle>
                  <form onSubmit={handleSubmit(onSubmitSaveFilterVersion)}>
                    <DialogContent>
                      <DialogContentText>
                        Kowalski filter definition. For a detailed discussion, please refer to the&nbsp;
                        <a href="https://docs.fritz.science/user_guide.html#alert-filters-in-fritz" target="_blank" rel="noreferrer">docs</a>
                      </DialogContentText>
                      <TextareaAutosize
                        maxRows={30}
                        minRows={6}
                        placeholder=""
                        name="pipeline"
                        style={{ width: "100%" }}
                        ref={register}
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
                {
                  filter_v?.fv &&
                  (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleDiff}
                      style={{marginRight: 10}}
                    >
                      Inspect versions/diff
                    </Button>
                  )
                }
                {
                  filter_v?.fv &&
                  (
                    <Dialog fullScreen open={openDiff} onClose={handleCloseDiff}>
                      <AppBar className={classes.appBar}>
                        <Toolbar>
                          <IconButton
                            edge="start"
                            color="inherit"
                            onClick={handleCloseDiff}
                            aria-label="close"
                            size="large">
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
                              <FormHelperText>Select version to diff</FormHelperText>
                            </FormControl>
                            {otherVersion.length > 0 && (
                              <CopyToClipboard text={
                                JSON.stringify(
                                  JSON.parse(
                                    filter_v.fv.filter((fv) => fv.fid === otherVersion)[0]
                                      .pipeline
                                  ),
                                  null,
                                  2
                                )
                              }
                              >
                                <IconButton
                                  color="primary"
                                  aria-label="Copy def to clipboard"
                                  className={classes.marginTop}
                                  size="large">
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
                              <CopyToClipboard text={JSON.stringify(
                                JSON.parse(
                                  filter_v.fv.filter(
                                    (fv) => fv.fid === filter_v.active_fid
                                  )[0].pipeline
                                ),
                                null,
                                2
                              )}
                              >
                                <IconButton color="primary" aria-label="Copy def to clipboard" size="large">
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
                                    (fv) => fv.fid === filter_v.active_fid
                                  )[0].pipeline
                                ),
                                null,
                                2
                              )}
                              oldValue={
                                otherVersion.length > 0
                                  ? JSON.stringify(
                                  JSON.parse(
                                    filter_v.fv.filter((fv) => fv.fid === otherVersion)[0]
                                      .pipeline
                                  ),
                                  null,
                                  2
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
                  )
                }
              </div>
              {
                filter_v?.fv &&
                (
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
                )
              }
              {
                filter_v?.fv &&
                (
                  <div className={classes.infoLine}>
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
                  </div>
                )
              }
              {
                filter_v?.fv &&
                (
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
                )
              }
              {
                filter_v?.fv &&
                (
                  <FormControlLabel
                    className={classes.formControl}
                    disabled={!filter_v.active}
                    control={
                      <Switch
                        checked={filter_v.autosave}
                        size="small"
                        onChange={handleChangeAutosave}
                        name="filterAutosave"
                      />
                    }
                    label={group?.name && `Automatically save all passing objects to ${group.name}`}
                  />
                )
              }
            </AccordionDetails>
          </Accordion>
        )}
    </div>
  );
};

export default FilterPlugins;
