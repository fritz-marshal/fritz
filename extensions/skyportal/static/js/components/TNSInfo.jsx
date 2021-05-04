import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";

import * as tnsInfoActions from "../ducks/tnsInfo";

const TNSInfo = ({ objID }) => {
  const dispatch = useDispatch();
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const tnsInfo = useSelector((state) => state.tnsInfo);

  useEffect(
    function fetchTNSInfo() {
      if (!requestSubmitted) {
        dispatch(tnsInfoActions.fetchTNSInfo(objID));
        setRequestSubmitted(true);
      }
    },
    [objID, dispatch, requestSubmitted]
  );

  if (tnsInfo === null) {
    return <>Fetching TNS data...</>;
  }
  console.log(tnsInfo);
  return <span>tnsInfo.name</span>;
};
TNSInfo.propTypes = {
  objID: PropTypes.string.isRequired,
};

export default TNSInfo;
