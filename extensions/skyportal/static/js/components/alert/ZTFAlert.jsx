import React, { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";

import Button from "@mui/material/Button";
import PropTypes from "prop-types";
import {
  useTheme,
  createTheme,
  ThemeProvider,
  StyledEngineProvider,
} from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";
import Grid from "@mui/material/Grid";
import AddIcon from "@mui/icons-material/Add";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Tooltip from "@mui/material/Tooltip";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

import MUIDataTable from "mui-datatables";
import ReactJson from "react-json-view";

import SaveAlertButton from "./SaveAlertButton";
import CopyAlertPhotometryDialog from "./CopyAlertPhotometryDialog";

import ThumbnailList from "../thumbnail/ThumbnailList";
import SharePage from "../SharePage";
import withRouter from "../withRouter";

import { ra_to_hours, dec_to_dms } from "../../units";

import * as Actions from "../../ducks/alert";
import { checkSource, fetchSource } from "../../ducks/source";
import { fetchSources } from "../../ducks/sources";

const VegaPlotZTFAlert = React.lazy(() => import("./VegaPlotZTFAlert"));

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
  container: {
    maxHeight: 440,
  },
  whitish: {
    color: "#f0f0f0",
  },
  itemPadding: {
    padding: "0.5rem 0 0.5rem 0",
  },
  saveAlertButton: {
    margin: "0.5rem 0 0 0",
    paddingTop: "0.5rem",
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
  heading: {
    fontSize: "1.0625rem",
    fontWeight: 500,
  },
  header: {
    paddingBottom: "0.625rem",
    color: theme.palette.text.primary,
  },

  accordionHeading: {
    fontSize: "1.25rem",
    fontWeight: theme.typography.fontWeightRegular,
  },
  accordionDetails: {
    width: "100%",
  },
  source: {
    padding: "2rem 0.25rem 1rem 1rem",
    display: "flex",
    flexDirection: "row",
  },
  column: {
    display: "flex",
    flexFlow: "column nowrap",
    verticalAlign: "top",
    flex: "0 2 100%",
    minWidth: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(12rem, 1fr)",
    gridAutoFlow: "row",
    gap: "0.5rem",
    width: "100%",
    height: "100%",
  },
  columnItem: {
    margin: "0.5rem 0",
  },
  name: {
    fontSize: "200%",
    fontWeight: "900",
    color: "darkgray",
    display: "inline-block",
  },
  alignRight: {
    display: "inline-block",
    verticalAlign: "super",
  },
  sourceInfo: {
    display: "flex",
    flexFlow: "row wrap",
    alignItems: "center",
  },
  position: {
    fontWeight: "bold",
    fontSize: "110%",
  },
}));

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

const getMuiTheme = (theme) =>
  createTheme({
    components: {
      MUIDataTableBodyCell: {
        styleOverrides: {
          root: {
            padding: `${theme.spacing(0.25)} 0px ${theme.spacing(
              0.25,
            )} ${theme.spacing(1)}`,
          },
        },
      },
    },
  });

