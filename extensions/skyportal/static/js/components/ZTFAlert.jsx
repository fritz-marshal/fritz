import React, { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";

import Button from "@material-ui/core/Button";
import SaveIcon from "@material-ui/icons/Save";
import PropTypes from "prop-types";
import { makeStyles, useTheme, createMuiTheme, MuiThemeProvider } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";

import MUIDataTable from "mui-datatables";

import ThumbnailList from "./ThumbnailList";
import ReactJson from "react-json-view";

import * as Actions from "../ducks/alert";

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
  heading: {
    fontSize: "1.0625rem",
    fontWeight: 500,
  },
  header: {
    paddingBottom: "0.625rem",
    color: theme.palette.text.primary,
  },
}));

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

const getMuiTheme = (theme) =>
  createMuiTheme({
    overrides: {
      MUIDataTableBodyCell: {
        root: {
          padding: `${theme.spacing(0.25)}px 0px ${theme.spacing(0.25)}px ${theme.spacing(1)}px`,
        },
      },
    },
  });

const ZTFAlert = ({ route }) => {
  const objectId = route.id;
  const dispatch = useDispatch();

  const theme = useTheme();
  const darkTheme = theme.palette.type === "dark";

  const [
    panelPhotometryThumbnailsExpanded,
    setPanelPhotometryThumbnailsExpanded,
  ] = useState(true);

  const handlePanelPhotometryThumbnailsChange = (panel) => (
    event,
    isExpanded
  ) => {
    setPanelPhotometryThumbnailsExpanded(isExpanded ? panel : false);
  };

  const [panelXMatchExpanded, setPanelXMatchExpanded] = useState(true);

  const handlePanelXMatchChange = (panel) => (event, isExpanded) => {
    setPanelXMatchExpanded(isExpanded ? panel : false);
  };

  const [candid, setCandid] = useState(0);
  const [jd, setJd] = useState(0);

  const alert_data = useSelector((state) => state.alert_data);

  const makeRow = (alert) => {
    return {
      "candid": alert?.candid,
      "jd": alert?.candidate.jd,
      "fid": alert?.candidate.fid,
      "mag": alert?.candidate.magpsf,
      "emag": alert?.candidate.sigmapsf,
      "rb": alert?.candidate.rb,
      "drb": alert?.candidate.drb,
      "isdiffpos": alert?.candidate.isdiffpos,
      "programid": alert?.candidate.programid,
      "alert_actions": "show thumbnails",
    }
  }

  let rows = [];

  if (alert_data !== null && !isString(alert_data)) {
    rows = alert_data?.map((a) => makeRow(a));
  }

  const alert_aux_data = useSelector((state) => state.alert_aux_data);
  let cross_matches = {};

  if (alert_aux_data !== null && !isString(alert_aux_data)) {
    cross_matches = alert_aux_data.cross_matches;
    // const fids = Array.from(new Set(prv_candidates.map(c => c.fid)))
  }

  const cachedObjectId =
    alert_data !== null && !isString(alert_data) && candid > 0
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
          new Set(data.data.map((c) => c.candid))
        ).sort();
        const jds = Array.from(
          new Set(data.data.map((c) => c.candidate.jd))
        ).sort();
        // grab the latest candid's thumbnails by default
        setCandid(candids[candids.length - 1]);
        setJd(jds[jds.length - 1]);
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
      public_url: `/api/alerts/ztf/${objectId}/cutout?candid=${candid}&cutout=science&file_format=png`,
    },
    {
      type: "ref",
      id: 1,
      public_url: `/api/alerts/ztf/${objectId}/cutout?candid=${candid}&cutout=template&file_format=png`,
    },
    {
      type: "sub",
      id: 2,
      public_url: `/api/alerts/ztf/${objectId}/cutout?candid=${candid}&cutout=difference&file_format=png`,
    },
  ];

  const options = {
  selectableRows: "none"
}

