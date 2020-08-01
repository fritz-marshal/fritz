import React, {useEffect, useState, Suspense} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Link, useParams} from 'react-router-dom';

import Paper from '@material-ui/core/Paper';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Grid from '@material-ui/core/Grid';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import TextareaAutosize from '@material-ui/core/TextareaAutosize';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Button from '@material-ui/core/Button';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';

import ReactDiffViewer from 'react-diff-viewer';
import {useForm, Controller} from "react-hook-form";

import * as filterActions from '../ducks/filter';


const useStyles = makeStyles((theme) => ({
  paper: {
    width: "100%",
    padding: theme.spacing(2),
    textAlign: 'left',
    color: theme.palette.text.primary,
  },
  nested: {
    paddingLeft: theme.spacing(2),
  },
  heading: {
    fontSize: theme.typography.pxToRem(17),
    fontWeight: 500,
  },
  accordion_details: {
    flexDirection: "column"
  },
  button_add: {
    maxWidth: "120px"
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  root: {
    minWidth: 275,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  big_font: {
    fontSize: 16,
  },
  pos: {
    marginBottom: 12,
  },
}));


const Filter = ({route}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const {register, handleSubmit, control, errors} = useForm();

  const [filterLoadError, setFilterLoadError] = useState("");

  const theme = useTheme();
  const darkTheme = theme.palette.type === 'dark';

  const [expanded1, setExpanded1] = React.useState(false);  // 'panel1'

  const handleChange1 = (panel) => (event, isExpanded) => {
    setExpanded1(isExpanded ? panel : false);
  };

  // const filter_id = route.fid;

  const {fid} = useParams();
  const loadedId = useSelector((state) => state.filter.id);

  useEffect(() => {
    const fetchFilter = async () => {
      const data = await dispatch(filterActions.fetchFilter(fid));
      if (data.status === "error") {
        setFilterLoadError(data.message);
      }
    };
    fetchFilter();
  }, [fid, loadedId, dispatch]);

  useEffect(() => {
    const fetchFilterV = async () => {
      const data = await dispatch(filterActions.fetchFilterV(fid));
    };
    fetchFilterV();
  }, [fid, loadedId, dispatch]);

  const filter = useSelector((state) => state.filter);
  const filter_v = useSelector((state) => state.filter_v);
  const group = useSelector((state) => state.filter.group)
  const stream = useSelector((state) => state.filter.stream)

  const [otherVersion, setOtherVersion] = React.useState("");

  const handleSelectFilterVersionDiff = (event) => {
    setOtherVersion(event.target.value)
  };

  const handleActive = (event) => {
    dispatch(filterActions.editActiveFilterV({"filter_id": filter.id, "active": event.target.checked}));
    dispatch(filterActions.fetchFilterV(fid));
  };

  const handleFidChange = (event) => {
    dispatch(filterActions.editActiveFidFilterV({"filter_id": filter.id, "active_fid": event.target.value}));
    dispatch(filterActions.fetchFilterV(fid));
  };

  // forms
  // add stream to group
  const onSubmitSaveFilterVersion = data => {
    dispatch(filterActions.addFilterV({"filter_id": filter.id, "pipeline": data.pipeline}));
    dispatch(filterActions.fetchFilterV(fid));
  };

  if (filterLoadError) {
    return (
      <div>
        {filterLoadError}
      </div>
    );
  }

  if (filter && filter_v) {

    return (
      <div>
        <Typography variant="h5" style={{paddingBottom: 10}}>
          Filter:&nbsp;&nbsp;{filter.name}
        </Typography>

        <Grid container spacing={2}>
          <Grid item sm={12} md={3}>
            <Card className={classes.root}>
              <CardContent>
                {
                 (group) && (stream) &&
                  <Typography className={classes.title} color="textSecondary" gutterBottom>
                    Group: <Link to={`/group/${group.id}`}>{group.name}</Link><br />
                    {/*Group id: {group.id}*/}
                    Stream: {stream.name}
                  </Typography>
                }
              </CardContent>
              {
                (filter_v) && (filter_v.catalog) &&
                <CardActions>
                {/*<Button size="small">Delete</Button>*/}
                <FormControlLabel style={{marginLeft: 5}}
                  control={<Switch checked={filter_v.active} size="small" onChange={handleActive} name="filterActive"/>}
                  label="Active"
                />
                <FormControl className={classes.formControl}>
                  <InputLabel id="alert-stream-select-required-label">Active version id</InputLabel>
                  <Select
                    labelId="alert-stream-select-required-label"
                    id="alert-stream-select"
                    value={filter_v.active_fid}
                    onChange={handleFidChange}
                    className={classes.selectEmpty}
                  >
                    {
                      filter_v.fv.map((fv) => (
                        <MenuItem value={fv.fid}>{fv.fid}</MenuItem>
                      ))
                    }
                  </Select>
                  {/*<FormHelperText>Required</FormHelperText>*/}
                </FormControl>
              </CardActions>
              }
            </Card>
          </Grid>
          {/*/!* Filter stats go here? *!/*/}
          {/*<Grid item sm={12} md={9}>*/}
          {/*</Grid>*/}
        </Grid>


        <br/>

        <Accordion
          expanded={expanded1 === 'panel1'} onChange={handleChange1('panel1')}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon/>}
            aria-controls="panel1a-content"
            id="panel1a-header"
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
                    placeholder="Filter definition (please refer to the docs)"
                    name="pipeline"
                    style={{width: "100%"}}
                    ref={register}
                  />
                </Grid>
                <Grid item sm={12} md={2}>
                  <Button
                    variant="outlined"
                    color="primary"
                    className={classes.button_add}
                    style={{marginRight: 5}}
                  >
                    Test
                  </Button>
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

        <br/>

        {
          (filter_v) && (filter_v.active_fid) &&
          <Paper className={classes.paper}>
            <Typography className={classes.heading}>Versions/diff</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} align="center">
                {/*<Divider orientation="vertical" flexItem />*/}
                <FormControl className={classes.formControl}>
                  {/*<InputLabel id="fv-diff-label">Other version</InputLabel>*/}
                  <Select
                    labelId="fv-diff-label"
                    id="fv-diff"
                    name="filter_diff"
                    // defaultValue={filter_v.active_fid}
                    value={otherVersion}
                    onChange={handleSelectFilterVersionDiff}
                    className={classes.selectEmpty}
                  >
                    {
                      filter_v.fv.map((fv) => (
                        (fv.fid !== filter_v.active_fid) &&
                        <MenuItem value={fv.fid}>{fv.fid}</MenuItem>
                      ))
                    }
                  </Select>
                  <FormHelperText>Select version id to diff</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={6} align="center">
                <Typography className={classes.big_font} color="textSecondary" gutterBottom style={{paddingTop: 20}}>
                  {`Active version id: ${filter_v.active_fid}`}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <ReactDiffViewer
                  newValue={filter_v.fv.filter(fv => fv.fid === filter_v.active_fid)[0].pipeline}
                  oldValue={
                    otherVersion.length > 0 ?
                      filter_v.fv.filter(fv => fv.fid === otherVersion)[0].pipeline :
                      otherVersion
                  }
                  splitView={true}
                  showDiffOnly={false}
                  useDarkTheme={darkTheme}
                />
              </Grid>
            </Grid>
          </Paper>
        }

      </div>
    );
  }
}

export default Filter;