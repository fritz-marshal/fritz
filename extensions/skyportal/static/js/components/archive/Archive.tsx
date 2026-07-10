import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useSearchParams } from "react-router-dom";

import {
  createTheme,
  ThemeProvider,
  StyledEngineProvider,
  useTheme,
  adaptV4Theme,
} from "@mui/material/styles";
import { makeStyles } from "tss-react/mui";
import {
  GridToolbarContainer,
  GridToolbarColumnsButton,
} from "@mui/x-data-grid";
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
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import MenuItem from "@mui/material/MenuItem";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import SaveIcon from "@mui/icons-material/Save";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

import { showNotification } from "baselayer/components/Notifications";
import StyledDataGrid from "../StyledDataGrid";
import FormValidationError from "../FormValidationError";
import { dec_to_dms, ra_to_hours, dms_to_dec, hours_to_ra } from "../../units";
import * as archiveActions from "../../ducks/kowalski_archive";
import { useCheckSourceMutation } from "../../ducks/source";
import { useGetGroupsQuery } from "../../ducks/groups";
import { useAppDispatch, useAppSelector } from "../../types/hooks";

function isString(x: any) {
  return Object.prototype.toString.call(x) === "[object String]";
}

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
    } as any),
  );

const VegaPlotZTFArchive = React.lazy(
  () => import("../plot/VegaPlotZTFArchive"),
);

