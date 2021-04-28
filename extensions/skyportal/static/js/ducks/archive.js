import * as API from "../API";
import store from "../store";

const FETCH_CATALOG_NAMES = "skyportal/FETCH_CATALOG_NAMES";
const FETCH_CATALOG_NAMES_OK = "skyportal/FETCH_CATALOG_NAMES_OK";
const FETCH_CATALOG_NAMES_ERROR = "skyportal/FETCH_CATALOG_NAMES_ERROR";
const FETCH_CATALOG_NAMES_FAIL = "skyportal/FETCH_CATALOG_NAMES_FAIL";

const FETCH_ZTF_LIGHT_CURVES = "skyportal/FETCH_ZTF_LIGHT_CURVES";
const FETCH_ZTF_LIGHT_CURVES_OK = "skyportal/FETCH_ZTF_LIGHT_CURVES_OK";
const FETCH_ZTF_LIGHT_CURVES_ERROR = "skyportal/FETCH_ZTF_LIGHT_CURVES_ERROR";
const FETCH_ZTF_LIGHT_CURVES_FAIL = "skyportal/FETCH_ZTF_LIGHT_CURVES_FAIL";

const SAVE_LIGHT_CURVES = "skyportal/SAVE_LIGHT_CURVES";

export const fetchCatalogNames = () => API.GET(
  `/api/archive_catalogs`,
  FETCH_CATALOG_NAMES
)

const reducerCatalogNames = (state = null, action) => {
  switch (action.type) {
    case FETCH_CATALOG_NAMES_OK: {
      return action.data;
    }
    case FETCH_CATALOG_NAMES_ERROR: {
      return action.message;
    }
    case FETCH_CATALOG_NAMES_FAIL: {
      return "uncaught error";
    }
    default:
      return state;
  }
};

// eslint-disable-next-line import/prefer-default-export
export const fetchZTFLightCurves = ({ catalog, ra, dec, radius }) => API.GET(
  `/api/archive?catalog=${catalog}&ra=${ra}&dec=${dec}&radius=${radius}&radius_units=arcsec`,
  FETCH_ZTF_LIGHT_CURVES
)

export function saveLightCurves(payload) {
  return API.POST(`/api/archive`, SAVE_LIGHT_CURVES, payload);
}

const reducer = (state = null, action) => {
  switch (action.type) {
    case FETCH_ZTF_LIGHT_CURVES_OK: {
      return action.data;
    }
    case FETCH_ZTF_LIGHT_CURVES_ERROR: {
      return action.message;
    }
    case FETCH_ZTF_LIGHT_CURVES_FAIL: {
      return "uncaught error";
    }
    default:
      return state;
  }
};

store.injectReducer("catalog_names", reducerCatalogNames);
store.injectReducer("ztf_light_curves", reducer);
