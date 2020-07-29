import messageHandler from 'baselayer/MessageHandler';

import * as API from '../API';
import store from '../store';

export const FETCH_STREAMS = 'skyportal/FETCH_STREAMS';
export const FETCH_STREAMS_OK = 'skyportal/FETCH_STREAMS_OK';

export const ADD_STREAM = 'skyportal/ADD_STREAM';
export const ADD_STREAM_OK = 'skyportal/ADD_STREAM_OK';

export const DELETE_STREAM = 'skyportal/DELETE_STREAM';
export const DELETE_STREAM_OK = 'skyportal/DELETE_STREAM_OK';

export const ADD_STREAM_USER = 'skyportal/ADD_STREAM_USER';
export const ADD_STREAM_USER_OK = 'skyportal/ADD_STREAM_USER_OK';

export const DELETE_STREAM_USER = 'skyportal/DELETE_STREAM_USER';
export const DELETE_STREAM_USER_OK = 'skyportal/DELETE_STREAM_USER_OK';

export function fetchStreams() {
  return API.GET('/api/streams', FETCH_STREAMS);
}

export function addNewStream(form_data) {
  return API.POST('/api/streams', ADD_STREAM, form_data);
}

export function deleteStream(stream_id) {
  return API.DELETE(`/api/streams/${stream_id}`, DELETE_STREAM);
}

export function addStreamUser({ username, admin, stream_id }) {
  return API.POST(
    `/api/streams/${stream_id}/users/${username}`,
    ADD_STREAM_USER,
    { username, admin, stream_id }
  );
}

export function deleteStreamUser({ username, stream_id }) {
  return API.DELETE(
    `/api/streams/${stream_id}/users/${username}`,
    DELETE_STREAM_USER,
    { username, stream_id }
  );
}

// Websocket message handler
messageHandler.add((actionType, payload, dispatch) => {
  if (actionType === FETCH_STREAMS) {
    dispatch(fetchStreams());
  }
});

function reducer(state={ user: [], all: null }, action) {
  switch (action.type) {
    case FETCH_STREAMS_OK: {
      const { user_streams, all_streams } = action.data;
      return {
        ...state,
        user: user_streams,
        all: all_streams
      };
    }
    default:
      return state;
  }
}

store.injectReducer('streams', reducer);
