import * as API from "../API";
import store from "../store";

export const FETCH_ALERT = "skyportal/FETCH_ALERT";
export const FETCH_ALERT_OK = "skyportal/FETCH_ALERT_OK";
export const FETCH_ALERT_ERROR = "skyportal/FETCH_ALERT_ERROR";
export const FETCH_ALERT_FAIL = "skyportal/FETCH_ALERT_FAIL";

export const FETCH_BOOM_OBJECT = "skyportal/FETCH_BOOM_OBJECT";
export const FETCH_BOOM_OBJECT_OK = "skyportal/FETCH_BOOM_OBJECT_OK";
export const FETCH_BOOM_OBJECT_ERROR = "skyportal/FETCH_BOOM_OBJECT_ERROR";
export const FETCH_BOOM_OBJECT_FAIL = "skyportal/FETCH_BOOM_OBJECT_FAIL";

export const SAVE_ALERT = "skyportal/SAVE_ALERT";
export const SAVE_ALERT_OK = "skyportal/SAVE_ALERT_OK";

export const UPDATE_CUTOUTS = "skyportal/UPDATE_CUTOUTS";
export const UPDATE_CUTOUTS_OK = "skyportal/UPDATE_CUTOUTS_OK";

export function fetchAlertData(survey, id) {
  return API.GET(
    `/api/boom/surveys/${survey}/alerts?objectId=${id}`,
    FETCH_ALERT,
  );
}

export const fetchBoomObject = (survey, id) =>
  API.GET(`/api/boom/surveys/${survey}/objects/${id}`, FETCH_BOOM_OBJECT);

export function saveAlertAsSource({ survey, id, payload }) {
  return API.POST(
    `/api/boom/surveys/${survey}/objects/${id}`,
    SAVE_ALERT,
    payload,
  );
}

export function updateCutouts({ survey, objectId, candid, which, band }) {
  const payload = { objectId };
  if (candid !== undefined && candid !== null && candid !== "") {
    payload.candid = parseInt(candid, 10);
  } else {
    payload.which = which || "last";
  }
  if (band) payload.band = band;
  return API.POST(
    `/api/boom/surveys/${survey}/alerts/cutouts`,
    UPDATE_CUTOUTS,
    payload,
  );
}

const alertDataReducer = (state = {}, action) => {
  switch (action.type) {
    case FETCH_ALERT_OK: {
      if (action.data.length > 0) {
        return {
          ...state,
          [action.data[0].objectId]: action.data,
        };
      }
      return state;
    }
    case FETCH_ALERT_ERROR: {
      return action.message;
    }
    case FETCH_ALERT_FAIL: {
      return "uncaught error";
    }
    default:
      return state;
  }
};

const boomObjectReducer = (state = {}, action) => {
  switch (action.type) {
    case FETCH_BOOM_OBJECT_OK: {
      return {
        ...state,
        [action.data._id]: action.data,
      };
    }
    case FETCH_BOOM_OBJECT_ERROR: {
      return action.message;
    }
    case FETCH_BOOM_OBJECT_FAIL: {
      return "uncaught error";
    }
    default:
      return state;
  }
};

store.injectReducer("boom_alert_data", alertDataReducer);
store.injectReducer("boom_object_data", boomObjectReducer);
