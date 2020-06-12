// import React from 'react';
// import React, {useEffect, useState, Suspense} from 'react';
import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import styles from "./Alert.css";

import Button from '@material-ui/core/Button';
import SaveIcon from '@material-ui/icons/Save';
import PropTypes from 'prop-types';
import {lighten, withStyles, makeStyles} from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Paper from '@material-ui/core/Paper';

// import Plot from './Plot';
import Responsive from "./Responsive";
import FoldBox from "./FoldBox";

import Plot from 'react-plotly.js';
// import Moment from 'react-moment';

// Import action creators from `static/js/ducks/alert.js`
import * as Actions from '../ducks/alert';
import {FETCH_ALERT_ERROR, FETCH_ALERT_FAIL, FETCH_ALERT_OK} from "../ducks/alert";

// const VegaPlot = React.lazy(() => import(/* webpackChunkName: "VegaPlot" */ './VegaPlotAlert'));


const StyledTableCell = withStyles((theme) => ({
    head: {
        // backgroundColor: theme.palette.common.black,
        backgroundColor: "#111",
        // color: theme.palette.common.white,
        color: "#f0f0f0",
    },
    body: {
        fontSize: 14,
    },
}))(TableCell);


const useStyles = makeStyles({
    root: {
        width: '100%',
    },
    container: {
        maxHeight: 440,
    },
    visuallyHidden: {
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: 1,
        margin: -1,
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        top: 20,
        width: 1,
    },
    button: {
        "margin-bottom": "1em",
    },
// table: {
//     minWidth: 650,
// },
});

function createRows(id, jd, fid, mag, emag, rb, drb, isdiffpos) {
    return {id, jd, fid, mag, emag, rb, drb, isdiffpos};
}

