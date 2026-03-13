import * as API from "../API";
import store from "../store";

export const FETCH_KOWALSKI_FILTER_VERSION =
  "skyportal/FETCH_KOWALSKI_FILTER_VERSION";
export const FETCH_KOWALSKI_FILTER_VERSION_OK =
  "skyportal/FETCH_KOWALSKI_FILTER_VERSION_OK";
export const FETCH_KOWALSKI_FILTER_VERSION_ERROR =
  "skyportal/FETCH_KOWALSKI_FILTER_VERSION_ERROR";
export const FETCH_KOWALSKI_FILTER_VERSION_FAIL =
  "skyportal/FETCH_KOWALSKI_FILTER_VERSION_FAIL";

export const ADD_KOWALSKI_FILTER_VERSION =
  "skyportal/ADD_KOWALSKI_FILTER_VERSION";
export const ADD_KOWALSKI_FILTER_VERSION_OK =
  "skyportal/ADD_KOWALSKI_FILTER_VERSION_OK";

export const EDIT_KOWALSKI_ACTIVE_FILTER_VERSION =
  "skyportal/EDIT_KOWALSKI_ACTIVE_FILTER_VERSION";
export const EDIT_KOWALSKI_ACTIVE_FILTER_VERSION_OK =
  "skyportal/EDIT_KOWALSKI_ACTIVE_FILTER_VERSION_OK";

export const EDIT_KOWALSKI_ACTIVE_FID_FILTER_VERSION =
  "skyportal/EDIT_KOWALSKI_ACTIVE_FID_FILTER_VERSION";
export const EDIT_KOWALSKI_ACTIVE_FID_FILTER_VERSION_OK =
  "skyportal/EDIT_KOWALSKI_ACTIVE_FID_FILTER_VERSION_OK";

export const EDIT_KOWALSKI_UPDATE_ANNOTATIONS =
  "skyportal/EDIT_KOWALSKI_UPDATE_ANNOTATIONS";
export const EDIT_KOWALSKI_UPDATE_ANNOTATIONS_OK =
  "skyportal/EDIT_KOWALSKI_UPDATE_ANNOTATIONS_OK";

export const EDIT_KOWALSKI_AUTOSAVE = "skyportal/EDIT_KOWALSKI_AUTOSAVE";
export const EDIT_KOWALSKI_AUTOSAVE_OK = "skyportal/EDIT_KOWALSKI_AUTOSAVE_OK";

export const EDIT_KOWALSKI_AUTO_FOLLOWUP =
  "skyportal/EDIT_KOWALSKI_AUTO_FOLLOWUP";
export const EDIT_KOWALSKI_AUTO_FOLLOWUP_OK =
  "skyportal/EDIT_KOWALSKI_AUTO_FOLLOWUP_OK";

export const DELETE_KOWALSKI_FILTER_VERSION =
  "skyportal/DELETE_KOWALSKI_FILTER_VERSION";
export const DELETE_KOWALSKI_FILTER_VERSION_OK =
  "skyportal/DELETE_KOWALSKI_FILTER_VERSION_OK";

export function fetchFilterVersion(id) {
  return API.GET(
    `/api/kowalski/filters/${id}/v`,
    FETCH_KOWALSKI_FILTER_VERSION,
  );
}

export function addFilterVersion({ filter_id, pipeline }) {
  return API.POST(
    `/api/kowalski/filters/${filter_id}/v`,
    ADD_KOWALSKI_FILTER_VERSION,
    {
      pipeline,
    },
  );
}

export function editActiveFilterVersion({ filter_id, active }) {
  return API.PATCH(
    `/api/kowalski/filters/${filter_id}/v`,
    EDIT_KOWALSKI_ACTIVE_FILTER_VERSION,
    {
      active,
    },
  );
}

export function editAutosave({ filter_id, autosave }) {
  return API.PATCH(
    `/api/kowalski/filters/${filter_id}/v`,
    EDIT_KOWALSKI_AUTOSAVE,
    {
      autosave,
    },
  );
}

export function editUpdateAnnotations({ filter_id, update_annotations }) {
  return API.PATCH(
    `/api/kowalski/filters/${filter_id}/v`,
    EDIT_KOWALSKI_UPDATE_ANNOTATIONS,
    {
      update_annotations,
    },
  );
}

export function editAutoFollowup({ filter_id, auto_followup }) {
  return API.PATCH(
    `/api/kowalski/filters/${filter_id}/v`,
    EDIT_KOWALSKI_AUTO_FOLLOWUP,
    {
      auto_followup,
    },
  );
}

export function editActiveFidFilterVersion({ filter_id, active_fid }) {
  return API.PATCH(
    `/api/kowalski/filters/${filter_id}/v`,
    EDIT_KOWALSKI_ACTIVE_FID_FILTER_VERSION,
    { active_fid },
  );
}

export function deleteFilterVersion(filter_id) {
  return API.DELETE(
    `/api/kowalski/filters/${filter_id}/v`,
    DELETE_KOWALSKI_FILTER_VERSION,
  );
}

const reducer = (state = {}, action) => {
  switch (action.type) {
    case FETCH_KOWALSKI_FILTER_VERSION_OK: {
      return action.data;
    }
    case FETCH_KOWALSKI_FILTER_VERSION_FAIL:
    case FETCH_KOWALSKI_FILTER_VERSION_ERROR: {
      return {};
    }
    default:
      return state;
  }
};

store.injectReducer("kowalski_filter_v", reducer);
