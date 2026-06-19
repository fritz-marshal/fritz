import { skyportalApi } from "../api/skyportalApi";
import type { RouteData } from "../types/routeSchemaMap";

export interface AddGroupFilterArg {
  name: string;
  group_id: number | string;
  stream_id: number | string;
}

export interface DeleteGroupFilterArg {
  filter_id: number | string;
}

export interface UpdateFilterNameArg {
  filter_id: number | string;
  name: string;
}

export const filterApi = skyportalApi.injectEndpoints({
  endpoints: (build) => ({
    getFilter: build.query<
      RouteData<"GET /api/filters/{filter_id}">,
      number | string
    >({
      query: (id) => `api/filters/${id}`,
      providesTags: ["Filters"],
    }),
    addGroupFilter: build.mutation<unknown, AddGroupFilterArg>({
      query: ({ name, group_id, stream_id }) => ({
        url: "api/filters",
        method: "POST",
        body: { name, group_id, stream_id },
      }),
    }),
    deleteGroupFilter: build.mutation<unknown, DeleteGroupFilterArg>({
      query: ({ filter_id }) => ({
        url: `api/filters/${filter_id}`,
        method: "DELETE",
      }),
    }),
    // Fritz-specific: rename an existing alert-stream filter. Not part of
    // upstream SkyPortal's filterApi.
    updateFilterName: build.mutation<unknown, UpdateFilterNameArg>({
      query: ({ filter_id, name }) => ({
        url: `api/filters/${filter_id}`,
        method: "PATCH",
        body: { name },
      }),
    }),
  }),
});

export const {
  useGetFilterQuery,
  useAddGroupFilterMutation,
  useDeleteGroupFilterMutation,
  useUpdateFilterNameMutation,
} = filterApi;
