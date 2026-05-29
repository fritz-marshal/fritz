import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const AlertsSearchButton = ({
  ra,
  dec,
  radius = 3,
  survey = "ZTF",
  objectId = null,
}) => {
  const params = new URLSearchParams();
  params.set("survey", survey);
  params.set("group_by_obj", "true");
  if (objectId) params.set("objectId", objectId);
  if (ra != null) {
    params.set("ra", ra);
    params.set("dec", dec);
    params.set("radius", radius);
  }
  return (
    <Link
      to={`/alerts?${params.toString()}`}
      target="_blank"
      style={{ textDecoration: "none", color: "black" }}
    >
      {survey} Alerts
    </Link>
  );
};

AlertsSearchButton.propTypes = {
  ra: PropTypes.number,
  dec: PropTypes.number,
  radius: PropTypes.number,
  survey: PropTypes.string,
  objectId: PropTypes.string,
};

export default AlertsSearchButton;
