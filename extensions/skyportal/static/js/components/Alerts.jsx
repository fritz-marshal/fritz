import React from "react";

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
import CircularProgress from "@material-ui/core/CircularProgress";

import {useDispatch, useSelector} from "react-redux";

import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import ThumbnailList from "./ThumbnailList";
import {dec_to_dms, ra_to_hours} from "../units";
import { showNotification } from "baselayer/components/Notifications";

import * as Actions from "../ducks/alerts";

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

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
  button: {
    textTransform: "none",
  },
  wrapperRoot: {
    display: 'flex',
    alignItems: 'center',
  },
  wrapper: {
    margin: theme.spacing(1),
    position: 'relative',
  },
  buttonProgress: {
    color: theme.palette.text.secondary,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  grid_item_table: {
    order: 2,
    [theme.breakpoints.up('lg')]: {
      order: 1,
    },
  },
  grid_item_search_box: {
    order: 1,
    [theme.breakpoints.up('lg')]: {
      order: 2,
    },
  },
}));

const Alerts = () => {
  const dispatch = useDispatch();
  const classes = useStyles();

  const theme = useTheme();
  const darkTheme = theme.palette.type === "dark";

  const { alerts, queryInProgress } = useSelector((state) => state.alerts);

  const makeRow = (alert) => ({
      objectId: alert?.objectId,
      candid: alert?.candid,
      jd: alert?.candidate.jd,
      ra: alert?.candidate.ra,
      dec: alert?.candidate.dec,
      fid: alert?.candidate.fid,
      magpsf: alert?.candidate.magpsf,
      sigmapsf: alert?.candidate.sigmapsf,
      programid: alert?.candidate.programid,
      isdiffpos: alert?.candidate.isdiffpos,
      drb: alert?.candidate.drb,
      acai_h: alert?.classifications?.acai_h,
      acai_n: alert?.classifications?.acai_n,
      acai_o: alert?.classifications?.acai_o,
      acai_v: alert?.classifications?.acai_v,
      acai_b: alert?.classifications?.acai_b,
    });

  let rows = [];

  if (alerts !== null && !isString(alerts) && Array.isArray(alerts)) {
    rows = alerts.map((a) => makeRow(a));
  }

  // This is just passed to MUI datatables options -- not meant to be instantiated directly.
  const renderPullOutRow = (rowData, rowMeta) => {
    const colSpan = rowData.length + 1;
    const alertData = alerts[rowMeta.dataIndex];
    const thumbnails = [
      {
        type: "new",
        id: 0,
        public_url: `/api/alerts_cutouts/${alertData.objectId}?candid=${alertData.candid}&cutout=science`,
      },
      {
        type: "ref",
        id: 1,
        public_url: `/api/alerts_cutouts/${alertData.objectId}?candid=${alertData.candid}&cutout=template`,
      },
      {
        type: "sub",
        id: 2,
        public_url: `/api/alerts_cutouts/${alertData.objectId}?candid=${alertData.candid}&cutout=difference`,
      },
    ];

    return (
      <TableRow data-testid={`alertRow_${alertData.candid}`}>
        <TableCell
          style={{ paddingBottom: 0, paddingTop: 0 }}
          colSpan={colSpan}
        >
          <Grid
            container
            direction="row"
            spacing={3}
            justify="center"
            alignItems="center"
          >
            <Grid item>
              <ThumbnailList
                thumbnails={thumbnails}
                ra={alertData.candidate.ra}
                dec={alertData.candidate.dec}
                displayTypes={["new", "ref", "sub"]}
              />
            </Grid>
          </Grid>
        </TableCell>
      </TableRow>
    );
  };

  const options = {
    selectableRows: "none",
    expandableRows: true,
    expandableRowsOnClick: true,
    renderExpandableRow: renderPullOutRow,
    elevation: 1,
    sortOrder: {
      name: "jd",
      direction: "desc",
    },
  };

  const columns = [
    {
      name: "objectId",
      label: "Object ID",
      options: {
        filter: true,
        sort: true,
        sortDescFirst: true,
        customBodyRender: (value, tableMeta, updateValue) => (
          <a
            href={`/alerts/ztf/${value}`}
            target="_blank"
            data-testid={value}
            rel="noreferrer"
          >
            <Button className={classes.button} size="small" variant="contained">
              {value}
            </Button>
          </a>
        ),
      },
    },
    {
      name: "candid",
      label: "candid",
      options: {
        filter: false,
        display: false,
        sort: true,
      },
    },
    {
      name: "jd",
      label: "JD",
      options: {
        filter: false,
        sort: true,
        sortDescFirst: true,
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(5),
      },
    },
    {
      name: "ra",
      label: "R.A.",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => ra_to_hours(value, ":"),
      },
    },
    {
      name: "dec",
      label: "Decl.",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => dec_to_dms(value, ":"),
      },
    },
    {
      name: "fid",
      label: "fid",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "magpsf",
      label: "magpsf",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(3),
      },
    },
    {
      name: "sigmapsf",
      label: "sigmapsf",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(3),
      },
    },
    {
      name: "programid",
      label: "programid",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "isdiffpos",
      label: "isdiffpos",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "drb",
      label: "drb",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_h",
      label: "acai_h",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_n",
      label: "acai_n",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_o",
      label: "acai_o",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_v",
      label: "acai_v",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_b",
      label: "acai_b",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
  ];

  const { register: registerForm, handleSubmit: handleSubmitForm, control: controlForm } = useForm();

  const submitSearch = (data) => {
    const {object_id, ra, dec, radius} = data;
    // check that if positional query is requested then all required data are supplied
    if ((ra.length || dec.length || radius.length) && !(ra.length && dec.length && radius.length)) {
      dispatch(showNotification(`Positional parameters, if specified, must be all set`, "error"));
    }
    else {
      dispatch(Actions.fetchAlerts({ object_id, ra, dec, radius }));
    }
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
                    {queryInProgress ? <CircularProgress /> : (
                      <MUIDataTable
                        title="Alerts"
                        data={rows}
                        columns={columns}
                        options={options}
                      />
                    )}
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
                  <div className={classes.wrapperRoot}>
                    <div className={classes.wrapper}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={queryInProgress}
                      >
                        Search
                      </Button>
                      {queryInProgress && <CircularProgress size={24} color="secondary" className={classes.buttonProgress} />}
                    </div>
                  </div>
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
