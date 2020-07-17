import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import TextField from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

import Grid from '@material-ui/core/Grid';

import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';


const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& > *': {
      margin: theme.spacing(1),
      width: '25ch',
    },
  },
  container: {
    maxHeight: 440,
  },
  whitish: {
    color: "#f0f0f0"
  },
  visuallyHidden: {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    top: 20,
    width: 1,
  },
  search_button: {
    margin: theme.spacing(1),
    color: "#f0f0f0 !important"
  },
  margin_bottom: {
    "margin-bottom": "2em",
  },
  margin_left: {
    "margin-left": "2em",
  },
  image: {
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
}));


const Alerts = () => {
  const classes = useStyles();
  const [stream, setStream] = useState('ztf');
  const [objectId, setObjectId] = useState('');

  const handleStreamChange = (event) => {
    setStream(event.target.value);
  };

  const handleObjectIdChange = (event) => {
    setObjectId(event.target.value);
  };


  return (
    <div>
      <h2>
        Search objects from alert streams
      </h2>

      <Grid container spacing={2}>
        <Grid item sm={12} md={2}>
          <FormControl required className={classes.formControl}>
            <InputLabel id="alert-stream-select-required-label">Alert stream</InputLabel>
            <Select
              labelId="alert-stream-select-required-label"
              id="alert-stream-select"
              value={stream}
              onChange={handleStreamChange}
              className={classes.selectEmpty}
            >
              <MenuItem value="ztf">ZTF</MenuItem>
            </Select>
            <FormHelperText>Required</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item sm={12} md={4}>
          <form className={classes.root} noValidate autoComplete="off">
            <TextField
              required
              error={objectId.length === 0}
              id="objectId"
              label="objectId"
              helperText="Required"
              onChange={handleObjectIdChange}
            />
          </form>
        </Grid>

      </Grid>

      <Button
        component={Link}
        to={`/alerts/${stream}/${objectId}`}
        variant="contained"
        color="primary"
        className={classes.search_button}
      >
        Search
      </Button>

    </div>
  );
};

export default Alerts;
