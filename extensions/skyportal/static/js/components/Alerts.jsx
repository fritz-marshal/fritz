import React, {useState} from "react";

import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";

import TextField from "@mui/material/TextField";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";

import Grid from "@mui/material/Grid";

import {
  createTheme,
  ThemeProvider,
  StyledEngineProvider,
  useTheme,
  adaptV4Theme,
} from "@mui/material/styles";
import makeStyles from '@mui/styles/makeStyles';
import { useForm, Controller } from "react-hook-form";
import Paper from "@mui/material/Paper";
import MUIDataTable from "mui-datatables";
import CircularProgress from "@mui/material/CircularProgress";

import {useDispatch, useSelector} from "react-redux";

import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";

import Button from "./Button";
import ThumbnailList from "./ThumbnailList";
import {dec_to_dms, ra_to_hours, dms_to_dec, hours_to_ra} from "../units";
import { showNotification } from "baselayer/components/Notifications";

import * as alertActions from "../ducks/alert";
import * as alertsActions from "../ducks/alerts";

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

const getMuiTheme = (theme) =>
  createTheme(adaptV4Theme({
    palette: theme.palette,
    overrides: {
      MUIDataTableBodyCell: {
        root: {
          padding: `${theme.spacing(0.25)} 0px ${theme.spacing(
            0.25
          )} ${theme.spacing(1)}`,
        },
      },
    },
  }));

