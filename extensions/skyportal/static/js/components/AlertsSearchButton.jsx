import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";


const AlertsSearchButton = ({ ra, dec, radius = 3 }) => {
  return (
    <Link
      to={`/alerts?ra=${ra}&dec=${dec}&radius=${radius}&group_by_obj=true`}
      target="_blank"
      style={{ textDecoration: "none", color: "black" }}
    >
      ZTF Alerts
    </Link>
  );
};

AlertsSearchButton.propTypes = {
  ra: PropTypes.number.isRequired,
  dec: PropTypes.number.isRequired,
  radius: PropTypes.number,
};
AlertsSearchButton.defaultProps = {
  radius: 3,
};

export default AlertsSearchButton;
