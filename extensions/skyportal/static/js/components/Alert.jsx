// import React from 'react';
import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {makeStyles} from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

// Import action creators from `static/js/ducks/alert.js`
import * as Actions from '../ducks/alert';


const useStyles = makeStyles({
    table: {
        minWidth: 650,
    },
});

function createRows(id, jd, mag, emag, rb, drb, isdiffpos) {
    return {id, jd, mag, emag, rb, drb, isdiffpos};
}

// function createRows(id, jd) {
//     return {id, jd};
// }


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

    return (
        <div>
            <div>
                <b>{objectId}</b>
                <br />
            </div>
            <div>

            </div>
            <div>
                <button type="button" onClick={() => dispatch(Actions.fetchAlertData(objectId))}>
                    Fetch alert data.
                </button>
                <br />
            </div>
            <TableContainer component={Paper}>
                <Table className={classes.table} size="small" aria-label="a dense table">
                    <TableHead>
                        <TableRow>
                            <TableCell>candid</TableCell>
                            <TableCell align="right">jd</TableCell>
                            <TableCell align="right">mag</TableCell>
                            <TableCell align="right">e_mag</TableCell>
                            <TableCell align="right">rb score</TableCell>
                            <TableCell align="right">drb score</TableCell>
                            <TableCell align="right">isdiffpos</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.name}>
                                <TableCell component="th" scope="row">
                                    {row.id}
                                </TableCell>
                                <TableCell align="right">{row.jd}</TableCell>
                                <TableCell align="right">{row.mag.toFixed(3)}</TableCell>
                                <TableCell align="right">{row.emag.toFixed(3)}</TableCell>
                                <TableCell align="right">{row.rb.toFixed(5)}</TableCell>
                                <TableCell align="right">{row.drb.toFixed(5)}</TableCell>
                                <TableCell align="right">{row.isdiffpos}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>

    );
};

export default Alert;