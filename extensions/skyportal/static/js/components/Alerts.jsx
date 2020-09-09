import React, { useState } from "react";
import { useHistory } from "react-router-dom";

import Typography from "@material-ui/core/Typography";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";

import TextField from "@material-ui/core/TextField";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";

import Grid from "@material-ui/core/Grid";

import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    "& > *": {
      margin: theme.spacing(1),
      // width: "25ch",
    },
  },
  container: {
    maxHeight: 440,
  },
  whitish: {
    color: "#f0f0f0",
  },
  visuallyHidden: {
    border: 0,
    clip: "rect(0 0 0 0)",
    height: 1,
    margin: -1,
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    top: 20,
    width: 1,
  },
  search_button: {
    color: "#f0f0f0 !important",
  },
  margin_bottom: {
    "margin-bottom": "2em",
  },
  margin_left: {
    "margin-left": "2em",
  },
  image: {
    padding: theme.spacing(1),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
  formControl: {
    margin: theme.spacing(1),
    width: "100%",
    // minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  header: {
    paddingBottom: 10,
  },
}));

const Alerts = () => {
  const classes = useStyles();
  const [stream, setStream] = useState("ztf");
  const [objectId, setObjectId] = useState("");

  const history = useHistory();

  const handleStreamChange = (event) => {
    setStream(event.target.value);
  };

  const handleObjectIdChange = (event) => {
    setObjectId(event.target.value);
  };

  const submitForm = () => {
    if (objectId.length > 0) {
      const path = `/alerts/${stream}/${objectId}`;
      history.push(path);
    }
  };

  return (
    <div>
      <Typography variant="h6" className={classes.header}>
        Search objects from alert streams
      </Typography>

      <Grid container spacing={2}>
        <Grid item sm={12} md={4}>
          <Card className={classes.root}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item sm={12} md={6}>
                  <FormControl required className={classes.formControl}>
                    <InputLabel id="alert-stream-select-required-label">
                      Alert stream
                    </InputLabel>
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

                <Grid item sm={12} md={6}>
                  <form className={classes.formControl} noValidate autoComplete="off">
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
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                color="primary"
                className={classes.search_button}
                onClick={submitForm}
              >
                Search
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

    </div>
  );
};

export default Alerts;
