import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { showNotification } from "baselayer/components/Notifications";
import * as archiveActions from "../ducks/archive";

const ArchiveSearchButton = ({ ra, dec, radius = 3 }) => {
  const dispatch = useDispatch();
  const catalogNames = useSelector((state) => state.catalog_names);

  useEffect(() => {
    const fetchCatalogNames = () => {
      dispatch(archiveActions.fetchCatalogNames());
    };
    if (!catalogNames) {
      fetchCatalogNames();
    }
  }, [catalogNames, dispatch]);

  const ZTFLightCurveCatalogNames = Array.isArray(catalogNames)
    ? catalogNames?.filter((name) => name.indexOf("ZTF_sources_202") !== -1)
    : null;

  const catalog = ZTFLightCurveCatalogNames
    ? ZTFLightCurveCatalogNames[0]
    : null;

  const handleClick = () => {
    if (catalog) {
      dispatch(
        archiveActions.fetchZTFLightCurves({ catalog, ra, dec, radius }),
      );
      dispatch(archiveActions.fetchNearestSources({ ra, dec }));
    } else {
      dispatch(
        showNotification(
          "Catalog names could not be fetched; enter search criteria manually",
          "warning",
        ),
      );
    }
  };

  return (
    <Link
      to="/archive"
      target="_blank"
      onClick={handleClick}
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
