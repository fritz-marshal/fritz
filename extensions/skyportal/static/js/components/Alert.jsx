// import React from 'react';
import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {makeStyles} from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

// Import action creators from `static/js/ducks/alert.js`
import * as Actions from '../ducks/alert';


const useStyles = makeStyles({
    root: {
        width: '100%',
    },
    container: {
        maxHeight: 440,
    },
// table: {
//     minWidth: 650,
// },
});

function createRows(id, jd, mag, emag, rb, drb, isdiffpos) {
    return {id, jd, mag, emag, rb, drb, isdiffpos};
}

const columns = [
    {id: 'id', label: 'candid', minWidth: 170},
    {
        id: 'jd',
        label: 'JD',
        minWidth: 170,
        align: 'right',
        format: (value) => value.toFixed(3),
    },
    {
        id: 'mag',
        label: 'mag',
        minWidth: 170,
        align: 'right',
        format: (value) => value.toFixed(3),
    },
    {
        id: 'emag',
        label: 'e_mag',
        minWidth: 170,
        align: 'right',
        format: (value) => value.toFixed(3),
    },
    {
        id: 'rb',
        label: 'rb score',
        minWidth: 170,
        align: 'right',
        format: (value) => value.toFixed(5),
    },
    {
        id: 'drb',
        label: 'drb score',
        minWidth: 170,
        align: 'right',
        format: (value) => value.toFixed(5),
    },
    {
        id: 'isdiffpos',
        label: 'isdiffpos',
        minWidth: 170,
        align: 'right'
    },
];


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
    // dispatch(Actions.fetchAlertData(objectId));
    const alert_data = useSelector((state) => state.alert_data);
    let candid = null;
    let rows = [];
    if (alert_data.alert_data !== null) {
        // candid = alert_data.alert_data[0].candid
        // const numbers = [1,2,3,4,5];
        candid = alert_data.alert_data.map(a => a.candid);
        rows = alert_data.alert_data.map(a => createRows(
            a.candid,
            a.candidate.jd,
            a.candidate.magpsf,
            a.candidate.sigmapsf,
            a.candidate.rb,
            a.candidate.drb,
            a.candidate.isdiffpos
        ));
    }
    // const candid = null

    const cachedObjectId = alert_data.alert_data ? route.id : null;
    const isCached = (route.id === cachedObjectId);

    useEffect(() => {
        const fetchAlert = async () => {
            const data = await dispatch(Actions.fetchAlertData(objectId));
            if (data.status === "success") {
                // dispatch(Actions.fetchAlertThumbnails(candid));
            }
        };

        if (!isCached) {
            fetchAlert();
        }
    }, [dispatch, isCached, route.id]);

    const classes = useStyles();
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    return (
        <div>
            <div>
                <h2>{objectId}</h2>
                {/*<br/>*/}
            </div>
            <div>
                <p>todo: light curve plot from prv_candidates</p>
                <p>todo: cross matches (with a plot interleaved on PS1 cutout?)</p>
            </div>
            {/*<div>*/}
            {/*    <button type="button" onClick={() => dispatch(Actions.fetchAlertData(objectId))}>*/}
            {/*        Fetch alert data.*/}
            {/*    </button>*/}
            {/*    <br/>*/}
            {/*</div>*/}
            <Paper className={classes.root}>
                <TableContainer className={classes.container}>
                    <Table stickyHeader size="small" aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        align={column.align}
                                        style={{minWidth: column.minWidth}}
                                    >
                                        {column.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
                                return (
                                    <TableRow hover role="checkbox" tabIndex={-1} key={row.code}>
                                        {columns.map((column) => {
                                            const value = row[column.id];
                                            return (
                                                <TableCell key={column.id} align={column.align}>
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