import * as API from '../API';
import store from '../store';


export const FETCH_ALERT = 'skyportal/FETCH_ALERT';
export const FETCH_ALERT_OK = 'skyportal/FETCH_ALERT_OK';
export const FETCH_ALERT_ERROR = 'skyportal/FETCH_ALERT_ERROR';
export const FETCH_ALERT_FAIL = 'skyportal/FETCH_ALERT_FAIL';

// export const FETCH_CANDID = 'skyportal/FETCH_CANDID';
// export const FETCH_CANDID_OK = 'skyportal/FETCH_CANDID_OK';
// export const FETCH_CANDID_ERROR = 'skyportal/FETCH_CANDID_ERROR';
// export const FETCH_CANDID_FAIL = 'skyportal/FETCH_CANDID_FAIL';

export function fetchAlertData(id) {
  return API.GET(`/api/alerts/ztf/${id}`, FETCH_ALERT)
}
// export const fetchAlertData = (id) => (
//   API.GET(`/api/alerts/ztf/${id}`, FETCH_ALERT)
// );

const alertDataReducer = (state= {alert_data: null, thumbnails: null}, action) => {
// const alertDataReducer = (state={}, action) => {
  switch (action.type) {
    case FETCH_ALERT_OK: {
      const alert_data = action.data;
      return {
        ...state,
        alert_data
      };
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

// const candidReducer = (state="null", action) => {
//   switch (action.type) {
//     case FETCH_CANDID_OK: {
//       const { value } = action.data;
//       return value;
//     }
//     case FETCH_CANDID_ERROR: {
//       return action.message;
//     }
//     case FETCH_CANDID_FAIL: {
//       return "uncaught error";
//     }
//     default:
//       return state;
//   }
// };

store.injectReducer('alert_data', alertDataReducer);
// store.injectReducer('candid', candidReducer);
