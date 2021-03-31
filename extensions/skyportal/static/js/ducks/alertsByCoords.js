import * as API from "../API";
import store from "../store";

const FETCH_NEARBY_ALERTS = "skyportal/FETCH_NEARBY_ALERTS";
const FETCH_NEARBY_ALERTS_OK = "skyportal/FETCH_NEARBY_ALERTS_OK";
const FETCH_NEARBY_ALERTS_ERROR = "skyportal/FETCH_NEARBY_ALERTS_ERROR";
const FETCH_NEARBY_ALERTS_FAIL = "skyportal/FETCH_NEARBY_ALERTS_FAIL";

export const fetchAlertsByCoords = ({ ra, dec, radius }) => (
    API.GET(
        `/api/alerts_by_coords/ztf?ra=${ra}&dec=${dec}&radius=${radius}&radius_units=arcsec`,
        FETCH_NEARBY_ALERTS
        )
);

const reducer = (state = null, action) => {
  switch (action.type) {
    case FETCH_NEARBY_ALERTS_OK: {
      return action.data;
    }
    case FETCH_NEARBY_ALERTS_ERROR: {
      return action.message;
    }
    case FETCH_NEARBY_ALERTS_FAIL: {
      return "uncaught error";
    }
    default:
      return state;
  }
};

store.injectReducer("alertsByCoords", reducer);
