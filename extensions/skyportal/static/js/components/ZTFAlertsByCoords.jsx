import React, { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, Link } from "react-router-dom";

import PropTypes from "prop-types";
import {
  makeStyles,
  useTheme,
  createMuiTheme,
  MuiThemeProvider,
} from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import MUIDataTable from "mui-datatables";

import ThumbnailList from "./ThumbnailList";
import { ra_to_hours, dec_to_dms } from "../units";
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
    width: "100%",
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
  button: {
    textTransform: "none",
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
      objectId: alert?.objectId,
      candid: alert?.candid,
      jd: alert?.candidate.jd,
      ra: alert?.candidate.ra,
      dec: alert?.candidate.dec,
      drb: alert?.candidate.drb,
      acai_h: alert?.classifications?.acai_h,
      acai_n: alert?.classifications?.acai_n,
      acai_o: alert?.classifications?.acai_o,
      acai_v: alert?.classifications?.acai_v,
      acai_b: alert?.classifications?.acai_b,
      fid: alert?.candidate.fid,
      magpsf: alert?.candidate.magpsf,
      sigmapsf: alert?.candidate.sigmapsf,
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

  // This is just passed to MUI datatables options -- not meant to be instantiated directly.
  const renderPullOutRow = (rowData, rowMeta) => {
    const colSpan = rowData.length + 1;
    const alertData = alerts[rowMeta.dataIndex];
    const thumbnails = [
      {
        type: "new",
        id: 0,
        public_url: `/api/alerts/ztf/${alertData.objectId}/cutout?candid=${alertData.candid}&cutout=science&file_format=png`,
      },
      {
        type: "ref",
        id: 1,
        public_url: `/api/alerts/ztf/${alertData.objectId}/cutout?candid=${alertData.candid}&cutout=template&file_format=png`,
      },
      {
        type: "sub",
        id: 2,
        public_url: `/api/alerts/ztf/${alertData.objectId}/cutout?candid=${alertData.candid}&cutout=difference&file_format=png`,
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
          <Link to={`/alerts/ztf/${value}`} role="link">
            <Button className={classes.button} size="small" variant="contained">{value}</Button>
          </Link>
        ),
      },
    },
    {
      name: "candid",
      label: "candid",
      options: {
        filter: false,
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
      label: "RA",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => ra_to_hours(value, ":"),
      },
    },
    {
      name: "dec",
      label: "Dec.",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => dec_to_dms(value, ":"),
      },
    },
    {
      name: "drb",
      label: "drb",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_h",
      label: "acai_h",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_n",
      label: "acai_n",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_o",
      label: "acai_o",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_v",
      label: "acai_v",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
      },
    },
    {
      name: "acai_b",
      label: "acai_b",
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => value ? value.toFixed(5) : value,
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
  ];

  if (alerts === null || !isFetched) {
    return (
      <div>
        <CircularProgress color="secondary" />
      </div>
    );
  }
  if (isString(alerts)) {
    return <div>Failed to fetch alert data.</div>;
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
        <Typography className={classes.accordionHeading}>
          Alerts within {radius} arcseconds of ({ra}, {dec})
        </Typography>
        <div className={classes.accordionDetails}>
          <MuiThemeProvider theme={getMuiTheme(theme)}>
            <MUIDataTable
              data={rows}
              columns={columns}
              options={options}
            />
          </MuiThemeProvider>
        </div>
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
