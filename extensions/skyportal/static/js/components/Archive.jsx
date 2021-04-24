import React, {useEffect, useState} from "react";

import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";

import Typography from "@material-ui/core/Typography";
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
import {dec_to_dms, ra_to_hours} from "../units";
import { showNotification } from "baselayer/components/Notifications";

import * as Actions from "../ducks/archive";

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

const Archive = () => {
  const dispatch = useDispatch();
  const classes = useStyles();

  const [loading, setLoading] = React.useState(false);
  const [catalogNamesLoadError, setCatalogNamesLoadError] = React.useState("");

  const theme = useTheme();
  const darkTheme = theme.palette.type === "dark";

  const catalogNames = useSelector((state) => state.catalog_names);

  useEffect(() => {
    const fetchCatalogNames = async () => {
      const data = await dispatch(Actions.fetchCatalogNames());
      if (data.status === "error") {
        setCatalogNamesLoadError();
        if (catalogNamesLoadError.length > 1) {
          dispatch(showNotification(catalogNamesLoadError, "error"));
        }
      }
    };
    if (!catalogNames) fetchCatalogNames();
  }, [catalogNames, dispatch, catalogNamesLoadError]);

  const ZTFLightCurveCatalogNames = catalogNames?.filter((name) => name.indexOf('ZTF_sources') !== -1)

  const ztf_light_curves = useSelector((state) => state.ztf_light_curves);

  const makeRow = (light_curve) => ({
    // eslint-disable-next-line no-underscore-dangle
    _id: light_curve?._id,
    ra: light_curve?.ra,
    dec: light_curve?.dec,
    filter: light_curve?.filter,
    meanmag: light_curve?.meanmag,
    vonneumannratio: light_curve?.vonneumannratio,
    refchi: light_curve?.refchi,
    refmag: light_curve?.refmag,
    refmagerr: light_curve?.refmagerr,
    iqr: light_curve?.iqr,
    });
  let rows = [];

  if (ztf_light_curves !== null && !isString(ztf_light_curves) && Array.isArray(ztf_light_curves)) {
    rows = ztf_light_curves.map((a) => makeRow(a));
  }

  // This is just passed to MUI datatables options -- not meant to be instantiated directly.
  const renderPullOutRow = (rowData, rowMeta) => {
    const colSpan = rowData.length + 1;
    // eslint-disable-next-line no-underscore-dangle
    const ZTFLightCurveId = ztf_light_curves[rowMeta.dataIndex]._id;
    const ZTFLightCurveData = ztf_light_curves[rowMeta.dataIndex].data;

    return (
      <TableRow data-testid={`ZTFLightCurveRow_${ZTFLightCurveId}`}>
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
              LOL YOPTA
            </Grid>
          </Grid>
        </TableCell>
      </TableRow>
    );
  };

  const options = {
    selectableRows: "multiple",
    expandableRows: true,
    expandableRowsOnClick: true,
    renderExpandableRow: renderPullOutRow,
    elevation: 1,
    sortOrder: {
      name: "_id",
      direction: "desc",
    },
  };

  const columns = [
    {
      name: "_id",
      label: "_id",
      options: {
        filter: true,
        sort: true,
        sortDescFirst: true,
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
      name: "filter",
      label: "filter",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "meanmag",
      label: "meanmag",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(3),
      },
    },
    {
      name: "vonneumannratio",
      label: "vonneumannratio",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(3),
      },
    },
    {
      name: "refchi",
      label: "refchi",
      options: {
        filter: false,
        sort: true,
      },
    },
    {
      name: "refmag",
      label: "refmag",
      options: {
        filter: false,
        sort: true,
      },
    },
    {
      name: "refmagerr",
      label: "refmagerr",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "iqr",
      label: "iqr",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
  ];

  const { register: registerForm, handleSubmit: handleSubmitForm, control: controlForm } = useForm();

  const submitSearch = async (data) => {
    setLoading(true);
    const {ra, dec, radius} = data;
    // check that if positional query is requested then all required data are supplied
    if (ra.length && dec.length && radius.length) {
      await dispatch(Actions.fetchZTFLightCurves({ ra, dec, radius }));
    }
    else {
      dispatch(showNotification(`Positional parameters should be set all or none`));
    }
    setLoading(false);
  };

  // renders

  if (!ZTFLightCurveCatalogNames) {
    return (
      <div>
        <CircularProgress color="secondary" />
      </div>
    );
  }

  if (!ZTFLightCurveCatalogNames.length) {
    return (
      <div>
        <Typography variant="h5" className={classes.header}>
          ZTF light curve data not available.
        </Typography>
      </div>
    );
  }

  return (ZTFLightCurveCatalogNames.length &&
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
                      title="ZTF Light Curves"
                      data={rows}
                      columns={columns}
                      options={options}
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
                      Catalog
                    </InputLabel>
                    <Controller
                      labelId="alert-stream-select-required-label"
                      name="catalog"
                      as={Select}
                      defaultValue={ZTFLightCurveCatalogNames[0]}
                      control={controlForm}
                      rules={{ required: true }}
                    >
                      {ZTFLightCurveCatalogNames?.map((catalogName) => (
                        <MenuItem key={catalogName} value={catalogName}>
                          {catalogName}
                        </MenuItem>
                      ))}
                    </Controller>
                    <FormHelperText>Required</FormHelperText>
                  </FormControl>
                  <TextField
                    margin="dense"
                    name="ra"
                    label="R.A. (deg)"
                    fullWidth
                    inputRef={registerForm({ required: true })}
                  />
                  <TextField
                    margin="dense"
                    name="dec"
                    label="Decl. (deg)"
                    fullWidth
                    inputRef={registerForm({ required: true })}
                  />
                  <TextField
                    margin="dense"
                    name="radius"
                    label="Radius (arcsec)"
                    fullWidth
                    inputRef={registerForm({ required: true })}
                  />
                </CardContent>
                <CardActions>
                  <div className={classes.wrapperRoot}>
                    <div className={classes.wrapper}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loading}
                      >
                        Search
                      </Button>
                      {loading && <CircularProgress size={24} color="secondary" className={classes.buttonProgress} />}
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

export default Archive;
