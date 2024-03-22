import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const ArchiveSearchButton = ({ ra, dec, radius = 3 }) => {
  return (
    <Link
      to={`/archive?ra=${ra}&dec=${dec}&radius=${radius}`}
      target="_blank"
      style={{ textDecoration: "none", color: "black" }}
    >
     {`ZTF Light Curves (DR)`}
    </Link>
  );
};

ArchiveSearchButton.propTypes = {
  ra: PropTypes.number.isRequired,
  dec: PropTypes.number.isRequired,
  radius: PropTypes.number,
};
ArchiveSearchButton.defaultProps = {
  radius: 3,
};

export default ArchiveSearchButton;
