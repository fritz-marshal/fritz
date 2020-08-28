import * as API from "../API";
import store from "../store";

export const FETCH_FILTER_VERSION = "skyportal/FETCH_FILTER_VERSION";
export const FETCH_FILTER_VERSION_OK = "skyportal/FETCH_FILTER_VERSION_OK";
export const FETCH_FILTER_VERSION_ERROR =
  "skyportal/FETCH_FILTER_VERSION_ERROR";
export const FETCH_FILTER_VERSION_FAIL = "skyportal/FETCH_FILTER_VERSION_FAIL";

export const ADD_FILTER_VERSION = "skyportal/ADD_FILTER_VERSION";
export const ADD_FILTER_VERSION_OK = "skyportal/ADD_FILTER_VERSION_OK";

export const EDIT_ACTIVE_FILTER_VERSION =
  "skyportal/EDIT_ACTIVE_FILTER_VERSION";
export const EDIT_ACTIVE_FILTER_VERSION_OK =
  "skyportal/EDIT_ACTIVE_FILTER_VERSION_OK";

export const EDIT_ACTIVE_FID_FILTER_VERSION =
  "skyportal/EDIT_ACTIVE_FID_FILTER_VERSION";
export const EDIT_ACTIVE_FID_FILTER_VERSION_OK =
  "skyportal/EDIT_ACTIVE_FID_FILTER_VERSION_OK";

export const DELETE_FILTER_VERSION = "skyportal/DELETE_FILTER_VERSION";
export const DELETE_FILTER_VERSION_OK = "skyportal/DELETE_FILTER_VERSION_OK";

export function fetchFilterVersion(id) {
  return API.GET(`/api/filters/${id}/v`, FETCH_FILTER_VERSION);
}

export function addFilterVersion({ filter_id, pipeline }) {
  return API.POST(`/api/filters/${filter_id}/v`, ADD_FILTER_VERSION, {
    pipeline: pipeline,
  });
}

export function editActiveFilterVersion({ filter_id, active }) {
  return API.PATCH(`/api/filters/${filter_id}/v`, EDIT_ACTIVE_FILTER_VERSION, {
    active: active,
  });
}

export function editActiveFidFilterVersion({ filter_id, active_fid }) {
  return API.PATCH(
    `/api/filters/${filter_id}/v`,
    EDIT_ACTIVE_FID_FILTER_VERSION,
    { active_fid: active_fid }
  );
}

export function deleteFilterVersion(filter_id) {
  return API.DELETE(`/api/filters/${filter_id}/v`, DELETE_FILTER_VERSION);
}

const reducer = (state = {}, action) => {
  switch (action.type) {
    case FETCH_FILTER_VERSION_OK: {
      return action.data;
    }
    case FETCH_FILTER_VERSION_FAIL:
    case FETCH_FILTER_VERSION_ERROR: {
      return {};
    }
    default:
      return state;
  }
};

store.injectReducer("filter_v", reducer);
