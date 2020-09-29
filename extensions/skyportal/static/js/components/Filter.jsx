import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";

import Paper from "@material-ui/core/Paper";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import FormHelperText from "@material-ui/core/FormHelperText";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Grid from "@material-ui/core/Grid";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import Typography from "@material-ui/core/Typography";
import TextareaAutosize from "@material-ui/core/TextareaAutosize";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CircularProgress from "@material-ui/core/CircularProgress";

import ReactDiffViewer from "react-diff-viewer";
import { useForm } from "react-hook-form";
import { showNotification } from "baselayer/components/Notifications";

import * as groupActions from "../ducks/group";
import * as filterActions from "../ducks/filter";
import * as filterVersionActions from "../ducks/kowalski_filter";

const useStyles = makeStyles((theme) => ({
  paper: {
    width: "100%",
    padding: theme.spacing(1),
    textAlign: "left",
    color: theme.palette.text.primary,
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
  button_add: {
    maxWidth: "8.75rem",
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: "12rem",
  },
  selectEmpty: {
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
  title: {
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

const Filter = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { register, handleSubmit } = useForm();

  const [filterLoadError, setFilterLoadError] = useState("");
  const [filterVersionLoadError, setFilterVersionLoadError] = useState("");
  const [groupLoadError, setGroupLoadError] = useState("");

  const theme = useTheme();
  const darkTheme = theme.palette.type === "dark";

  const [panelExpanded, setPanelExpanded] = React.useState(false);

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setPanelExpanded(isExpanded ? panel : false);
  };

  const { fid } = useParams();
  const loadedId = useSelector((state) => state.filter.id);

  useEffect(() => {
    const fetchFilter = async () => {
      const data = await dispatch(filterActions.fetchFilter(fid));
      if (data.status === "error") {
        setFilterLoadError(data.message);
      }
    };
    if (loadedId !== fid) {
      fetchFilter();
    }
  }, [fid, loadedId, dispatch]);

  useEffect(() => {
    const fetchFilterVersion = async () => {
      const data = await dispatch(filterVersionActions.fetchFilterVersion(fid));
      if (data.status === "error" && !data.message.includes("not found")) {
        setFilterVersionLoadError(data.message);
        if (filterVersionLoadError.length > 1) {
          dispatch(showNotification(filterVersionLoadError, "error"));
        }
      }
    };
    if (loadedId !== fid) {
      fetchFilterVersion();
    }
  }, [fid, loadedId, dispatch, filterVersionLoadError]);

  const group_id = useSelector((state) => state.filter.group_id);

  useEffect(() => {
    const fetchGroup = async () => {
      const data = await dispatch(groupActions.fetchGroup(group_id));
      if (data.status === "error") {
        setGroupLoadError(data.message);
        if (groupLoadError.length > 1) {
          dispatch(showNotification(groupLoadError, "error"));
        }
      }
    };
    if (group_id) fetchGroup();
  }, [group_id, dispatch, groupLoadError]);

  const filter = useSelector((state) => state.filter);
  const filter_v = useSelector((state) => state.filter_v);
  const group = useSelector((state) => state.group);
  const stream = useSelector((state) => state.filter.stream);

  const [otherVersion, setOtherVersion] = React.useState("");

  const handleSelectFilterVersionDiff = (event) => {
    setOtherVersion(event.target.value);
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
    }
    dispatch(filterVersionActions.fetchFilterVersion(fid));
  };

  if (filterLoadError) {
    return <div>{filterLoadError}</div>;
  }

  // renders
  if (!filter || !filter_v) {
    return (
      <div>
        <CircularProgress color="secondary" />
      </div>
    );
  }

  return (
    <div>
      <Typography variant="h6" className={classes.header}>
        Filter:&nbsp;&nbsp;
        {filter.name}
      </Typography>

      <Grid container spacing={2}>
        <Grid item sm={12} md={4}>
          <Card className={classes.root}>
            <CardContent>
              {group && stream && (
                <Typography
                  className={classes.title}
                  color="textSecondary"
                  gutterBottom
                >
                  Group: <Link to={`/group/${group.id}`}>{group.name}</Link>
                  <br />
                  {/* Group id: {group.id} */}
                  Stream: {stream.name}
                </Typography>
              )}
            </CardContent>
            {filter_v && filter_v.catalog && (
              <CardActions>
                <FormControlLabel
                  style={{ marginLeft: 5 }}
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
                <FormControl className={classes.formControl}>
                  <InputLabel id="alert-stream-select-required-label">
                    Active version
                  </InputLabel>
                  <Select
                    labelId="alert-stream-select-required-label"
                    id="alert-stream-select"
                    value={filter_v.active_fid}
                    onChange={handleFidChange}
                    className={classes.selectEmpty}
                  >
                    {filter_v.fv.map((fv) => (
                      <MenuItem key={fv.fid} value={fv.fid}>
                        {fv.fid}: {fv.created_at.slice(0, 19)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardActions>
            )}
          </Card>
        </Grid>
        {/* /!* Filter stats go here? *!/ */}
        {/* <Grid item sm={12} md={9}> */}
        {/* </Grid> */}
      </Grid>

      <br />

      <Accordion
        expanded={panelExpanded === "panel"}
        onChange={handlePanelChange("panel")}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel-content"
          id="panel-header"
        >
          <Typography className={classes.heading}>Save new version</Typography>
        </AccordionSummary>
        <AccordionDetails className={classes.accordion_details}>
          <form onSubmit={handleSubmit(onSubmitSaveFilterVersion)}>
            <Grid container spacing={2}>
              <Grid item sm={12} md={10}>
                <TextareaAutosize
                  rowsMax={10000}
                  rowsMin={6}
                  placeholder="Filter definition (please refer to the docs at
                  https://fritz-marshal.org/doc/user_guide.html#alert-filters-in-fritz))"
                  name="pipeline"
                  style={{ width: "100%" }}
                  ref={register}
                />
              </Grid>
              <Grid item sm={12} md={2}>
                {/* <Button */}
                {/*  variant="outlined" */}
                {/*  color="primary" */}
                {/*  className={classes.button_add} */}
                {/*  style={{ marginRight: 5 }} */}
                {/* > */}
                {/*  Test */}
                {/* </Button> */}
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  className={classes.button_add}
                >
                  Save
                </Button>
              </Grid>
            </Grid>
          </form>
        </AccordionDetails>
      </Accordion>

      <br />

      {filter_v && filter_v.active_fid && (
        <Paper className={classes.paper}>
          <Typography className={classes.heading}>Versions/diff</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} align="center">
              <FormControl className={classes.formControl}>
                <Select
                  labelId="fv-diff-label"
                  id="fv-diff"
                  name="filter_diff"
                  value={otherVersion}
                  onChange={handleSelectFilterVersionDiff}
                  className={classes.selectEmpty}
                >
                  {filter_v.fv.map((fv) => (
                    <MenuItem key={fv.fid} value={fv.fid}>
                      {fv.fid}: {fv.created_at.slice(0, 19)}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select version to diff</FormHelperText>
              </FormControl>
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
              />
            </Grid>
          </Grid>
        </Paper>
      )}
    </div>
  );
};

export default Filter;
