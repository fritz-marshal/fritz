import * as API from '../API';
import store from '../store';


export const FETCH_FILTER = 'skyportal/FETCH_FILTER';
export const FETCH_FILTER_OK = 'skyportal/FETCH_FILTER_OK';
export const FETCH_FILTER_ERROR = 'skyportal/FETCH_FILTER_ERROR';
export const FETCH_FILTER_FAIL = 'skyportal/FETCH_FILTER_FAIL';

export function fetchFilterMetaData(id) {
  return API.GET(`/api/filters/ztf/${id}`, FETCH_ALERT);
}

export const fetchAuxData = (id) => (
  API.GET(`/api/alerts/ztf/${id}/aux`, FETCH_AUX)
);

const alertDataReducer = (state = null, action) => {
  switch (action.type) {
    case FETCH_ALERT_OK: {
      return action.data;
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


const auxDataReducer = (state = null, action) => {
  switch (action.type) {
    case FETCH_AUX_OK: {
      return action.data;
    }
    case FETCH_AUX_ERROR: {
      return action.message;
    }
    case FETCH_AUX_FAIL: {
      return "uncaught error";
    }
    default:
      return state;
  }
};


store.injectReducer('alert_data', alertDataReducer);
store.injectReducer('alert_aux_data', auxDataReducer);
