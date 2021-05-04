import * as API from "../API";
import store from "../store";

const FETCH_TNS_INFO = "skyportal/FETCH_TNS_INFO";
const FETCH_TNS_INFO_OK = "skyportal/FETCH_TNS_INFO_OK";

export const fetchTNSInfo = (objID) =>
  API.GET(`/api/tns_info/${objID}`, FETCH_TNS_INFO);

const reducer = (state = null, action) => {
  switch (action.type) {
    case FETCH_TNS_INFO_OK: {
      return action.data;
    }
    default: {
      return state;
    }
  }
};

store.injectReducer("tnsInfo", reducer);
