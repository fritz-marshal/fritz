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
  return (
    <span>
      {tnsInfo?.name ? (
        typeof tnsInfo.name === "string" ? (
          <a
            href={`https://www.wis-tns.org/object/${tnsInfo.name.split(" ")[1]}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tnsInfo.name}
          </a>
        ) : (
          tnsInfo.name
        )
      ) : (
        `No matches found`
      )}
    </span>
  );
};
TNSInfo.propTypes = {
  objID: PropTypes.string.isRequired,
};

export default TNSInfo;
