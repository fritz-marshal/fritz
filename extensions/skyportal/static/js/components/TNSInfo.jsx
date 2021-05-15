import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";

import * as tnsInfoActions from "../ducks/tnsInfo";

const TNSInfo = ({ objID }) => {
  const dispatch = useDispatch();
  const tnsInfo = useSelector((state) => state.tnsInfo);

  useEffect(
    function fetchTNSInfo() {
      if (tnsInfo === null || !Object.keys(tnsInfo).includes(objID)) {
        dispatch(tnsInfoActions.fetchTNSInfo(objID));
      }
    },
    [objID, dispatch, tnsInfo]
  );

  if (tnsInfo === null || !Object.keys(tnsInfo).includes(objID)) {
    return <>Fetching TNS data...</>;
  }
  const objTnsInfo = tnsInfo[objID];
  return (
    <span>
      {objTnsInfo?.name ? (
        typeof objTnsInfo.name === "string" ? (
          <a
            href={`https://www.wis-tns.org/object/${objTnsInfo.name.split(" ")[1]}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {objTnsInfo.name}
          </a>
        ) : (
          objTnsInfo.name
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
