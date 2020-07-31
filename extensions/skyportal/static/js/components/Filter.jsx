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

import ReactDiffViewer from 'react-diff-viewer';
import {useForm, Controller} from "react-hook-form";

import * as filterActions from '../ducks/filter';


const useStyles = makeStyles((theme) => ({
  paper: {
    width: "100%",
    padding: theme.spacing(1),
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
  pos: {
    marginBottom: 12,
  },
}));

const oldCode = `
[
  {
    "$match": {
      "candid": 1282486330015015001,
      "candidate.programid": {
        "$in": [1, 2, 3]
      }
    }
  },
  {
    "$lookup": {
      "from": "ZTF_alerts_aux",
      "localField": "objectId",
      "foreignField": "_id",
      "as": "aux"
    }
  }
]
`;
const newCode = `
[
  {
    "$match": {
      "candid": 1282486310015015001,
      "candidate.programid": {
        "$in": [1, 2]
      }
    }
  },
  {
    "$lookup": {
      "from": "ZTF_alerts_aux",
      "localField": "objectId",
      "foreignField": "_id",
      "as": "aux"
    }
  },
  {
    "$project": {
      "objectId": 1,
      "annotations.jd": "$t_now",
      "annotations.magnitude": "$m_now",
      "annotations.sgscore": "$sgscore",
      "annotations.peakmag": "$peakmag",
      "annotations.atpeak": {
        "$eq": [
          "$m_now", "$peakmag"
        ]
      },
      "annotations.age": "$age",
      "annotations.drb": "$drbscore"
    }
  }
]
`;

const Filter = ({route}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const {register, handleSubmit, control, errors} = useForm();

  const [filterLoadError, setFilterLoadError] = useState("");

  const theme = useTheme();
  const darkTheme = theme.palette.type === 'dark';

  const [expanded1, setExpanded1] = React.useState('panel1');

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
      // if (data.status === "error") {
      //   setFilterLoadError(data.message);
      // }
    };
    fetchFilterV();
  }, [fid, loadedId, dispatch]);

  const filter = useSelector((state) => state.filter);
  const filter_v = useSelector((state) => state.filter_v);
  const group = useSelector((state) => state.filter.group)
  const stream = useSelector((state) => state.filter.stream)

  // const [state, setState] = useState({
  //   filterActive: false,
  // });
  //
  // const handleChange = (event) => {
  //   setState({ ...state, [event.target.name]: event.target.checked });
  // };

  if (filterLoadError) {
    return (
      <div>
        {filterLoadError}
      </div>
    );
  }

  if (filter) {
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
                {/*<Button size="small">Learn More</Button>*/}
                <FormControlLabel style={{marginLeft: 5}}
                  // control={<Switch checked={filter_v.active} size="small" onChange={handleChange} name="filterActive"/>}
                  control={<Switch checked={filter_v.active} size="small" name="filterActive"/>}
                  label="Active"
                />
                <FormControl className={classes.formControl}>
                  <InputLabel id="alert-stream-select-required-label">Active version</InputLabel>
                  <Select
                    labelId="alert-stream-select-required-label"
                    id="alert-stream-select"
                    value={filter_v.active_fid}
                    // onChange={handleFidChange}
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
            <Grid container spacing={2}>
              <Grid item sm={12} md={10}>
                <TextareaAutosize
                  rowsMax={10000}
                  rowsMin={6}
                  placeholder="Filter definition (aggregation pipeline, see the docs)"
                  style={{width: "100%"}}
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
                  className={classes.button_add}
                >
                  Save
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <br/>

        <ReactDiffViewer
          oldValue={oldCode} newValue={newCode} splitView={true} useDarkTheme={darkTheme}
          leftTitle="Active version: nn6sun" rightTitle="Version: dropdown; make active"
        />
      </div>
    );
  }
}

export default Filter;