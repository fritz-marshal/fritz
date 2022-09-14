import React from "react";
import PropTypes from "prop-types";

import TNSInfo from "./TNSInfo";

const CandidatePlugins = ({candidate}) => {

  return (
    <>
      <b>TNS:&nbsp;</b>
      <TNSInfo objID={candidate.id} />
    </>
  );
};

CandidatePlugins.propTypes = {
  candidate: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};


export default CandidatePlugins;
