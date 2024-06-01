import React, { Suspense, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import MUIDataTable from "mui-datatables";

import {
  createTheme,
  ThemeProvider,
  StyledEngineProvider,
  useTheme,
  adaptV4Theme,
} from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Grid from "@mui/material/Grid";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import SaveIcon from "@mui/icons-material/Save";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

import { showNotification } from "baselayer/components/Notifications";
import FormValidationError from "../FormValidationError";
import { dec_to_dms, ra_to_hours, dms_to_dec, hours_to_ra } from "../../units";
import * as archiveActions from "../../ducks/archive";
import { checkSource } from "../../ducks/source";

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

const getMuiTheme = (theme) =>
  createTheme(
    adaptV4Theme({
      palette: theme.palette,
      overrides: {
        MUIDataTableBodyCell: {
          root: {
            padding: `${theme.spacing(0.25)} 0px ${theme.spacing(
              0.25,
            )} ${theme.spacing(1)}`,
          },
        },
      },
    }),
  );

const getMuiPopoverTheme = () =>
  createTheme(
    adaptV4Theme({
      overrides: {
        MuiPopover: {
          paper: {
            maxWidth: "30rem",
          },
        },
      },
    }),
  );

const VegaPlotZTFArchive = React.lazy(() => import("./VegaPlotZTFArchive"));

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
    display: "flex",
    alignItems: "center",
  },
  wrapper: {
    margin: 0,
    position: "relative",
  },
  buttonProgress: {
    color: theme.palette.text.secondary,
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  grid_item_table: {
    order: 2,
    [theme.breakpoints.up("lg")]: {
      order: 1,
    },
  },
  grid_item_search_box: {
    order: 1,
    [theme.breakpoints.up("lg")]: {
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
  marginTop: {
    marginTop: theme.spacing(2),
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
  const theme = useTheme();
  const fullScreen = !useMediaQuery(theme.breakpoints.up("md"));

  const [searchParams] = useSearchParams();

  const nearestSources = useSelector((state) => state.nearest_sources?.sources);
  const userGroups = useSelector((state) => state.groups.userAccessible);
  const userGroupIds = useSelector((state) =>
    state.groups.userAccessible?.map((a) => a.id),
  );
  const catalogNames = useSelector((state) => state.catalog_names);
  const { lightCurves: ztf_light_curves, queryInProgress } = useSelector(
    (state) => state.ztf_light_curves,
  );

  const {
    formState: { errors },
    control,
    register,
    getValues,
    reset,
  } = useForm();
  const {
    handleSubmit: handleSubmit2,
    control: control2,
    getValues: getValues2,
  } = useForm();
  const { handleSubmit: handleSubmitForm } = useForm();

  const [catalogNamesLoadError, setCatalogNamesLoadError] = React.useState("");
  const [catalogOptions, setCatalogOptions] = React.useState([]);
  const [selectedCatalog, setSelectedCatalog] = useState();

  const [rowsToSave, setRowsToSave] = useState([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveNewSource, setSaveNewSource] = useState(false);
  const [searchHeaderAnchor, setSearchHeaderAnchor] = useState(null);
  const searchHelpOpen = Boolean(searchHeaderAnchor);
  const searchHelpId = searchHelpOpen ? "simple-popover" : undefined;

  useEffect(() => {
    const fetchCatalogNames = async () => {
      const data = await dispatch(archiveActions.fetchCatalogNames());
      if (data.status === "error") {
        setCatalogNamesLoadError("Failed to fetch available catalog names.");
        if (catalogNamesLoadError.length > 1) {
          dispatch(showNotification(catalogNamesLoadError, "error"));
        }
      }
    };
    if (!catalogNames) {
      fetchCatalogNames();
    } else {
      const ztf_lc_catalogs = Array.isArray(catalogNames)
        ? catalogNames?.filter((name) => name.indexOf("ZTF_sources_202") !== -1)
        : [];
      // sort alphabetically descending
      ztf_lc_catalogs.sort((a, b) => b.localeCompare(a));
      setCatalogOptions(ztf_lc_catalogs);
    }
  }, [catalogNames, dispatch, catalogNamesLoadError]);

  useEffect(() => {
    const lc_id = parseInt(searchParams.get("lc_id"), 10);
    const ra = parseFloat(searchParams.get("ra"), 10);
    const dec = parseFloat(searchParams.get("dec"), 10);
    let radius = parseFloat(searchParams.get("radius"), 10);
    let radius_unit = searchParams.get("radius_unit");
    let catalog = searchParams.get("catalog");

    const ztf_lc_catalogs = Array.isArray(catalogNames)
      ? catalogNames?.filter((name) => name.indexOf("ZTF_sources_202") !== -1)
      : [];

    // sort alphabetically descending
    ztf_lc_catalogs.sort((a, b) => b.localeCompare(a));

    if (!selectedCatalog && ztf_lc_catalogs?.length > 0) {
      setSelectedCatalog(ztf_lc_catalogs[0]);
    }

    if (
      (ztf_lc_catalogs?.length < 1 || Number.isNaN(ra) || Number.isNaN(dec)) &&
      !lc_id
    ) {
      return;
    }
    if (Number.isNaN(radius)) {
      radius = 3;
    }
    if (!["arcsec", "arcmin", "deg", "rad"].includes(radius_unit)) {
      radius_unit = "arcsec";
    }
    if (selectedCatalog && !catalog) {
      catalog = selectedCatalog;
    } else if (!catalog || !ztf_lc_catalogs.includes(catalog)) {
      catalog = ztf_lc_catalogs[0]; // eslint-disable-line prefer-destructuring
    } else if (catalog && ztf_lc_catalogs.includes(catalog)) {
      setSelectedCatalog(catalog);
    }
    // set ra, dec, and radius to "" if they are NaN
    reset({
      lc_id,
      ra: Number.isNaN(ra) ? "" : ra,
      dec: Number.isNaN(dec) ? "" : dec,
      radius: Number.isNaN(radius) ? "" : radius,
      radius_unit,
      catalog,
    });

    if (lc_id && catalog) {
      dispatch(archiveActions.fetchZTFLightCurves({ lc_id, catalog }));
    } else if (ra && dec && radius && radius_unit && catalog) {
      switch (radius_unit) {
        case "arcmin":
          radius *= 60; // convert arcmin to arcsec
          break;
        case "deg":
          radius *= 3600; // convert deg to arcsec
          break;
        case "rad":
          radius *= 206264.80624709636; // convert rad to arcsec
          break;
        default:
          break;
      }
      dispatch(
        archiveActions.fetchZTFLightCurves({ catalog, ra, dec, radius }),
      );
    }
  }, [catalogNames, searchParams]);

  const handleClickSearchHelp = (event) => {
    setSearchHeaderAnchor(event.currentTarget);
  };

  const handleCloseSearchHelp = () => {
    setSearchHeaderAnchor(null);
  };

  const submitSearch = async () => {
    const data = getValues();
    const { catalog, radius_unit } = data;
    let { lc_id, ra, dec, radius } = data;
    lc_id = lc_id?.toString();
    ra = ra?.toString();
    dec = dec?.toString();
    radius = radius?.toString();
    setSelectedCatalog(catalog);
    // check that if positional query is requested then all required data are supplied
    if (lc_id && catalog) {
      if (ra.length || dec.length) {
        dispatch(
          showNotification(
            `Positional parameters are ignored when an ID is specified`,
            "warning",
          ),
        );
      }
      dispatch(archiveActions.fetchZTFLightCurves({ lc_id, catalog })).then(
        (response) => {
          if (response.status === "error") {
            dispatch(showNotification(response.message, "error"));
          } else if (response?.data?.length === 1) {
            dispatch(
              archiveActions.fetchNearestSources({
                ra: response.data[0]?.ra,
                dec: response.data[0]?.dec,
              }),
            );
          }
        },
      );
    } else if (ra.length && dec.length && radius.length && catalog) {
      if (ra?.length) {
        if (
          ra?.includes(":") ||
          ra?.includes("h") ||
          ra?.includes("m") ||
          ra?.includes("s")
        ) {
          ra = ra.replace(/h|m/g, ":").replace(/s/g, "");
          ra = hours_to_ra(ra);
        } else {
          ra = parseFloat(ra);
        }
      }
      if (dec?.length) {
        if (
          dec?.includes(":") ||
          dec?.includes("d") ||
          dec?.includes("m") ||
          dec?.includes("s")
        ) {
          dec = dec.replace(/d|m/g, ":").replace(/s/g, "");
          dec = dms_to_dec(dec);
        } else {
          dec = parseFloat(dec);
        }
      }
      if (
        Number.isNaN(parseFloat(ra)) ||
        Number.isNaN(parseFloat(dec)) ||
        Number.isNaN(parseFloat(radius))
      ) {
        dispatch(showNotification(`Invalid positional parameters`, "error"));
        return;
      }
      if (radius_unit === "arcmin") {
        // convert arcmin to arcsec
        radius = parseFloat(radius) * 60;
      } else if (radius_unit === "deg") {
        // convert deg to arcsec
        radius = parseFloat(radius) * 3600;
      } else if (radius_unit === "rad") {
        // convert rad to arcsec
        radius = parseFloat(radius) * 206264.80624709636;
      } else {
        radius = parseFloat(radius);
      }
      dispatch(
        archiveActions.fetchZTFLightCurves({ catalog, ra, dec, radius }),
      );
      // also fetch nearest saved sources within 5 arcsec from requested position
      dispatch(archiveActions.fetchNearestSources({ ra, dec }));
    } else {
      dispatch(
        showNotification(
          `Positional parameters must be all set, or an ID must be specified`,
          "warning",
        ),
      );
    }
  };

  const handleSaveDialogClose = () => {
    setRowsToSave([]);
    setSaveDialogOpen(false);
  };

  let rows = [];

  const handleSaveDialogOpen = async (selectedRows) => {
    setRowsToSave(selectedRows);
    const row = rows[selectedRows.data[0].dataIndex];
    dispatch(archiveActions.fetchNearestSources({ ra: row.ra, dec: row.dec }));
    setSaveDialogOpen(true);
  };

  const validateGroups = () => {
    const formState = getValues();
    if (saveNewSource) {
      return formState.group_ids.filter((value) => Boolean(value)).length >= 1;
    }
    return true;
  };

  const onSubmitSave = async () => {
    setIsSubmitting(true);

    const data2 = getValues2();

    let objID;
    if (data2.name && data2.name !== "") {
      objID = data2.name;
    } else {
      objID = data2.obj_id === "Create new source" ? null : data2.obj_id;
    }

    if (saveNewSource) {
      let data = null;
      const row = rows[rowsToSave.data[0].dataIndex];
      data = await dispatch(
        checkSource(objID, { ra: row.ra, dec: row.dec, nameOnly: true }),
      );
      if (data.data !== "A source of that name does not exist.") {
        dispatch(showNotification(data.data, "error"));
        setIsSubmitting(false);
        return;
      }
    }

    // IDs of selected groups:
    const groupIDs = userGroupIds.filter(
      (groupId, index) => data2.group_ids[index],
    );
    // IDs of selected light curves
    const lightCurveIDs = rowsToSave.data.map(
      // eslint-disable-next-line no-underscore-dangle
      (rowToSave) => rows[rowToSave.dataIndex]._id,
    );

    const payload = {
      obj_id: objID,
      catalog: selectedCatalog,
      light_curve_ids: lightCurveIDs,
    };

    payload.group_ids = groupIDs;

    const result = await dispatch(archiveActions.saveLightCurves(payload));
    if (result.status === "success") {
      dispatch(showNotification("Successfully saved data"));
      handleSaveDialogClose();
    }
    setIsSubmitting(false);
  };

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

  if (
    ztf_light_curves !== null &&
    !isString(ztf_light_curves) &&
    Array.isArray(ztf_light_curves)
  ) {
    rows = ztf_light_curves.map((a) => makeRow(a));
  }

  // This is just passed to MUI datatables options -- not meant to be instantiated directly.
  const renderPullOutRow = (rowData, rowMeta) => {
    const colSpan = rowData.length + 1;
    // eslint-disable-next-line no-underscore-dangle
    const ZTFLightCurveId = ztf_light_curves[rowMeta.dataIndex]._id;
    const ZTFLightCurveFilterId = ztf_light_curves[rowMeta.dataIndex].filter;
    const ZTFLightCurveData = ztf_light_curves[rowMeta.dataIndex].data.map(
      (obj) => ({ ...obj, filter: ZTFLightCurveFilterId }),
    );
    const colorScale = {
      domain: [ZTFLightCurveFilterId],
      range: [ZTFLightCurveColors[ZTFLightCurveFilterId]],
    };

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
            justifyContent="center"
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
    customToolbarSelect: (selectedRows) => (
      <IconButton
        className={classes.buttonSave}
        aria-label="save"
        onClick={() => {
          handleSaveDialogOpen(selectedRows);
        }}
        size="large"
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
        customBodyRender: (value) => ra_to_hours(value, ":"),
      },
    },
    {
      name: "dec",
      label: "Decl.",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value) => dec_to_dms(value, ":"),
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
        customBodyRender: (value) => value.toFixed(3),
      },
    },
    {
      name: "vonneumannratio",
      label: "vonneumannratio",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value) => value.toFixed(3),
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
        customBodyRender: (value) => (value ? value.toFixed(5) : value),
      },
    },
    {
      name: "iqr",
      label: "iqr",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value) => (value ? value.toFixed(5) : value),
      },
    },
  ];

  if (!catalogOptions) {
    return (
      <div>
        <CircularProgress color="secondary" />
      </div>
    );
  }

  if (!catalogOptions.length) {
    return (
      <div>
        <Typography variant="h5" className={classes.header}>
          ZTF light curve data not available.
        </Typography>
      </div>
    );
  }

  return (
    catalogOptions?.length && (
      <>
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
                        {queryInProgress ? (
                          <CircularProgress />
                        ) : (
                          <MUIDataTable
                            title="ZTF Light Curves"
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
                <form onSubmit={handleSubmitForm(submitSearch)}>
                  <CardContent className={classes.cardContent}>
                    <FormControl required className={classes.selectEmpty}>
                      <InputLabel name="alert-stream-select-required-label">
                        Catalog
                      </InputLabel>
                      <Controller
                        labelId="alert-stream-select-required-label"
                        name="catalog"
                        control={control}
                        defaultValue={selectedCatalog || catalogOptions[0]}
                        rules={{ required: true }}
                        render={({ field: { onChange, value } }) => (
                          <Select value={value} onChange={onChange}>
                            {catalogOptions?.map((catalogName) => (
                              <MenuItem key={catalogName} value={catalogName}>
                                {catalogName}
                              </MenuItem>
                            ))}
                          </Select>
                        )}
                      />
                      <FormHelperText>Required</FormHelperText>
                    </FormControl>
                    <Controller
                      render={({ field: { onChange, value } }) => (
                        <TextField
                          margin="dense"
                          name="lc_id"
                          label="LC ID (optional)"
                          fullWidth
                          inputRef={register("lc_id", { required: false })}
                          value={value}
                          onChange={onChange}
                        />
                      )}
                      name="lc_id"
                      control={control}
                    />
                    <Controller
                      render={({ field: { onChange, value } }) => (
                        <TextField
                          margin="dense"
                          name="ra"
                          label="RA [deg, HH:MM:SS, HHhMMmSSs]"
                          fullWidth
                          inputRef={register("ra", { required: false })}
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
                          inputRef={register("dec", { required: false })}
                          value={value}
                          onChange={onChange}
                        />
                      )}
                      name="dec"
                      control={control}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <Controller
                        render={({ field: { onChange, value } }) => (
                          <TextField
                            margin="dense"
                            name="radius"
                            label="Radius"
                            fullWidth
                            inputRef={register("radius", { required: false })}
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
                          <Select
                            value={value}
                            onChange={onChange}
                            defaultValue="arcsec"
                            inputRef={register("radius_unit", {
                              required: true,
                            })}
                            margin="dense"
                            fullWidth
                            style={{
                              height: "3.5rem",
                              marginTop: "8px",
                              marginBottom: "4px",
                            }}
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
                          disabled={queryInProgress}
                        >
                          Search
                        </Button>
                        {queryInProgress && (
                          <CircularProgress
                            size={24}
                            color="secondary"
                            className={classes.buttonProgress}
                          />
                        )}
                        <IconButton
                          aria-label="help"
                          size="small"
                          onClick={handleClickSearchHelp}
                          className={classes.helpButton}
                        >
                          <HelpOutlineIcon />
                        </IconButton>
                        <StyledEngineProvider injectFirst>
                          <ThemeProvider theme={getMuiPopoverTheme(theme)}>
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
                                Maximum search radius is 2 degrees.
                                <br />
                                At most 1,000 nearest sources (to the requested
                                position) will be returned.
                              </Typography>
                            </Popover>
                          </ThemeProvider>
                        </StyledEngineProvider>
                      </div>
                    </div>
                  </CardActions>
                </form>
              </Card>
            </Grid>
          </Grid>
          <Dialog
            fullScreen={fullScreen}
            open={saveDialogOpen}
            onClose={handleSaveDialogClose}
            aria-labelledby="responsive-dialog-title"
          >
            <form onSubmit={handleSubmit2(onSubmitSave)}>
              <DialogTitle id="responsive-dialog-title">
                Save selected data to Fritz
              </DialogTitle>
              <DialogContent dividers>
                <DialogContentText>
                  Post photometry data to source:
                </DialogContentText>
                <FormControl required>
                  <Controller
                    name="obj_id"
                    color="primary"
                    render={({ field: { onChange } }) => (
                      <RadioGroup
                        color="primary"
                        /* eslint-disable-next-line react/jsx-props-no-spreading */
                        onChange={(event) => {
                          onChange(event);
                          if (event.target.value === "Create new source") {
                            setSaveNewSource(true);
                          } else {
                            setSaveNewSource(false);
                          }
                        }}
                      >
                        {/* display list of nearby saved sources: */}
                        {nearestSources != null &&
                          nearestSources.length > 0 &&
                          nearestSources?.map((source) => (
                            <FormControlLabel
                              key={source.id}
                              value={source.id}
                              control={<Radio />}
                              label={
                                <Chip
                                  size="small"
                                  label={`${source.id} (found within 5" from search position)`}
                                  onDelete={() =>
                                    window.open(
                                      `/source/${source.id}`,
                                      "_blank",
                                    )
                                  }
                                  deleteIcon={<OpenInNewIcon />}
                                  color="primary"
                                />
                              }
                            />
                          ))}
                        <FormControlLabel
                          value="Create new source"
                          control={<Radio />}
                          label="Create new source"
                        />
                      </RadioGroup>
                    )}
                    defaultValue="Create new source"
                    control={control2}
                    rules={{ required: true }}
                  />
                </FormControl>
                <div>
                  {saveNewSource && (
                    <div>
                      <div>
                        <DialogContentText>Source name</DialogContentText>
                      </div>
                      <div>
                        <Controller
                          render={({ field: { onChange, value } }) => (
                            <TextField
                              size="small"
                              label="name"
                              name="name"
                              onChange={onChange}
                              value={value}
                            />
                          )}
                          name="name"
                          control={control2}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogContentText className={classes.marginTop}>
                  Select groups to save new source to:
                </DialogContentText>
                {saveNewSource && errors.group_ids && (
                  <FormValidationError message="Select at least one group." />
                )}
                {userGroups.map((userGroup, idx) => (
                  <FormControlLabel
                    key={userGroup.id}
                    control={
                      <Controller
                        name={`group_ids[${idx}]`}
                        control={control2}
                        rules={{ validate: validateGroups }}
                        defaultValue={false}
                        render={({ field: { onChange, value } }) => (
                          <Checkbox
                            color="primary"
                            disabled={!saveNewSource}
                            /* eslint-disable-next-line react/jsx-props-no-spreading */
                            checked={value}
                            onChange={onChange}
                          />
                        )}
                      />
                    }
                    label={userGroup.name}
                  />
                ))}
              </DialogContent>
              <DialogActions>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.search_button}
                  type="submit"
                  data-testid="save-dialog-submit"
                  onClick={() => onSubmitSave()}
                  disabled={isSubmitting}
                >
                  Save
                </Button>
                <Button
                  autoFocus
                  onClick={handleSaveDialogClose}
                  color="primary"
                >
                  Dismiss
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </div>
      </>
    )
  );
};

export default Archive;
