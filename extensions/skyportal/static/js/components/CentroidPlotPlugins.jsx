import React from "react";
import makeStyles from '@mui/styles/makeStyles';

import * as archiveActions from "../ducks/archive";

const useStyles = makeStyles(() => ({
  centroidPlotDiv: (props) => ({
    flexBasis: "100%",
    display: "flex",
    flexFlow: "row wrap",
    width: props.width,
    height: props.height,
  }),
  infoLine: {
    // Get its own line
    flexBasis: "100%",
    display: "flex",
    flexFlow: "row wrap",
    padding: "0.5rem 0",
  },
  offsetLine: {
    // Get its own line
    flexBasis: "100%",
    display: "flex",
    flexFlow: "row wrap",
    padding: "0.25rem 0 0 0.75rem",
  },
}));

const CentroidPlotPlugins = ({plotData}) => {

  const newHeight = parseFloat(convert(size, "px")) + rootFont * 2;
  const classes = useStyles({ width: size, height: `${newHeight}px` });

  const ra = useSelector((state) => state.source.ra);
  const dec = useSelector((state) => state.source.dec);
  const radius = 10.0;

  const dispatch = useDispatch();
  const [loadedSourceId, setloadedSourceId] = React.useState("");

  useEffect(() => {
    if (loadedSourceId !== sourceId && ra && dec) {
      dispatch(archiveActions.fetchCrossMatches({ ra, dec, radius }));
      setloadedSourceId(sourceId);
    }
  }, [loadedSourceId, sourceId, ra, dec, radius, dispatch]);

  return (
     <div>
          {plotData.nearestSourceFromCatalog.length > 0 && (
            <div className={classes.infoLine}>
              Offsets from nearest sources in reference catalogs:
              {plotData.nearestSourceFromCatalog.map((source) => (
                <div key={source.catalog} className={classes.offsetLine}>
                  <b>{source.catalog}</b>: {source.minDistance.toFixed(2)}
                  &#8243;
                </div>
              ))}
            </div>
          )}
     </div>
    );
};

export default CentroidPlotPlugins;
