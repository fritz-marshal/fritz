import React from "react";
import Chip from "@mui/material/Chip";
import PropTypes from "prop-types";
import makeStyles from "@mui/styles/makeStyles";

import AlertsSearchButton from "./AlertsSearchButton";
import ArchiveSearchButton from "./ArchiveSearchButton";

import { useSourceStyles } from "./SourceDesktop";

const SourcePlugins = ({source}) => {
  const classes = useSourceStyles();

  return (
    <>
            <div>
              <div className={classes.infoLine}>
                  <div className={classes.infoButton}>
                    <AlertsSearchButton ra={source.ra} dec={source.dec} />
                  </div>
                  <div className={classes.infoButton}>
                    <ArchiveSearchButton ra={source.ra} dec={source.dec} />
                  </div>
              </div>
            </div>
    </>
  );
};

SourcePlugins.propTypes = {
  source: PropTypes.shape({
    id: PropTypes.string.isRequired,
    ra: PropTypes.number,
    dec: PropTypes.number,
    loadError: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    thumbnails: PropTypes.arrayOf(PropTypes.shape({})),
    redshift: PropTypes.number,
    redshift_error: PropTypes.number,
    groups: PropTypes.arrayOf(PropTypes.shape({})),
    gal_lon: PropTypes.number,
    gal_lat: PropTypes.number,
    dm: PropTypes.number,
    luminosity_distance: PropTypes.number,
    annotations: PropTypes.arrayOf(
      PropTypes.shape({
        origin: PropTypes.string.isRequired,
        data: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
      })
    ),
    classifications: PropTypes.arrayOf(
      PropTypes.shape({
        author_name: PropTypes.string,
        probability: PropTypes.number,
        modified: PropTypes.string,
        classification: PropTypes.string,
        id: PropTypes.number,
        obj_id: PropTypes.string,
        author_id: PropTypes.number,
        taxonomy_id: PropTypes.number,
        created_at: PropTypes.string,
      })
    ),
    followup_requests: PropTypes.arrayOf(PropTypes.any), // eslint-disable-line react/forbid-prop-types
    assignments: PropTypes.arrayOf(PropTypes.any), // eslint-disable-line react/forbid-prop-types
    redshift_history: PropTypes.arrayOf(PropTypes.any), // eslint-disable-line react/forbid-prop-types
    color_magnitude: PropTypes.arrayOf(
      PropTypes.shape({
        abs_mag: PropTypes.number,
        color: PropTypes.number,
        origin: PropTypes.string,
      })
    ),
    duplicates: PropTypes.arrayOf(PropTypes.string),
    alias: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};


export default SourcePlugins;