const useStyles = makeStyles()((theme) => ({
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
    position: "absolute" as const,
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
    textAlign: "center" as const,
    color: theme.palette.text.secondary,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center" as const,
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
    textTransform: "none" as const,
  },
  maindiv: {},
  accordionDetails: {},
  wrapperRoot: {
    display: "flex",
    alignItems: "center",
  },
  wrapper: {
    margin: 0,
    position: "relative" as const,
  },
  buttonProgress: {
    color: theme.palette.text.secondary,
    position: "absolute" as const,
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

const ZTFLightCurveColors: Record<number, string> = {
  1: "#28a745",
  2: "#dc3545",
  3: "#f3dc11",
};

const Archive = () => {
  const dispatch = useAppDispatch();
  const [triggerCheckSource] = useCheckSourceMutation();
  const { classes } = useStyles();
  const theme = useTheme();
  const fullScreen = !useMediaQuery(theme.breakpoints.up("md"));

  const [searchParams] = useSearchParams();

  const nearestSources = useAppSelector(
    (state) => (state as any).nearest_sources?.sources,
  );
  const { data: groupsData } = useGetGroupsQuery();
  const userGroups = groupsData?.userAccessible ?? [];
  const userGroupIds = groupsData?.userAccessible?.map((a: any) => a.id) ?? [];
  const catalogNames = useAppSelector(
    (state) => (state as any).kowalski_catalog_names,
  );
  const { lightCurves: ztf_light_curves, queryInProgress } = useAppSelector(
    (state) => (state as any).ztf_light_curves,
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
  const [catalogOptions, setCatalogOptions] = React.useState<any[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<any>();

  const [rowsToSave, setRowsToSave] = useState<any[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveNewSource, setSaveNewSource] = useState(false);
  const [searchHeaderAnchor, setSearchHeaderAnchor] = useState<any>(null);
  const searchHelpOpen = Boolean(searchHeaderAnchor);
  const searchHelpId = searchHelpOpen ? "simple-popover" : undefined;

  // DataGrid multi-row selection (v8 model: { type, ids: Set }).
  const [rowSelectionModel, setRowSelectionModel] = useState<any>({
    type: "include",
    ids: new Set(),
  });
  // IDs of rows whose expandable light-curve plot is open.
  const [openedRows, setOpenedRows] = useState<any[]>([]);

  useEffect(() => {
    const fetchCatalogNames = async () => {
      const data: any = await dispatch(archiveActions.fetchCatalogNames());
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
        ? catalogNames?.filter(
            (name: any) => name.indexOf("ZTF_sources_202") !== -1,
          )
        : [];
      // sort alphabetically descending
      ztf_lc_catalogs.sort((a: any, b: any) => b.localeCompare(a));
      setCatalogOptions(ztf_lc_catalogs);
    }
  }, [catalogNames, dispatch, catalogNamesLoadError]);

  useEffect(() => {
    const lc_id = parseInt(searchParams.get("lc_id") as any, 10);
    const ra = parseFloat(searchParams.get("ra") as any);
    const dec = parseFloat(searchParams.get("dec") as any);
    let radius = parseFloat(searchParams.get("radius") as any);
    let radius_unit: any = searchParams.get("radius_unit");
    let catalog: any = searchParams.get("catalog");

    const ztf_lc_catalogs = Array.isArray(catalogNames)
      ? catalogNames?.filter(
          (name: any) => name.indexOf("ZTF_sources_202") !== -1,
        )
      : [];

    // sort alphabetically descending
    ztf_lc_catalogs.sort((a: any, b: any) => b.localeCompare(a));

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
      catalog = ztf_lc_catalogs[0];
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
      dispatch(archiveActions.fetchZTFLightCurves({ lc_id, catalog } as any));
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
        archiveActions.fetchZTFLightCurves({ catalog, ra, dec, radius } as any),
      );
    }
  }, [catalogNames, searchParams]);

  const handleClickSearchHelp = (event: any) => {
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
      dispatch(
        archiveActions.fetchZTFLightCurves({ lc_id, catalog } as any),
      ).then((response: any) => {
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
      });
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
        archiveActions.fetchZTFLightCurves({ catalog, ra, dec, radius } as any),
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

  let rows: any[] = [];

  const handleSaveDialogOpen = async (selectedRows: any[]) => {
    setRowsToSave(selectedRows);
    const row = selectedRows[0];
    dispatch(archiveActions.fetchNearestSources({ ra: row.ra, dec: row.dec }));
    setSaveDialogOpen(true);
  };

  const validateGroups = () => {
    const formState: any = getValues();
    if (saveNewSource) {
      return (
        formState.group_ids.filter((value: any) => Boolean(value)).length >= 1
      );
    }
    return true;
  };

  const onSubmitSave = async () => {
    setIsSubmitting(true);

    const data2: any = getValues2();

    let objID;
    if (data2.name && data2.name !== "") {
      objID = data2.name;
    } else {
      objID = data2.obj_id === "Create new source" ? null : data2.obj_id;
    }

    if (saveNewSource) {
      const row = rowsToSave[0];
      const result = await triggerCheckSource({
        id: objID,
        params: { ra: row.ra, dec: row.dec, nameOnly: true },
      });
      if (result.data !== "A source of that name does not exist.") {
        dispatch(showNotification(result.data, "error"));
        setIsSubmitting(false);
        return;
      }
    }

    // IDs of selected groups:
    const groupIDs = userGroupIds.filter(
      (_groupId: any, index: number) => data2.group_ids[index],
    );
    // IDs of selected light curves
    const lightCurveIDs = rowsToSave.map((rowToSave) => rowToSave._id);

    const payload: any = {
      obj_id: objID,
      catalog: selectedCatalog,
      light_curve_ids: lightCurveIDs,
    };

    payload.group_ids = groupIDs;

    const result: any = await dispatch(archiveActions.saveLightCurves(payload));
    if (result.status === "success") {
      dispatch(showNotification("Successfully saved data"));
      handleSaveDialogClose();
    }
    setIsSubmitting(false);
  };

  const makeRow = (light_curve: any) => ({
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
    rows = ztf_light_curves.map((a: any) => makeRow(a));
  }

  const toggleExpand = (id: any) => {
    setOpenedRows((prev: any[]) =>
      prev.includes(id) ? prev.filter((x: any) => x !== id) : [...prev, id],
    );
  };

  // Render the expandable light-curve plot for a detail row. The detail row
  // carries the full light curve object (with its `.data` samples) in
  // `row.__source`; the summary rows only carry the table columns.
  const renderPullOutRow = (lightCurve: any) => {
    const ZTFLightCurveFilterId = lightCurve.filter;
    const ZTFLightCurveData = (lightCurve.data || []).map((obj: any) => ({
      ...obj,
      filter: ZTFLightCurveFilterId,
    }));
    const colorScale = {
      domain: [ZTFLightCurveFilterId],
      range: [ZTFLightCurveColors[ZTFLightCurveFilterId]],
    };

    return (
      <div
        data-testid={`ZTFLightCurveRow_${lightCurve._id}`}
        style={{ width: "100%", paddingBottom: 0, paddingTop: 0 }}
      >
        <Grid
          container
          direction="row"
          spacing={2}
          sx={{ justifyContent: "center", alignItems: "center" }}
        >
          <Grid>
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
      </div>
    );
  };

  const columns: any[] = [
    {
      field: "__expand",
      headerName: "",
      width: 56,
      sortable: false,
      filterable: false,
      hideable: false,
      disableColumnMenu: true,
      colSpan: (_value: any, row: any) => (row.__detail ? 100 : 1),
      renderCell: (params: any) => {
        if (params.row.__detail) {
          return renderPullOutRow(params.row.__source);
        }
        const expanded = openedRows.includes(params.row._id);
        return (
          <IconButton
            id="expandable-button"
            size="small"
            aria-label="expand row"
            onClick={() => toggleExpand(params.row._id)}
          >
            {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
          </IconButton>
        );
      },
    },
    {
      field: "_id",
      headerName: "_id",
      flex: 1,
      minWidth: 120,
      sortingOrder: ["desc", "asc", null],
    },
    {
      field: "ra",
      headerName: "R.A.",
      flex: 1,
      minWidth: 110,
      filterable: false,
      renderCell: (params: any) => ra_to_hours(params.value, ":"),
    },
    {
      field: "dec",
      headerName: "Decl.",
      flex: 1,
      minWidth: 110,
      filterable: false,
      renderCell: (params: any) => dec_to_dms(params.value, ":"),
    },
    {
      field: "filter",
      headerName: "filter",
      flex: 1,
      minWidth: 80,
    },
    {
      field: "meanmag",
      headerName: "meanmag",
      flex: 1,
      minWidth: 100,
      filterable: false,
      renderCell: (params: any) => params.value.toFixed(3),
    },
    {
      field: "vonneumannratio",
      headerName: "vonneumannratio",
      flex: 1,
      minWidth: 140,
      filterable: false,
      renderCell: (params: any) => params.value.toFixed(3),
    },
    {
      field: "refchi",
      headerName: "refchi",
      flex: 1,
      minWidth: 90,
      filterable: false,
    },
    {
      field: "refmag",
      headerName: "refmag",
      flex: 1,
      minWidth: 90,
      filterable: false,
    },
    {
      field: "refmagerr",
      headerName: "refmagerr",
      flex: 1,
      minWidth: 100,
      filterable: false,
      renderCell: (params: any) =>
        params.value ? params.value.toFixed(5) : params.value,
    },
    {
      field: "iqr",
      headerName: "iqr",
      flex: 1,
      minWidth: 90,
      filterable: false,
      renderCell: (params: any) =>
        params.value ? params.value.toFixed(5) : params.value,
    },
  ];

  // Build the display rows, injecting a detail row (with the full light curve)
  // after each summary row whose plot is expanded.
  const lightCurveById: Record<string, any> = {};
  if (Array.isArray(ztf_light_curves)) {
    ztf_light_curves.forEach((lc: any) => {
      lightCurveById[lc._id] = lc;
    });
  }
  const displayRows: any[] = [];
  rows.forEach((row: any) => {
    displayRows.push(row);
    if (openedRows.includes(row._id)) {
      displayRows.push({
        _id: `${row._id}__detail`,
        __detail: true,
        __source: lightCurveById[row._id],
      });
    }
  });

  // Save action lives in the toolbar; enabled when rows are selected. Mirrors
  // the old customToolbarSelect SaveIcon from the previous table library.
  const CustomToolbar = useMemo(
    () =>
      function ArchiveTableToolbar() {
        return (
          <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <IconButton
              className={classes.buttonSave}
              aria-label="save"
              disabled={rowSelectionModel.ids.size === 0}
              onClick={() => {
                const selected = rows.filter((row: any) =>
                  rowSelectionModel.ids.has(row._id),
                );
                if (selected.length) {
                  handleSaveDialogOpen(selected);
                }
              }}
              size="large"
            >
              <SaveIcon />
            </IconButton>
          </GridToolbarContainer>
        );
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelectionModel, rows],
  );

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

  if (!catalogOptions?.length) {
    return null;
  }

  return (
    <>
      <div>
        <Grid
          container
          direction="row"
          spacing={1}
          sx={{ justifyContent: "flex-start", alignItems: "flex-start" }}
        >
          <Grid size={{ xs: 12, lg: 10 }} className={classes.grid_item_table}>
            <Paper elevation={1}>
              <div className={classes.maindiv}>
                <div className={classes.accordionDetails}>
                  {queryInProgress ? (
                    <CircularProgress />
                  ) : (
                    <StyledDataGrid
                      autoHeight
                      title="ZTF Light Curves"
                      rows={displayRows}
                      columns={columns}
                      getRowId={(row: any) => row._id}
                      getRowHeight={(params: any) =>
                        params.model.__detail ? "auto" : null
                      }
                      checkboxSelection
                      disableRowSelectionOnClick
                      isRowSelectable={(params: any) => !params.row.__detail}
                      rowSelectionModel={rowSelectionModel}
                      onRowSelectionModelChange={(model: any) =>
                        setRowSelectionModel(model)
                      }
                      pageSizeOptions={[10, 25, 50, 100]}
                      initialState={{
                        pagination: {
                          paginationModel: { pageSize: 10, page: 0 },
                        },
                        sorting: {
                          sortModel: [{ field: "_id", sort: "desc" }],
                        },
                      }}
                      slots={{ toolbar: CustomToolbar }}
                      showToolbar
                    />
                  )}
                </div>
              </div>
            </Paper>
          </Grid>
          <Grid
            size={{ xs: 12, lg: 2 }}
            className={classes.grid_item_search_box}
          >
            <Card className={classes.root}>
              <form onSubmit={handleSubmitForm(submitSearch)}>
                <CardContent className={classes.cardContent}>
                  <FormControl required className={classes.selectEmpty}>
                    <InputLabel
                      {...({
                        name: "alert-stream-select-required-label",
                      } as any)}
                    >
                      Catalog
                    </InputLabel>
                    <Controller
                      name="catalog"
                      control={control}
                      defaultValue={selectedCatalog || catalogOptions[0]}
                      rules={{ required: true }}
                      render={({ field: { onChange, value } }: any) => (
                        <Select value={value} onChange={onChange}>
                          {catalogOptions?.map((catalogName: any) => (
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
                    render={({ field: { onChange, value } }: any) => (
                      <TextField
                        margin="dense"
                        name="lc_id"
                        label="LC ID (optional)"
                        fullWidth
                        inputRef={register("lc_id", { required: false }) as any}
                        value={value}
                        onChange={onChange}
                      />
                    )}
                    name="lc_id"
                    control={control}
                  />
                  <Controller
                    render={({ field: { onChange, value } }: any) => (
                      <TextField
                        margin="dense"
                        name="ra"
                        label="RA [deg, HH:MM:SS, HHhMMmSSs]"
                        fullWidth
                        inputRef={register("ra", { required: false }) as any}
                        value={value}
                        onChange={onChange}
                      />
                    )}
                    name="ra"
                    control={control}
                  />
                  <Controller
                    render={({ field: { onChange, value } }: any) => (
                      <TextField
                        margin="dense"
                        name="dec"
                        label="Dec [deg, DD:MM:SS, DDdMMmSSs]"
                        fullWidth
                        inputRef={register("dec", { required: false }) as any}
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
                      render={({ field: { onChange, value } }: any) => (
                        <TextField
                          margin="dense"
                          name="radius"
                          label="Radius"
                          fullWidth
                          inputRef={
                            register("radius", { required: false }) as any
                          }
                          value={value}
                          onChange={onChange}
                        />
                      )}
                      name="radius"
                      control={control}
                    />
                    <Controller
                      name="radius_unit"
                      control={control}
                      rules={{ required: true }}
                      render={({ field: { onChange, value } }: any) => (
                        <Select
                          value={value}
                          onChange={onChange}
                          defaultValue="arcsec"
                          inputRef={
                            register("radius_unit", {
                              required: true,
                            }) as any
                          }
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
                        <ThemeProvider theme={getMuiPopoverTheme()}>
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
                  {...({ color: "primary" } as any)}
                  render={({ field: { onChange } }: any) => (
                    <RadioGroup
                      color="primary"
                      onChange={(event: any) => {
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
                        nearestSources?.map((source: any) => (
                          <FormControlLabel
                            key={source.id}
                            value={source.id}
                            control={<Radio />}
                            label={
                              <Chip
                                size="small"
                                label={`${source.id} (found within 5" from search position)`}
                                onDelete={() =>
                                  window.open(`/source/${source.id}`, "_blank")
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
                        render={({ field: { onChange, value } }: any) => (
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
              {saveNewSource && errors["group_ids"] && (
                <FormValidationError message="Select at least one group." />
              )}
              {userGroups.map((userGroup: any, idx: number) => (
                <FormControlLabel
                  key={userGroup.id}
                  control={
                    <Controller
                      name={`group_ids[${idx}]`}
                      control={control2}
                      rules={{ validate: validateGroups }}
                      defaultValue={false}
                      render={({ field: { onChange, value } }: any) => (
                        <Checkbox
                          color="primary"
                          disabled={!saveNewSource}
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
              <Button autoFocus onClick={handleSaveDialogClose} color="primary">
                Dismiss
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </div>
    </>
  );
};

export default Archive;
