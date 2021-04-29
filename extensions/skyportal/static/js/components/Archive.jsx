import React, {Suspense, useEffect, useState} from "react";
import { useForm, Controller } from "react-hook-form";
import {useDispatch, useSelector} from "react-redux";
import MUIDataTable from "mui-datatables";

import {createMuiTheme, makeStyles, MuiThemeProvider, useTheme} from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CircularProgress from "@material-ui/core/CircularProgress";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import Grid from "@material-ui/core/Grid";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import IconButton from "@material-ui/core/IconButton";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Popover from "@material-ui/core/Popover";
import SaveIcon from "@material-ui/icons/Save";
import Select from "@material-ui/core/Select";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";

import { showNotification } from "baselayer/components/Notifications";
import {dec_to_dms, ra_to_hours} from "../units";
import * as archiveActions from "../ducks/archive";

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

const getMuiPopoverTheme = () =>
  createMuiTheme({
    overrides: {
      MuiPopover: {
        paper: {
          maxWidth: "30rem",
        },
      },
    },
  });

const VegaPlotZTFArchive = React.lazy(() => import("./VegaPlotZTFArchive"));

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
  buttonSave: {
    marginRight: theme.spacing(2),
  },
  typography: {
    padding: theme.spacing(2),
  },
  helpButton: {
    marginLeft: theme.spacing(2),
    display: "inline-block",
  },
}));

const ZTFLightCurveColors = {
  1: "#28a745",
  2: "#dc3545",
  3: "#f3dc11",
};

const Archive = () => {
  const dispatch = useDispatch();
  const classes = useStyles();

  const [loading, setLoading] = React.useState(false);
  const [catalogNamesLoadError, setCatalogNamesLoadError] = React.useState("");

  const theme = useTheme();
  const darkTheme = theme.palette.type === "dark";

  const [searchHeaderAnchor, setSearchHeaderAnchor] = useState(null);
  const searchHelpOpen = Boolean(searchHeaderAnchor);
  const searchHelpId = searchHelpOpen ? "simple-popover" : undefined;
  const handleClickSearchHelp = (event) => {
    setSearchHeaderAnchor(event.currentTarget);
  };
  const handleCloseSearchHelp = () => {
    setSearchHeaderAnchor(null);
  };

  const catalogNames = useSelector((state) => state.catalog_names);

  useEffect(() => {
    const fetchCatalogNames = async () => {
      const data = await dispatch(archiveActions.fetchCatalogNames());
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
    const ZTFLightCurveFilterId = ztf_light_curves[rowMeta.dataIndex].filter;
    const ZTFLightCurveData = ztf_light_curves[rowMeta.dataIndex].data.map(
      obj => ({ ...obj, filter: ZTFLightCurveFilterId })
    );
    const colorScale = {
      domain: [ZTFLightCurveFilterId],
      range: [ZTFLightCurveColors[ZTFLightCurveFilterId]],
    }

    return (
      <TableRow data-testid={`ZTFLightCurveRow_${ZTFLightCurveId}`}>
        <TableCell
          style={{ paddingBottom: 0, paddingTop: 0 }}
          colSpan={colSpan}
        >
          <Grid
            container
            direction="row"
            spacing={2}
            justify="center"
            alignItems="center"
          >
            <Grid item>
              {ZTFLightCurveData.length && (
                <Suspense fallback={<CircularProgress color="secondary" />}>
                  <VegaPlotZTFArchive
                    data={ZTFLightCurveData}
                    colorScale={colorScale}
                  />
                </Suspense>
              )}
            </Grid>
          </Grid>
        </TableCell>
      </TableRow>
    );
  };

  const options = {
    selectableRows: "multiple",
    customToolbarSelect: selectedRows => (
      <IconButton
        className={classes.buttonSave}
        aria-label="save"
        onClick={() => alert("Not implemented")}
      >
        <SaveIcon />
      </IconButton>
     ),
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
    const {catalog, ra, dec, radius} = data;
    // check that if positional query is requested then all required data are supplied
    if (ra.length && dec.length && radius.length) {
      await dispatch(archiveActions.fetchZTFLightCurves({ catalog, ra, dec, radius }));
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
                    required
                    inputRef={registerForm({ required: true })}
                  />
                  <TextField
                    margin="dense"
                    name="dec"
                    label="Decl. (deg)"
                    fullWidth
                    required
                    inputRef={registerForm({ required: true })}
                  />
                  <TextField
                    margin="dense"
                    name="radius"
                    label="Radius (arcsec)"
                    fullWidth
                    required
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
                      <IconButton
                        aria-label="help"
                        size="small"
                        onClick={handleClickSearchHelp}
                        className={classes.helpButton}
                      >
                        <HelpOutlineIcon />
                      </IconButton>
                      <MuiThemeProvider theme={getMuiPopoverTheme(theme)}>
                        <Popover
                          id={searchHelpId}
                          open={searchHelpOpen}
                          anchorEl={searchHeaderAnchor}
                          onClose={handleCloseSearchHelp}
                          anchorOrigin={{
                            vertical: "top",
                            horizontal: "right",
                          }}
                          transformOrigin={{
                            vertical: "top",
                            horizontal: "left",
                          }}
                        >
                          <Typography className={classes.typography}>
                            Maximum search radius is 2 degrees.<br />
                            At most 1,000 nearest sources (to the requested position) will be returned.
                          </Typography>
                        </Popover>
                      </MuiThemeProvider>
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
