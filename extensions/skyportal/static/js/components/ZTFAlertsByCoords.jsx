import React, { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";

import PropTypes from "prop-types";
import {
  makeStyles,
  useTheme,
  createMuiTheme,
  MuiThemeProvider,
} from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";

import MUIDataTable from "mui-datatables";

import * as Actions from "../ducks/alertsByCoords";

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
  itemPaddingBottom: {
    paddingBottom: "0.5rem",
  },
  saveAlertButton: {
    margin: "0.5rem 0",
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
    padding: "1rem",
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
  columnItem: {
    margin: "0.5rem 0",
  },
  name: {
    fontSize: "200%",
    fontWeight: "900",
    color: "darkgray",
    paddingBottom: "0.25em",
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
  createMuiTheme({
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

const ZTFAlertsByCoords = ({ route }) => {
  const { ra, dec, radius } = route;
  console.log("ra, dec, radius:", ra, dec, radius);
  const dispatch = useDispatch();
  const history = useHistory();
  const [isFetched, setIsFetched] = useState(false);

  const userAccessibleGroups = useSelector(
    (state) => state.groups.userAccessible
  );

  const userAccessibleGroupIds = useSelector((state) =>
    state.groups.userAccessible?.map((a) => a.id)
  );

  const theme = useTheme();
  const darkTheme = theme.palette.type === "dark";

  const alerts = useSelector((state) => state.alertsByCoords);

  const makeRow = (alert) => {
    return {
      candid: alert?.candid,
      jd: alert?.candidate.jd,
      fid: alert?.candidate.fid,
      mag: alert?.candidate.magpsf,
      emag: alert?.candidate.sigmapsf,
      rb: alert?.candidate.rb,
      drb: alert?.candidate.drb,
      isdiffpos: alert?.candidate.isdiffpos,
      programid: alert?.candidate.programid,
    };
  };

  let rows = [];

  if (alerts !== null && !isString(alerts) && Array.isArray(alerts)) {
    rows = alerts.map((a) => makeRow(a));
  }

  useEffect(() => {
    const fetchAlerts = async () => {
      const data = await dispatch(Actions.fetchAlertsByCoords({ ra, dec, radius }));
      setIsFetched(true);
    };

    if (!isFetched) {
      fetchAlerts();
    }
  }, [dispatch, isFetched, ra, dec, radius]);

  const classes = useStyles();

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
      name: "mag",
      label: "mag",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value.toFixed(3),
      },
    },
    {
      name: "emag",
      label: "e_mag",
      options: {
        filter: false,
        sort: true,
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
  ];

  if (alerts === null || !isFetched) {
    return (
      <div>
        <CircularProgress color="secondary" />
      </div>
    );
  }
  if (isString(alerts)) {
    return <div>Failed to fetch alert data, please try again later.</div>;
  }
  if (alerts.length === 0) {
    return (
      <div>
        <Typography variant="h5" className={classes.header}>
          No matching alerts found
        </Typography>
      </div>
    );
  }
  return (
    <Paper elevation={1} className={classes.source}>
      <div>
        <Accordion
          expanded={panelAlertsExpanded}
          onChange={handlePanelAlertsExpandedChange(true)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel-content"
            id="alerts-panel-header"
          >
            <Typography className={classes.accordionHeading}>
              Alerts
            </Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordionDetails}>
            <div className={classes.accordionDetails}>
              <MuiThemeProvider theme={getMuiTheme(theme)}>
                <MUIDataTable
                  data={rows}
                  columns={columns}
                  options={options}
                />
              </MuiThemeProvider>
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
    </Paper>
  );
};

ZTFAlertsByCoords.propTypes = {
  route: PropTypes.shape({
    ra: PropTypes.string,
    dec: PropTypes.string,
    radius: PropTypes.string,
  }).isRequired,
};

export default ZTFAlertsByCoords;