const columns = [
  {
    name: "candid",
    label: "candid",
    options: {
      filter: false,
      sort: true,
    }
  },
  {
    name: "jd",
    label: "JD",
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => (
        value.toFixed(5)
      )
    }
  },
  {
    name: "fid",
    label: "fid",
    options: {
      filter: true,
      sort: true,
    }
  },
  {
    name: "mag",
    label: "mag",
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => (
        value.toFixed(3)
      )
    }
  },
  {
    name: "emag",
    label: "e_mag",
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => (
        value.toFixed(3)
      )
    }
  },
  {
    name: "rb",
    label: "rb",
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => (
        value.toFixed(5)
      )
    }
  },
  {
    name: "drb",
    label: "drb",
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => (
        value.toFixed(5)
      )
    }
  },
  {
    name: "isdiffpos",
    label: "isdiffpos",
    options: {
      filter: true,
      sort: true,
    }
  },
  {
    name: "programid",
    label: "programid",
    options: {
      filter: true,
      sort: true,
    }
  },
  {
    name: "alert_actions",
    label: "actions",
    options: {
      filter: false,
      sort: false,
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
      )
    }
  },
];

  if (alert_data === null) {
    return <div><CircularProgress color="secondary" /></div>;
  }
  if (isString(alert_data) || isString(alert_aux_data)) {
    return <div>Failed to fetch alert data, please try again later.</div>;
  }
  if (alert_data.length === 0) {
    return (
      <div>
        <Typography variant="h5" className={classes.header}>
          {objectId} not found
        </Typography>
      </div>
    );
  }
  if (alert_data.length > 0) {
    return (
      <div>
        <Typography variant="h5" className={classes.header}>
          {objectId}
          <Button
            variant="contained"
            color="primary"
            className={classes.margin_left}
            startIcon={<SaveIcon />}
            // todo: save as a source to one of my programs button
            // onClick={() => dispatch(Actions.saveSource(group_id, objectId, candid))}
          >
            Save as a Source
          </Button>
        </Typography>

        <Accordion
          expanded={panelPhotometryThumbnailsExpanded}
          onChange={handlePanelPhotometryThumbnailsChange(true)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel-content"
            id="panel-header"
          >
            <Typography className={classes.heading}>
              Photometry and cutouts
            </Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordion_details}>
            <Grid container spacing={2}>
              <Grid item xs={12} lg={6}>
                <Suspense fallback={<div>Loading plot...</div>}>
                  <VegaPlotZTFAlert
                    dataUrl={`/api/alerts/ztf/${objectId}/aux`}
                    jd={jd}
                  />
                </Suspense>
              </Grid>
              <Grid
                container
                item
                xs={12}
                lg={6}
                spacing={1}
                className={classes.image}
                alignItems={"stretch"}
                alignContent={"stretch"}
              >
                {candid > 0 && (
                  <ThumbnailList
                    ra={0}
                    dec={0}
                    thumbnails={thumbnails}
                    size="10rem"
                  />
                )}
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Paper className={classes.root}>
          <MuiThemeProvider theme={getMuiTheme(theme)}>
            <MUIDataTable
              title={"Alerts"}
              data={rows}
              columns={columns}
              options={options}
            />
          </MuiThemeProvider>
        </Paper>

        <Accordion
          expanded={panelXMatchExpanded}
          onChange={handlePanelXMatchChange(true)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel-content"
            id="panel-header"
          >
            <Typography className={classes.heading}>Cross-matches</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordion_details}>
            <ReactJson src={cross_matches} name={false} theme={darkTheme ? "monokai" : "rjv-default"}/>
          </AccordionDetails>
        </Accordion>
      </div>
    );
  }
  return <div>Error rendering page...</div>;
};

ZTFAlert.propTypes = {
  route: PropTypes.shape({
    id: PropTypes.string,
  }).isRequired,
};

export default ZTFAlert;