const ZTFAlertPlot = ({ objectId, jd }) => {
  const aux_data = useSelector((state) => state.alert_aux_data);
  const [showUpperLimits, setShowUpperLimits] = useState(true);
  const [showForcedPhotometry, setShowForcedPhotometry] = useState(true);
  const [forcedPhotometrySNR, setForcedPhotometrySNR] = useState(3);

  // aux_data contains 2 fieldss: prv_candidates and fp_hists
  // we add an "origin" field to each fp_hists entry with the value "fp"
  // same for prv_candidates but value is null
  let photometry = [];
  if (aux_data && typeof aux_data === "object" && aux_data[objectId]) {
    photometry = (aux_data[objectId].prv_candidates || []).map((d) => {
      d.origin = "alert";
      return d;
    });

    const fp_hists = showForcedPhotometry
      ? (aux_data[objectId].fp_hists || []).map((d) => {
          d.origin = "fp";
          // for the forced photometry, we consider datapoints with SNR < forcedPhotometrySNR as upper limits
          if (d.snr > forcedPhotometrySNR) {
            d.magpsf = d.mag;
            d.sigmapsf = d.magerr;
          } else {
            d.magpsf = null;
            d.sigmapsf = null;
            if (d.magpsf) {
              // if it's a detection with SNR too low, we set diffmaglim to the detection mag
              // to make it an upper limit
              d.diffmaglim = d.magpsf;
            }
          }
          return d;
        })
      : [];
    photometry = photometry.concat(fp_hists);

    if (showUpperLimits === false) {
      photometry = photometry.filter((d) => d.magpsf);
    }
    // for each data point, add a filter_origin field that is the fid + / + origin
    photometry = photometry.map((d) => {
      if (d.origin === "alert") {
        d.filter_origin = `${d.fid}`;
      } else {
        d.filter_origin = `${d.fid}/${d.origin}`;
      }
      return d;
    });
  }

  if (!aux_data || aux_data[objectId] === null || jd === 0) {
    return <div>Loading photometry...</div>;
  }

  if (photometry.length === 0) {
    return <div>No photometry found</div>;
  }
  return (
    <div style={{ width: "100%", height: "90%" }}>
      <VegaPlotZTFAlert values={photometry || []} jd={jd} />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-start",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Switch
            checked={showUpperLimits}
            onChange={() => setShowUpperLimits(!showUpperLimits)}
            name="showUpperLimits"
            inputProps={{ "aria-label": "show upper limits" }}
          />
          <div>Upper limits</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Switch
            checked={showForcedPhotometry}
            onChange={() => setShowForcedPhotometry(!showForcedPhotometry)}
            name="showForcedPhotometry"
            inputProps={{ "aria-label": "show forced photometry" }}
          />
          <div>Forced photometry</div>
        </div>
        <TextField
          id="forcedPhotometrySNR"
          label="SNR Threshold (FP only)"
          type="number"
          value={forcedPhotometrySNR}
          size="small"
          onChange={(event) => setForcedPhotometrySNR(event.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </div>
    </div>
  );
};

ZTFAlertPlot.propTypes = {
  objectId: PropTypes.string.isRequired,
  jd: PropTypes.number.isRequired,
};

const ZTFAlert = ({ route }) => {
  const objectId = route.id;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // figure out if this objectId has been saved as Source.
  const [savedSource, setsavedSource] = useState(false);
  const [fetchedDuplicates, setFetchedDuplicates] = useState(false);

  const sources = useSelector((state) => state.sources.latest);
  const source = useSelector((state) => state.source);
  const loadedSourceId = useSelector((state) => state?.source?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const openDialog = () => {
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
  };

  useEffect(() => {
    const fetchExistingSource = async () => {
      dispatch(checkSource(objectId, { nameOnly: true })).then((response) => {
        if (response?.data !== "A source of that name does not exist.") {
          setsavedSource(true);
          dispatch(fetchSource(objectId));
        } else {
          setsavedSource(false);
        }
      });
    };
    if (objectId !== loadedSourceId) {
      fetchExistingSource();
    }
  }, [dispatch, objectId]);

  const userAccessibleGroups = useSelector(
    (state) => state.groups.userAccessible,
  );

  const userAccessibleGroupIds = useSelector((state) =>
    state.groups.userAccessible?.map((a) => a.id),
  );

  const theme = useTheme();
  const darkTheme = theme.palette.mode === "dark";

  const [panelXMatchExpanded, setPanelXMatchExpanded] = useState(true);

  const handlePanelXMatchChange = (panel) => (event, isExpanded) => {
    setPanelXMatchExpanded(isExpanded ? panel : false);
  };

  const [candid, setCandid] = useState(0);
  const [jd, setJd] = useState(0);

  const alert_data = useSelector((state) => state.alert_data);

  const makeRow = (alert) => ({
    candid: alert?.candid,
    jd: alert?.candidate.jd,
    fid: alert?.candidate.fid,
    magpsf: alert?.candidate.magpsf,
    sigmapsf: alert?.candidate.sigmapsf,
    rb: alert?.candidate.rb,
    drb: alert?.candidate.drb,
    isdiffpos: alert?.candidate.isdiffpos,
    programid: alert?.candidate.programid,
    alert_actions: "show thumbnails",
  });

  let rows = [];

  if (alert_data && alert_data[objectId] && !isString(alert_data[objectId])) {
    rows = alert_data[objectId]?.map((a) => makeRow(a));
  }

  const alert_aux_data = useSelector((state) => state.alert_aux_data);
  let cross_matches = {};

  if (
    alert_aux_data &&
    alert_data[objectId] &&
    !isString(alert_aux_data[objectId])
  ) {
    cross_matches = alert_aux_data[objectId]?.cross_matches;
    // const fids = Array.from(new Set(prv_candidates.map(c => c.fid)))
  }

  const cachedObjectId =
    alert_data &&
    alert_data[objectId] &&
    !isString(alert_data[objectId]) &&
    candid > 0
      ? route.id
      : null;

  const isCached = route.id === cachedObjectId;

  useEffect(() => {
    const fetchAlert = async () => {
      const data = await dispatch(Actions.fetchAlertData(objectId));
      if (data.status === "success") {
        // fetch aux data
        await dispatch(Actions.fetchAuxData(objectId));

        const candids = Array.from(
          new Set(data.data.map((c) => c.candid)),
        ).sort();
        const jds = Array.from(
          new Set(data.data.map((c) => c.candidate.jd)),
        ).sort();
        // grab the latest candid's thumbnails by default
        setCandid(candids[candids.length - 1]);
        setJd(jds[jds.length - 1]);

        // fetch potential duplicates
        dispatch(
          fetchSources({
            ra: data.data.filter(
              (a) => a.candid === candids[candids.length - 1],
            )[0].candidate.ra,
            dec: data.data.filter(
              (a) => a.candid === candids[candids.length - 1],
            )[0].candidate.dec,
            radius: 2 / 3600,
          }),
        ).then((response) => {
          if (response.status === "success") {
            setFetchedDuplicates(true);
          }
        });
      }
    };

    if (!isCached) {
      fetchAlert();
    }
  }, [dispatch, isCached, route.id, objectId]);

  const classes = useStyles();

  const thumbnails = [
    {
      type: "new",
      id: 0,
      public_url: `/api/alerts_cutouts?objectId=${objectId}&candid=${candid}&cutout=science`,
    },
    {
      type: "ref",
      id: 1,
      public_url: `/api/alerts_cutouts?objectId=${objectId}&candid=${candid}&cutout=template`,
    },
    {
      type: "sub",
      id: 2,
      public_url: `/api/alerts_cutouts?objectId=${objectId}&candid=${candid}&cutout=difference`,
    },
    // {
    //   type: "sdss",
    //   id: 3,
    //   public_url: `http://skyserver.sdss.org/dr12/SkyserverWS/ImgCutout/getjpeg?ra=${alert_data.filter((a) => a.candid === candid)[0].candidate.ra}&dec=${alert_data.filter((a) => a.candid === candid)[0].candidate.dec}&scale=0.3&width=200&height=200&opt=G&query=&Grid=on`
    // },
    // {
    //   type: "dr8",
    //   id: 4,
    //   public_url: `http://legacysurvey.org/viewer/jpeg-cutout?ra=${alert_data.filter((a) => a.candid === candid)[0].candidate.ra}&dec=${alert_data.filter((a) => a.candid === candid)[0].candidate.dec}&size=200&layer=dr8&pixscale=0.262&bands=grz`
    // },
  ];

  const options = {
    selectableRows: "none",
    elevation: 1,
    sortOrder: {
      name: "jd",
      direction: "desc",
    },
  };

  const columns = [
    {
      name: "candid",
      label: "candid",
      options: {
        filter: false,
        sort: true,
        sortDescFirst: true,
      },
    },
    {
      name: "jd",
      label: "JD",
      options: {
        filter: false,
        sort: true,
        sortDescFirst: true,
        // eslint-disable-next-line no-unused-vars
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(5),
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
        // eslint-disable-next-line no-unused-vars
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(3),
      },
    },
    {
      name: "sigmapsf",
      label: "sigmapsf",
      options: {
        filter: false,
        sort: true,
        // eslint-disable-next-line no-unused-vars
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(3),
      },
    },
    {
      name: "rb",
      label: "rb",
      options: {
        filter: false,
        sort: true,
        sortDescFirst: true,
        // eslint-disable-next-line no-unused-vars
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(5),
      },
    },
    {
      name: "drb",
      label: "drb",
      options: {
        filter: false,
        sort: true,
        sortDescFirst: true,
        // eslint-disable-next-line no-unused-vars
        customBodyRender: (value, tableMeta, updateValue) => value?.toFixed(5),
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
      name: "programid",
      label: "programid",
      options: {
        filter: true,
        sort: true,
      },
    },
    {
      name: "alert_actions",
      label: "actions",
      options: {
        filter: false,
        sort: false,
        // eslint-disable-next-line no-unused-vars
        customBodyRender: (value, tableMeta, updateValue) => (
          <Button
            size="small"
            onClick={() => {
              setCandid(tableMeta.rowData[0]);
              setJd(tableMeta.rowData[1]);
            }}
          >
            Show&nbsp;thumbnails
          </Button>
        ),
      },
    },
  ];

  if (alert_data && alert_data[objectId] === null) {
    return (
      <div>
        <CircularProgress color="secondary" />
      </div>
    );
  }
  if (
    isString(alert_data[objectId]) ||
    (alert_aux_data && isString(alert_aux_data[objectId]))
  ) {
    return <div>Failed to fetch alert data, please try again later.</div>;
  }
  if (alert_data[objectId]?.length === 0) {
    return (
      <div>
        <Typography variant="h5" className={classes.header}>
          {objectId} not found
        </Typography>
      </div>
    );
  }

  if (alert_data[objectId]?.length > 0) {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} lg={12}>
          <Paper>
            <Grid container spacing={0} style={{ paddingBottom: "1rem" }}>
              <Grid item xs={12} lg={6}>
                <div
                  style={{
                    padding: "0.5rem 1rem 0 1rem",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div>
                    <div className={classes.alignRight}>
                      <SharePage />
                    </div>
                    <div className={classes.name}>{objectId}</div>
                    {alert_aux_data[objectId]?.missing === true && (
                      <Chip
                        title="Lost aux data (including this object's non-detections and crossmatches) is being recovered in Kowalski. In the mean time, detections were fetched using the individual alerts instead"
                        size="small"
                        label="Warning: missing aux data"
                        style={{
                          backgroundColor: "#E9D502",
                        }}
                        icon={<WarningAmberIcon />}
                      />
                    )}
                  </div>
                  {candid > 0 && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div>
                        <b>candid:</b>&nbsp;{candid}
                      </div>
                      <div className={classes.sourceInfo}>
                        <b>Position (J2000):&nbsp; &nbsp;</b>
                        <div>
                          <span className={classes.position}>
                            {ra_to_hours(
                              alert_data[objectId].filter(
                                (a) => a.candid === candid,
                              )[0].candidate.ra,
                              ":",
                            )}
                            &nbsp;
                            {dec_to_dms(
                              alert_data[objectId].filter(
                                (a) => a.candid === candid,
                              )[0].candidate.dec,
                              ":",
                            )}
                            &nbsp;
                          </span>
                        </div>
                      </div>
                      <div className={classes.sourceInfo}>
                        <div>
                          (&alpha;,&delta;={" "}
                          {
                            alert_data[objectId].filter(
                              (a) => a.candid === candid,
                            )[0].candidate.ra
                          }
                          , &nbsp;
                          {
                            alert_data[objectId].filter(
                              (a) => a.candid === candid,
                            )[0].candidate.dec
                          }
                          ; &nbsp;
                        </div>
                        {candid > 0 &&
                          alert_data[objectId].filter(
                            (a) => a.candid === candid,
                          )[0].coordinates.b && (
                            <div>
                              &nbsp; l,b=
                              {alert_data[objectId]
                                .filter((a) => a.candid === candid)[0]
                                .coordinates?.l?.toFixed(6)}
                              , &nbsp;
                              {alert_data[objectId]
                                .filter((a) => a.candid === candid)[0]
                                .coordinates?.b?.toFixed(6)}
                              )
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                  {savedSource || loadedSourceId === objectId ? (
                    <div>
                      <div className={classes.itemPadding}>
                        <Chip
                          size="small"
                          label="Previously Saved"
                          clickable
                          onClick={() => navigate(`/source/${objectId}`)}
                          onDelete={() =>
                            window.open(`/source/${objectId}`, "_blank")
                          }
                          deleteIcon={<OpenInNewIcon />}
                          color="primary"
                        />
                      </div>
                      {source.groups?.map((group) => (
                        <Tooltip
                          title={`Saved at ${group.saved_at} by ${group.saved_by?.username}`}
                          key={group.id}
                        >
                          <Chip
                            label={
                              group.nickname
                                ? group.nickname.substring(0, 15)
                                : group.name.substring(0, 15)
                            }
                            size="small"
                            className={classes.chip}
                            data-testid={`groupChip_${group.id}`}
                          />
                        </Tooltip>
                      ))}
                      <div className={classes.itemPadding}>
                        <div className={classes.saveAlertButton}>
                          <SaveAlertButton
                            alert={{
                              id: objectId,
                              candid,
                              group_ids: userAccessibleGroupIds,
                            }}
                            userGroups={userAccessibleGroups}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={classes.itemPadding}>
                      <Chip size="small" label="NOT SAVED" />
                      <br />
                      <div className={classes.saveAlertButton}>
                        <SaveAlertButton
                          alert={{
                            id: objectId,
                            candid,
                            group_ids: userAccessibleGroupIds,
                          }}
                          userGroups={userAccessibleGroups}
                        />
                      </div>
                    </div>
                  )}
                  {fetchedDuplicates &&
                    sources?.sources?.length > 0 &&
                    !(
                      sources?.sources?.length === 1 &&
                      sources?.sources[0].id === objectId
                    ) && (
                      <div className={classes.infoLine}>
                        <div className={classes.sourceInfo}>
                          <b>
                            <font color="#457b9d">Possible duplicate of:</font>
                          </b>
                          &nbsp;
                          {sources.sources.map(
                            (dup) =>
                              dup?.id !== objectId && (
                                <div key={dup?.id}>
                                  <Link
                                    to={`/source/${dup?.id}`}
                                    role="link"
                                    key={dup?.id}
                                  >
                                    <Button size="small">{dup?.id}</Button>
                                  </Link>
                                  <Button
                                    size="small"
                                    type="button"
                                    name={`copySourceButton${dup?.id}`}
                                    onClick={() => openDialog(dup?.id)}
                                    className={classes.sourceCopy}
                                  >
                                    <AddIcon />
                                  </Button>
                                  <CopyAlertPhotometryDialog
                                    alert={
                                      alert_data[objectId].filter(
                                        (a) => a.candid === candid,
                                      )[0]
                                    }
                                    duplicate={dup}
                                    dialogOpen={dialogOpen}
                                    closeDialog={closeDialog}
                                  />
                                </div>
                              ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </Grid>
              <Grid item xs={12} lg={6}>
                {candid > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "0.5rem",
                      gridAutoFlow: "row",
                      padding: "1rem 1rem 0 1rem",
                    }}
                  >
                    <ThumbnailList
                      ra={
                        alert_data[objectId].filter(
                          (a) => a.candid === candid,
                        )[0].candidate.ra
                      }
                      dec={
                        alert_data[objectId].filter(
                          (a) => a.candid === candid,
                        )[0].candidate.dec
                      }
                      thumbnails={thumbnails}
                      displayTypes={["new", "ref", "sub"]}
                      useGrid={false}
                      noMargin
                      size="100%"
                      minSize="5rem"
                      maxSize="24vh"
                    />
                  </div>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={12}>
          <Suspense fallback={<CircularProgress color="secondary" />}>
            <Paper
              style={{
                width: "100%",
                height: "55vh",
                padding: "1rem 0.5rem 0.5rem 0.5rem",
                backgroundColor: "white",
              }}
            >
              <ZTFAlertPlot objectId={objectId} jd={jd} />
            </Paper>
          </Suspense>
        </Grid>

        <Grid item xs={12} lg={12}>
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={getMuiTheme(theme)}>
              <MUIDataTable
                data={rows}
                columns={columns}
                options={options}
                title="Alerts"
              />
            </ThemeProvider>
          </StyledEngineProvider>
        </Grid>

        <Grid item xs={12} lg={12}>
          <Accordion
            expanded={panelXMatchExpanded}
            onChange={handlePanelXMatchChange(true)}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel-content"
              id="xmatch-panel-header"
            >
              <Typography className={classes.accordionHeading}>
                Cross-matches
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.accordionDetails}>
              <ReactJson
                src={cross_matches}
                name={false}
                theme={darkTheme ? "monokai" : "rjv-default"}
              />
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    );
  }
  return <div>Error rendering page...</div>;
};

ZTFAlert.propTypes = {
  route: PropTypes.shape({
    id: PropTypes.string,
  }).isRequired,
};

export default withRouter(ZTFAlert);
