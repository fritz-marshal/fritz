import React, { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";

import Button from "@material-ui/core/Button";
import SaveIcon from "@material-ui/icons/Save";
import PropTypes from "prop-types";
import { withStyles, makeStyles, useTheme } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import TableSortLabel from "@material-ui/core/TableSortLabel";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";

import ThumbnailList from "./ThumbnailList";
import ReactJson from "react-json-view";

import * as Actions from "../ducks/alert";

const VegaPlot = React.lazy(() => import("./VegaPlotZTFAlert"));

const StyledTableCell = withStyles(() => ({
  body: {
    fontSize: "0.875rem",
  },
}))(TableCell);

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

function createRows(
  id,
  jd,
  fid,
  mag,
  emag,
  rb,
  drb,
  isdiffpos,
  programid,
  alert_actions
) {
  return {
    id,
    jd,
    fid,
    mag,
    emag,
    rb,
    drb,
    isdiffpos,
    programid,
    alert_actions,
  };
}

const columns = [
  {
    id: "id",
    label: "candid",
    numeric: false,
    disablePadding: false,
  },
  {
    id: "jd",
    numeric: true,
    disablePadding: false,
    label: "JD",
    align: "left",
    format: (value) => value.toFixed(5),
  },
  {
    id: "fid",
    numeric: true,
    disablePadding: false,
    label: "fid",
    align: "left",
  },
  {
    id: "mag",
    numeric: true,
    disablePadding: false,
    label: "mag",
    align: "left",
    format: (value) => value.toFixed(3),
  },
  {
    id: "emag",
    numeric: true,
    disablePadding: false,
    label: "e_mag",
    align: "left",
    format: (value) => value.toFixed(3),
  },
  {
    id: "rb",
    numeric: true,
    disablePadding: false,
    label: "rb",
    align: "left",
    format: (value) => value.toFixed(5),
  },
  {
    id: "drb",
    numeric: true,
    disablePadding: false,
    label: "drb",
    align: "left",
    format: (value) => value.toFixed(5),
  },
  {
    id: "isdiffpos",
    numeric: false,
    disablePadding: false,
    label: "isdiffpos",
    align: "left",
  },
  {
    id: "programid",
    numeric: true,
    disablePadding: false,
    label: "programid",
    align: "left",
  },
  {
    id: "alert_actions",
    numeric: false,
    disablePadding: false,
    label: "actions",
    align: "right",
  },
];

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

function EnhancedTableHead(props) {
  const { classes, order, orderBy, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {columns.map((headCell) => (
          <StyledTableCell
            key={headCell.id}
            align={headCell.numeric ? "right" : "left"}
            padding={headCell.disablePadding ? "none" : "default"}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <span className={classes.visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </span>
              ) : null}
            </TableSortLabel>
          </StyledTableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  classes: PropTypes.shape({
    visuallyHidden: PropTypes.any,
  }).isRequired,
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(["asc", "desc"]).isRequired,
  orderBy: PropTypes.string.isRequired,
};

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

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
  let rows = [];

  if (alert_data !== null && !isString(alert_data)) {
    rows = alert_data.map((a) =>
      createRows(
        a.candid,
        a.candidate.jd,
        a.candidate.fid,
        a.candidate.magpsf,
        a.candidate.sigmapsf,
        a.candidate.rb,
        a.candidate.drb,
        a.candidate.isdiffpos,
        a.candidate.programid,
        <Button
          size="small"
          onClick={() => {
            setCandid(a.candid);
            setJd(a.candidate.jd);
          }}
        >
          Show&nbsp;thumbnails
        </Button>
      )
    );
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
  const [order, setOrder] = React.useState("desc");
  const [orderBy, setOrderBy] = React.useState("jd");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

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
            // fixme: once that is implemented
            style={{ display: "none" }}
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
                  <VegaPlot
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
          <TableContainer className={classes.container}>
            <Table stickyHeader size="small" aria-label="sticky table">
              <EnhancedTableHead
                classes={classes}
                order={order}
                orderBy={orderBy}
                onRequestSort={handleRequestSort}
              />
              <TableBody>
                {stableSort(rows, getComparator(order, orderBy))
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
                    <TableRow
                      hover
                      role="checkbox"
                      tabIndex={-1}
                      key={row.name}
                    >
                      {columns.map((column) => {
                        const value = row[column.id];
                        return (
                          <TableCell
                            key={column.id}
                            align={column.numeric ? "right" : "left"}
                          >
                            {column.format && typeof value === "number"
                              ? column.format(value)
                              : value}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={rows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
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
            <Typography className={classes.heading}>Cross matches</Typography>
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
