import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Paper from "@mui/material/Paper";
import makeStyles from "@mui/styles/makeStyles";
import CircularProgress from "@mui/material/CircularProgress";

import * as kowalskiFilterActions from "../../ducks/kowalski_filter";
import * as filterActions from "../../ducks/filter";

import BoomFilterPlugins from "./boom/BoomFilterPlugins";
import KowalskiFilterPlugins from "./kowalski/KowalskiFilterPlugins";

const useStyles = makeStyles((theme) => ({
  paperDiv: {
    padding: "1rem",
    height: "100%",
  },
}));

const FilterPlugins = ({ group }) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const { fid } = useParams();

  const filter = useSelector((state) => state.filter);
  const [filterOrigin, setFilterOrigin] = useState(null);

  useEffect(() => {
    if (!fid || isNaN(fid)) {
      return;
    }
    if (parseFloat(fid) !== filter?.id) {
      dispatch(filterActions.fetchFilter(fid));
    }

    if (filterOrigin || !filter) {
      return;
    }
    // Determine filter origin
    if (filter?.altdata?.boom) {
      setFilterOrigin("boom");
    } else {
      // Check if filter exists in Kowalski (we call the API directy and not via the
      // Redux action o avoid toast notifications for status codes other than 200)
      fetch(`/api/kowalski/filters/${fid}/v`)
        .then((response) => {
          if (response.status === 200) {
            console.log(
              "Filter found in Kowalski, setting filter origin to kowalski",
            );
            setFilterOrigin("kowalski");
          } else if (response.status === 404) {
            console.log(
              "Filter not found in Kowalski, setting filter origin to boom",
            );
            setFilterOrigin("boom");
          } else {
            console.error(
              `Unexpected response status ${response.status} when determining filter origin`,
            );
            setFilterOrigin("boom");
          }
        })
        .catch(() => {
          console.error("Error occurred while determining filter origin");
          setFilterOrigin("unknown");
        });
    }
  }, [fid, filter]);

  const allGroups = useSelector((state) => state.groups.all);

  const groupLookUp = {};

  allGroups?.forEach((g) => {
    groupLookUp[g.id] = g;
  });

  if (!filter || filterOrigin === null) {
    return (
      <Paper className={classes.paperDiv}>
        <CircularProgress />
      </Paper>
    );
  }

  if (filterOrigin === "boom") {
    return <BoomFilterPlugins group={group} />;
  } else if (filterOrigin === "kowalski") {
    return <KowalskiFilterPlugins group={group} />;
  } else {
    return (
      <Paper className={classes.paperDiv}>
        <div>Unable to determine filter type.</div>
      </Paper>
    );
  }
};

FilterPlugins.propTypes = {
  group: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    group_users: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        user_id: PropTypes.number,
        roles: PropTypes.arrayOf(PropTypes.string),
        admin: PropTypes.bool,
      }),
    ),
  }).isRequired,
};

export default FilterPlugins;