const columns = [
    {
        id: 'id',
        label: 'candid',
        numeric: false,
        disablePadding: false,
        // minWidth: 170
    },
    {
        id: 'jd',
        numeric: true,
        disablePadding: false,
        label: 'JD',
        // minWidth: 170,
        align: 'left',
        format: (value) => value.toFixed(3),
    },
    {
        id: 'fid',
        numeric: true,
        disablePadding: false,
        label: 'fid',
        align: 'left',
    },
    {
        id: 'mag',
        numeric: true,
        disablePadding: false,
        label: 'mag',
        // minWidth: 170,
        align: 'left',
        format: (value) => value.toFixed(3),
    },
    {
        id: 'emag',
        numeric: true,
        disablePadding: false,
        label: 'e_mag',
        // minWidth: 170,
        align: 'left',
        format: (value) => value.toFixed(3),
    },
    {
        id: 'rb',
        numeric: true,
        disablePadding: false,
        label: 'rb score',
        // minWidth: 170,
        align: 'left',
        format: (value) => value.toFixed(5),
    },
    {
        id: 'drb',
        numeric: true,
        disablePadding: false,
        label: 'drb score',
        // minWidth: 170,
        align: 'left',
        format: (value) => value.toFixed(5),
    },
    {
        id: 'isdiffpos',
        numeric: false,
        disablePadding: false,
        label: 'isdiffpos',
        // minWidth: 170,
        align: 'left'
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
    return order === 'desc'
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
    const {classes, order, orderBy, onRequestSort} = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow>
                {columns.map((headCell) => (
                    <StyledTableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'default'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <span className={classes.visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
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
    classes: PropTypes.object.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    order: PropTypes.oneOf(['asc', 'desc']).isRequired,
    orderBy: PropTypes.string.isRequired,
};


function lc_colors(fid) {
    switch (fid) {
        case 1: {
            return '#28a745';
        }
        case 2: {
            return '#dc3545';
        }
        case 3: {
            return '#f3dc11';
        }
        default:
            return '#222';
    }
}

function filter_name(fid) {
    switch (fid) {
        case 1: {
            return 'ztfg';
        }
        case 2: {
            return 'ztfr';
        }
        case 3: {
            return 'ztfi';
        }
        default:
            return fid.toString();
    }
}

/*
- if no candid is specified, assemble lc, show table with detection history
  - actual alerts from ZTF_alerts have links that load in the thumbnails + alert contents on the right side
  - the latest candid is displayed on the right, lc plot shows a dashed vertical line for <jd>
- if candid is specified, display it on the right-hand side right away
  - on error (e.g., wrong candid) display the default, show error
- if objectId does not exist on K, display that info
*/


const Alert = ({route}) => {

    const objectId = route.id;
    const dispatch = useDispatch();

    const alert_data = useSelector((state) => state.alert_data);
    let candid = null;
    let rows = [];
    if (alert_data !== null) {
        candid = alert_data.map(a => a.candid);
        rows = alert_data.map(a => createRows(
            a.candid,
            a.candidate.jd,
            a.candidate.fid,
            a.candidate.magpsf,
            a.candidate.sigmapsf,
            a.candidate.rb,
            a.candidate.drb,
            a.candidate.isdiffpos
        ));
    }
    // const candid = null

    const alert_aux_data = useSelector((state) => state.alert_aux_data);
    let prv_candidates = {};
    let plot_data = [];
    if ((alert_aux_data !== null) && (alert_aux_data.length > 0)) {
        plot_data = [];
        prv_candidates = alert_aux_data[0].prv_candidates;
        const fids = Array.from(new Set(prv_candidates.map(c => c.fid)))

        // detections:
        for (const fid of fids) {
            // let jd = new JulianDate().julian(prv_candidates.filter(function(c) {return c.fid === fid}).map(c => c.jd));
            // let dt = moment.utc(jd.getDate());
            plot_data.push(
                {
                    x: prv_candidates.filter(function(c) {return c.fid === fid}).map(c => c.jd),
                    y: prv_candidates.filter(function(c) {return c.fid === fid}).map(c => c.magpsf),
                    error_y: {
                        type: 'data',
                        array: prv_candidates.filter(function(c) {return c.fid === fid}).map(c => c.sigmapsf),
                        width: 2,
                        thickness: 0.8,
                        color: lc_colors(fid),
                        opacity: 0.5,
                        visible: true
                    },
                    name: filter_name(fid),
                    type: 'scatter',
                    mode: 'markers',
                    showlegend: true,
                    marker: {color: lc_colors(fid)},
                }
            )
        }

        // limits:
        for (const fid of fids) {
            plot_data.push(
                {
                    x: prv_candidates.filter(function(c) {return c.fid === fid}).map(c => c.jd),
                    y: prv_candidates.filter(function(c) {return c.fid === fid}).map(c => c.diffmaglim),
                    name: filter_name(fid) + '_nodet_u',
                    type: 'scatter',
                    mode: 'markers',
                    showlegend: true,
                    marker: {symbol: 'triangle-down', color: lc_colors(fid), opacity: 0.4},
                }
            )
        }

    }

    const cachedObjectId = alert_data ? route.id : null;
    const isCached = (route.id === cachedObjectId);

    useEffect(() => {
        const fetchAlert = async () => {
            const data = await dispatch(Actions.fetchAlertData(objectId));
            if (data.status === "success") {
                const data_aux = await dispatch(Actions.fetchAuxData(objectId));
                // dispatch(Actions.fetchAlertThumbnails(candid));
            }
        };

        if (!isCached) {
            fetchAlert();
        }
    }, [dispatch, isCached, route.id]);

    const classes = useStyles();
    const [order, setOrder] = React.useState('desc');
    const [orderBy, setOrderBy] = React.useState('jd');
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const layout = {
        width: 900,
        height: 300,
        xaxis: {autorange: true},
        yaxis: {autorange: 'reversed'},
        margin: {b: 30, t: 30, l: 50, r: 50, pad: 1},
        // shapes: [{
        //     type: 'line',
        //     x0: '2019-06-09',
        //     y0: 0,
        //     x1: '2019-06-09',
        //     yref: 'paper',
        //     y1: 1,
        //     line: {
        //         color: 'grey',
        //         width: 1.5,
        //         dash: 'dot'
        //     }
        // }]
    };

    return (
        <div>
            <div>
                <h2>{objectId}</h2>
                {/*<br/>*/}
            </div>
            <div>
                {/*todo: redo light curve plot from prv_candidates with bokeh or vega?*/}
                {/*<Suspense fallback={<div>Loading plot...</div>}>*/}
                {/*  <VegaPlot*/}
                {/*    dataUrl={`/api/alerts/ztf/${objectId}`}*/}
                {/*  />*/}
                {/*</Suspense>*/}
                <Responsive
                    element={FoldBox}
                    title="Photometry"
                    mobileProps={{folded: true}}
                >
                    {/*<Plot className={styles.plot} url={`/api/internal/plot/photometry/14gqr`}/>*/}
                    {/*<Plot className={styles.plot} url={`/api/alerts/ztf/${objectId}/aux`}/>*/}
                    <Plot data={plot_data} layout={layout}/>
                </Responsive>
            </div>
            <div>
                <p>todo: cross matches (with a plot interleaved on PS1 cutout?)</p>
            </div>
            <div>
                <Button
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    startIcon={<SaveIcon/>}
                    // todo: save as a source to one of my programs button
                    // onClick={() => dispatch(Actions.saveSource(group_id, objectId, candid))}
                >
                    Save as a Source
                </Button>
                <br/>
            </div>
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
                                .map((row, index) => {

                                    return (
                                        <TableRow
                                            hover
                                            role="checkbox"
                                            tabIndex={-1}
                                            key={row.name}
                                        >
                                            {columns.map((column) => {
                                                const value = row[column.id];
                                                return (
                                                    <TableCell key={column.id}
                                                               align={column.numeric ? 'right' : 'left'}>
                                                        {column.format && typeof value === 'number' ? column.format(value) : value}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
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
        </div>

    );
};

export default Alert;