const useStyles = makeStyles((theme) => ({
  root: {
    margin: 0,
    padding: 0,
    width: "100%",
    "& > *": {
      margin: 0,
      padding: 0,
    },
  },
  cardContent: {
    padding: "0.75rem",
    paddingBottom: 0,
  },
  cardActions: {
    padding: "0.75rem",
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
    margin: 0,
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
  const darkTheme = theme.palette.mode === "dark";

  const { alerts, queryInProgress } = useSelector((state) => state.alerts);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      bts: alert?.classifications?.bts,
    });

  let rows = [];

  if (alerts !== null && !isString(alerts) && Array.isArray(alerts)) {
    rows = alerts.map((a) => makeRow(a));
  }

  const handleRetrieveThumbnails = async (objID) => {
    setIsSubmitting(true);
    const payload = {"thumbnailsOnly" : true, "group_ids" : "all"};
    await dispatch(alertActions.saveAlertAsSource({'id': objID, payload}));
    setIsSubmitting(false);
  };

  // This is just passed to MUI datatables options -- not meant to be instantiated directly.
  const renderPullOutRow = (rowData, rowMeta) => {
    const colSpan = rowData?.length + 1;
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
            justifyContent="center"
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
          <Button
            onClick={(event) => handleRetrieveThumbnails(alertData.objectId)}
            disabled={isSubmitting}
          >
            Retrieve Thumbnails
          </Button>
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
    {
      name: "bts",
      label: "BTS",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
  ];

  const { register, handleSubmit, control, getValues } = useForm();

  const formSubmit = async () => {
    const data = getValues();
    let {object_id, ra, dec, radius, radius_unit} = data;

    if (!object_id?.length && !ra?.length && !dec?.length && !radius?.length) {
      dispatch(showNotification(`You must either specify an object ID, a position`, "error"));
      return;
    }

    if (object_id?.length) {
      object_id = object_id.trim();
    }

    // check that if positional query is requested then all required data are supplied
    if ((ra?.length || dec?.length || radius?.length) && !(ra?.length && dec?.length && radius?.length)) {
      dispatch(showNotification(`Positional parameters, if specified, must be all set`, "error"));
    }
    else {
      if (ra?.length) {
        if (ra?.includes(':') || ra?.includes('h') || ra?.includes('m') || ra?.includes('s')) {
          ra = ra.replace(/h|m/g, ':').replace(/s/g, '');
          ra = hours_to_ra(ra);
        } else {
          ra = parseFloat(ra);
        }
      }
      if (dec?.length) {
        if (dec?.includes(':') || dec?.includes('d') || dec?.includes('m') || dec?.includes('s')) {
          dec = dec.replace(/d|m/g, ':').replace(/s/g, '');
          dec = dms_to_dec(dec);
        } else {
          dec = parseFloat(dec);
        }
      }
      if (radius_unit === 'arcmin') { //convert arcmin to arcsec
        radius = parseFloat(radius) * 60;
      } else if (radius_unit === 'deg') { //convert deg to arcsec
        radius = parseFloat(radius) * 3600;
      } else if (radius_unit === 'rad') { //convert rad to arcsec
        radius = parseFloat(radius) * 206264.80624709636;
      } else {
        radius = parseFloat(radius);
      }

      if (!object_id && (Number.isNaN(parseFloat(ra)) || Number.isNaN(parseFloat(dec)) || Number.isNaN(parseFloat(radius)))) {
        dispatch(showNotification(`Invalid positional parameters`, 'error'));
        return;
      }
      if (object_id?.indexOf(',') > -1) {
        const object_id_split = object_id.split(',');
        dispatch(alertsActions.fetchAlerts({ object_id : object_id_split, ra, dec, radius }));
      } else {
        dispatch(alertsActions.fetchAlerts({ object_id, ra, dec, radius }));
      }
      if (object_id?.length && (!Number.isNaN(parseFloat(ra)) || !Number.isNaN(parseFloat(dec)) || !Number.isNaN(parseFloat(radius)))) {
        dispatch(showNotification(`Object ID specified, ignored positional parameters`, 'warning'));
        return;
      }
    }
  };

  return <>
    <div>
      <Grid
        container
        direction="row"
        justifyContent="flex-start"
        alignItems="flex-start"
        spacing={1}
      >
        <Grid item xs={12} lg={10} className={classes.grid_item_table}>
          <Paper elevation={1}>
            <div className={classes.maindiv}>
              <div className={classes.accordionDetails}>
                <StyledEngineProvider injectFirst>
                  <ThemeProvider theme={getMuiTheme(theme)}>
                    {queryInProgress ? <CircularProgress /> : (
                      <MUIDataTable
                        title="Alerts"
                        data={rows}
                        columns={columns}
                        options={options}
                      />
                    )}
                  </ThemeProvider>
                </StyledEngineProvider>
              </div>
            </div>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={2} className={classes.grid_item_search_box}>
          <Card className={classes.root}>
            <form onSubmit={handleSubmit(formSubmit)}>
              <CardContent className={classes.cardContent}>
                <FormControl required className={classes.selectEmpty}>
                  <InputLabel name="alert-stream-select-required-label">
                    Instrument
                  </InputLabel>
                  <Controller
                    labelId="alert-stream-select-required-label"
                    name="instrument"
                    control={control}
                    rules={{ required: true }}
                    render={({ field: { onChange, value } }) => (
                      <Select value={value} onChange={onChange} defaultValue="ztf">
                        <MenuItem value="ztf">ZTF</MenuItem>
                      </Select>
                    )}
                  />
                  <FormHelperText>Required</FormHelperText>
                </FormControl>
               <Controller
                render={({ field: { onChange, value } }) => (
                 <TextField
                  autoFocus
                  margin="dense"
                  name="object_id"
                  label="objectId"
                  type="text"
                  fullWidth
                  inputRef={register("object_id", { minLength: 3, required: false })}
                  value={value}
                  onChange={onChange}
                 />
                )}
                name="object_id"
                control={control}
              />
              <Controller
               render={({ field: { onChange, value } }) => (
                <TextField
                  margin="dense"
                  name="ra"
                  label="RA [deg, HH:MM:SS, HHhMMmSSs]"
                  fullWidth
                  inputRef={register('ra', { required: false })}
                  value={value}
                  onChange={onChange}
                />
                )}
                name="ra"
                control={control}
              />
              <Controller
               render={({ field: { onChange, value } }) => (
                <TextField
                  margin="dense"
                  name="dec"
                  label="Dec [deg, DD:MM:SS, DDdMMmSSs]"
                  fullWidth
                  inputRef={register('dec', { required: false })}
                  value={value}
                  onChange={onChange}
                />
                )}
                name="dec"
                control={control}
              />
              <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: '0.5rem'}}>
                <Controller
                render={({ field: { onChange, value } }) => (
                  <TextField
                    margin="dense"
                    name="radius"
                    label="Radius"
                    fullWidth
                    inputRef={register('radius', { required: false })}
                    value={value}
                    onChange={onChange}
                  />
                  )}
                  name="radius"
                  control={control}
                />
                <Controller
                  labelId="radius-unit-select-required-label"
                  name="radius_unit"
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { onChange, value } }) => (
                    <Select value={value} onChange={onChange} defaultValue="arcsec"
                      inputRef={register('radius_unit', { required: true })}
                      margin="dense"
                      fullWidth
                      style={{height: "3.5rem", marginTop: "8px", marginBottom: "4px"}}
                    >
                      <MenuItem value="arcsec">arcsec</MenuItem>
                      <MenuItem value="arcmin">arcmin</MenuItem>
                      <MenuItem value="deg">deg</MenuItem>
                      <MenuItem value="rad">rad</MenuItem>
                    </Select>
                  )}
                />
              </div>
              </CardContent>
              <CardActions className={classes.cardActions}>
                <div className={classes.wrapperRoot}>
                  <div className={classes.wrapper}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      onClick={() => formSubmit()}
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
  </>;
};

export default Alerts;
