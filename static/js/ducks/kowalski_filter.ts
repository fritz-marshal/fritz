import { skyportalApi } from "../api/skyportalApi";

// All mutations target the same versioned-filter endpoint; consumers call
// refetch() on the query after a mutation to reload (mirrors the legacy
// fetchFilterVersion re-dispatch). Kept tag-free to match the other boom/kowalski
// ducks in this app.
export const kowalskiFilterApi = skyportalApi.injectEndpoints({
  endpoints: (build) => ({
    getKowalskiFilterVersion: build.query<any, string>({
      query: (id) => `api/kowalski/filters/${id}/v`,
    }),
    addKowalskiFilterVersion: build.mutation<
      any,
      { filter_id: any; pipeline: any }
    >({
      query: ({ filter_id, pipeline }) => ({
        url: `api/kowalski/filters/${filter_id}/v`,
        method: "POST",
        body: { pipeline },
      }),
    }),
    editKowalskiActiveFilterVersion: build.mutation<
      any,
      { filter_id: any; active: any }
    >({
      query: ({ filter_id, active }) => ({
        url: `api/kowalski/filters/${filter_id}/v`,
        method: "PATCH",
        body: { active },
      }),
    }),
    editKowalskiActiveFidFilterVersion: build.mutation<
      any,
      { filter_id: any; active_fid: any }
    >({
      query: ({ filter_id, active_fid }) => ({
        url: `api/kowalski/filters/${filter_id}/v`,
        method: "PATCH",
        body: { active_fid },
      }),
    }),
    editKowalskiAutosave: build.mutation<
      any,
      { filter_id: any; autosave: any }
    >({
      query: ({ filter_id, autosave }) => ({
        url: `api/kowalski/filters/${filter_id}/v`,
        method: "PATCH",
        body: { autosave },
      }),
    }),
    editKowalskiUpdateAnnotations: build.mutation<
      any,
      { filter_id: any; update_annotations: any }
    >({
      query: ({ filter_id, update_annotations }) => ({
        url: `api/kowalski/filters/${filter_id}/v`,
        method: "PATCH",
        body: { update_annotations },
      }),
    }),
    editKowalskiAutoFollowup: build.mutation<
      any,
      { filter_id: any; auto_followup: any }
    >({
      query: ({ filter_id, auto_followup }) => ({
        url: `api/kowalski/filters/${filter_id}/v`,
        method: "PATCH",
        body: { auto_followup },
      }),
    }),
  }),
});

export const {
  useGetKowalskiFilterVersionQuery,
  useAddKowalskiFilterVersionMutation,
  useEditKowalskiActiveFilterVersionMutation,
  useEditKowalskiActiveFidFilterVersionMutation,
  useEditKowalskiAutosaveMutation,
  useEditKowalskiUpdateAnnotationsMutation,
  useEditKowalskiAutoFollowupMutation,
} = kowalskiFilterApi;
