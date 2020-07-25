import React, {useEffect, useState, Suspense} from 'react';
import {useDispatch, useSelector} from 'react-redux';

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

import ReactDiffViewer from 'react-diff-viewer';

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

  const theme = useTheme();
  const darkTheme = theme.palette.type === 'dark';

  const [expanded1, setExpanded1] = React.useState('panel1');

  const handleChange1 = (panel) => (event, isExpanded) => {
    setExpanded1(isExpanded ? panel : false);
  };

  const filter_id = route.id;

  const [state, setState] = useState({
    checkedA: true,
  });

  const handleChange = (event) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };

  return (
    <div>
      <h2>
        Filter: GREEN TRANSIENTS
      </h2>
      <Paper className={classes.paper}>
        <Grid container spacing={2}>
          <Grid item sm={12} md={6}>
            Group: Program A
            <br />
            Alert stream: ZTF
            <br />
            Permissions: [1, 2]
          </Grid>
          <Grid item sm={12} md={6}>
            <FormGroup row>
              <FormControlLabel
                control={<Switch checked={state.checkedA} onChange={handleChange} name="checkedA" />}
                label="Active"
              />
              <FormControl required className={classes.formControl}>
                <InputLabel id="alert-stream-select-required-label">Active version</InputLabel>
                <Select
                  labelId="alert-stream-select-required-label"
                  id="alert-stream-select"
                  value="nn6sun"
                  // onChange={handleFidChange}
                  className={classes.selectEmpty}
                >
                  <MenuItem value="nn6sun">nn6sun</MenuItem>
                  <MenuItem value="aelulu">aelulu</MenuItem>
                  <MenuItem value="vgh6sg">vgh6sg</MenuItem>
                </Select>
                <FormHelperText>Required</FormHelperText>
              </FormControl>
            </FormGroup>
          </Grid>
        </Grid>
      </Paper>

      <Accordion
        expanded={expanded1 === 'panel1'} onChange={handleChange1('panel1')}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
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
                variant="contained"
                color="primary"
                className={classes.button_add}
              >
                Test
              </Button>
              <br /><br />
              <Button
                variant="contained"
                color="primary"
                disabled={true}
                className={classes.button_add}
              >
                Save
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <br />

      <ReactDiffViewer
        oldValue={oldCode} newValue={newCode} splitView={true} useDarkTheme={darkTheme}
        leftTitle="Active version: nn6sun" rightTitle="Version: dropdown; make active"
      />
    </div>
  );
}

export default Filter;