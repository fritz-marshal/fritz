import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";

import * as tnsInfoActions from "../ducks/tnsInfo";

const TNSInfo = ({ objID }) => {
  const dispatch = useDispatch();
  const tnsInfo = useSelector((state) => state.tnsInfo);

  useEffect(
    () => {
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
      {
        objTnsInfo !== null && objTnsInfo?.length > 0 ?
        objTnsInfo.map((TNSMatch) => (
          <a
            key={TNSMatch.name}
            href={`https://www.wis-tns.org/object/${TNSMatch.name.split(" ")[1]}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {`${TNSMatch.name} `}
          </a>
        )) :
        `No matches found`
      }
    </span>
  );
};
TNSInfo.propTypes = {
  objID: PropTypes.string.isRequired,
};

export default TNSInfo;
