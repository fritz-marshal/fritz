import React from "react";
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
import {createMuiTheme, makeStyles, MuiThemeProvider, useTheme} from "@material-ui/core/styles";
import { useForm, Controller } from "react-hook-form";
import Paper from "@material-ui/core/Paper";
import MUIDataTable from "mui-datatables";

const getMuiTheme = (theme) =>
  createMuiTheme({
    palette: theme.palette,
    overrides: {
      MUIDataTableBodyCell: {
        root: {
          padding: `${theme.spacing(0.25)}px 0px ${theme.spacing(
            0.25
          )}px ${theme.spacing(1)}px`,
        },
      },
    },
  });

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    "& > *": {
      margin: theme.spacing(1),
    },
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
    width: "100%",
  },
  selectEmpty: {
    width: "100%",
  },
  header: {
    paddingBottom: "0.625rem",
  },
  grid_item_table: {
    order: 1,
    [theme.breakpoints.down('lg')]: {
      order: 2,
    },
  },
  grid_item_search_box: {
    order: 2,
    [theme.breakpoints.down('md')]: {
      order: 1,
    },
  },
}));

const Alerts = () => {
  const classes = useStyles();

  const theme = useTheme();
  const darkTheme = theme.palette.type === "dark";

  const history = useHistory();

  const { register: registerForm, handleSubmit: handleSubmitForm, control: controlForm } = useForm();

  const submitSearch = (data) => {
    console.log(data);
  };

  return (
    <>
      <div>
        <Grid
          container
          direction="row"
          justify="flex-start"
          alignItems="flex-start"
          spacing={1}
        >
          <Grid item xs={12} lg={10} className={classes.grid_item_table}>
            <Paper elevation={1}>
              <div className={classes.maindiv}>
                <div className={classes.accordionDetails}>
                  <MuiThemeProvider theme={getMuiTheme(theme)}>
                    <MUIDataTable
                      title="Objects from alert streams"
                    />
                  </MuiThemeProvider>
                </div>
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={2} className={classes.grid_item_search_box}>
            <Card className={classes.root}>
              <form onSubmit={handleSubmitForm(submitSearch)}>
                <CardContent>
                  <FormControl required className={classes.selectEmpty}>
                    <InputLabel name="alert-stream-select-required-label">
                      Instrument
                    </InputLabel>
                    <Controller
                      labelId="alert-stream-select-required-label"
                      name="instrument"
                      as={Select}
                      defaultValue="ztf"
                      control={controlForm}
                      rules={{ required: true }}
                    >
                      <MenuItem value="ztf">ZTF</MenuItem>
                    </Controller>
                    <FormHelperText>Required</FormHelperText>
                  </FormControl>
                  <TextField
                    autoFocus
                    margin="dense"
                    name="object_id"
                    label="objectId"
                    type="text"
                    fullWidth
                    inputRef={registerForm({ minLength: 3, required: false })}
                  />
                  <TextField
                    margin="dense"
                    name="ra"
                    label="R.A. (deg)"
                    fullWidth
                    inputRef={registerForm({ required: false })}
                  />
                  <TextField
                    margin="dense"
                    name="dec"
                    label="Decl. (deg)"
                    fullWidth
                    inputRef={registerForm({ required: false })}
                  />
                  <TextField
                    margin="dense"
                    name="radius"
                    label="Radius (arcsec)"
                    fullWidth
                    inputRef={registerForm({ required: false })}
                  />
                </CardContent>
                <CardActions>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    className={classes.button_add}
                  >
                    Search
                  </Button>
                </CardActions>
              </form>
            </Card>
          </Grid>
        </Grid>
      </div>
    </>
  );
};

export default Alerts;
