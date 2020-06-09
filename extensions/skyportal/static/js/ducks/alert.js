import * as API from '../API';
import store from '../store';


export const FETCH_RANDOM_STRING = 'skyportal/FETCH_RANDOM_STRING';
export const FETCH_RANDOM_STRING_OK = 'skyportal/FETCH_RANDOM_STRING_OK';
export const FETCH_RANDOM_STRING_ERROR = 'skyportal/FETCH_RANDOM_STRING_ERROR';
export const FETCH_RANDOM_STRING_FAIL = 'skyportal/FETCH_RANDOM_STRING_FAIL';

export function fetchRandomString() {
  return API.GET('/api/alerts', FETCH_RANDOM_STRING);
}

const reducer = (state="null", action) => {
  switch (action.type) {
    case FETCH_RANDOM_STRING_OK: {
      const { value } = action.data;
      return value;
    }
    case FETCH_RANDOM_STRING_ERROR: {
      return action.message;
    }
    case FETCH_RANDOM_STRING_FAIL: {
      return "uncaught error";
    }
    default:
      return state;
  }
};

store.injectReducer('randomString', reducer);
