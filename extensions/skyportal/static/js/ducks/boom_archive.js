import * as API from "../API";
import store from "../store";

const FETCH_CATALOG_NAMES = "skyportal/FETCH_CATALOG_NAMES";
const FETCH_CATALOG_NAMES_OK = "skyportal/FETCH_CATALOG_NAMES_OK";
const FETCH_CATALOG_NAMES_ERROR = "skyportal/FETCH_CATALOG_NAMES_ERROR";
const FETCH_CATALOG_NAMES_FAIL = "skyportal/FETCH_CATALOG_NAMES_FAIL";

const FETCH_CROSS_MATCHES = "skyportal/FETCH_CROSS_MATCHES";
const FETCH_CROSS_MATCHES_OK = "skyportal/FETCH_CROSS_MATCHES_OK";
const FETCH_CROSS_MATCHES_ERROR = "skyportal/FETCH_CROSS_MATCHES_ERROR";
const FETCH_CROSS_MATCHES_FAIL = "skyportal/FETCH_CROSS_MATCHES_FAIL";

const FETCH_NEAREST_SOURCES = "skyportal/FETCH_NEAREST_SOURCES";
const FETCH_NEAREST_SOURCES_OK = "skyportal/FETCH_NEAREST_SOURCES_OK";
const FETCH_NEAREST_SOURCES_ERROR = "skyportal/FETCH_NEAREST_SOURCES_ERROR";
const FETCH_NEAREST_SOURCES_FAIL = "skyportal/FETCH_NEAREST_SOURCES_FAIL";

export const fetchCatalogNames = () =>
  API.GET("/api/boom/archive/catalogs", FETCH_CATALOG_NAMES);

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

export const fetchCrossMatches = ({ ra, dec, radius }) =>
  API.GET(
    `/api/boom/archive/cross_match?ra=${ra}&dec=${dec}&radius=${radius}&radius_units=arcsec`,
    FETCH_CROSS_MATCHES,
  );

const reducerCrossMatches = (state = null, action) => {
  switch (action.type) {
    case FETCH_CROSS_MATCHES_OK: {
      return action.data;
    }
    case FETCH_CROSS_MATCHES_ERROR: {
      return action.message;
    }
    case FETCH_CROSS_MATCHES_FAIL: {
      return "uncaught error";
    }
    default:
      return state;
  }
};

store.injectReducer("catalog_names", reducerCatalogNames);
store.injectReducer("cross_matches", reducerCrossMatches);
