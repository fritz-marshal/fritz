import { skyportalApi } from "../api/skyportalApi";

export interface ZTFLightCurvesArg {
  lc_id?: number | string | undefined;
  catalog: string;
  ra?: number | string | undefined;
  dec?: number | string | undefined;
  radius?: number | string | undefined;
}

export interface NearestSourcesArg {
  ra: number | string;
  dec: number | string;
}

// Kowalski archive: catalog names, ZTF light curves, SCoPe features, nearest
// existing sources, and "save light curves as a source". RTK Query conversion
// of the old kowalski_archive thunks + keyed slices.
export const kowalskiArchiveApi = skyportalApi.injectEndpoints({
  endpoints: (build) => ({
    getCatalogNames: build.query<any, void>({
      query: () => "api/archive/catalogs",
    }),
    getZTFLightCurves: build.query<any, ZTFLightCurvesArg>({
      query: ({ lc_id, catalog, ra, dec, radius }) =>
        lc_id != null
          ? `api/archive/${lc_id}?catalog=${catalog}`
          : `api/archive?catalog=${catalog}&ra=${ra}&dec=${dec}&radius=${radius}&radius_units=arcsec`,
    }),
    // POST that returns computed features, so it's a mutation (imperative).
    fetchScopeFeatures: build.mutation<any, Record<string, any>>({
      query: (body) => ({
        url: "api/archive/features",
        method: "POST",
        body,
      }),
    }),
    saveLightCurves: build.mutation<any, Record<string, any>>({
      query: (body) => ({
        url: "api/archive",
        method: "POST",
        body,
      }),
    }),
    // Existing sources within 5 arcsec of (ra, dec).
    getNearestSources: build.query<any, NearestSourcesArg>({
      query: ({ ra, dec }) =>
        `api/sources?&ra=${ra}&dec=${dec}&radius=${5 / 3600}`,
    }),
  }),
});

export const {
  useGetCatalogNamesQuery,
  useLazyGetCatalogNamesQuery,
  useGetZTFLightCurvesQuery,
  useLazyGetZTFLightCurvesQuery,
  useFetchScopeFeaturesMutation,
  useSaveLightCurvesMutation,
  useGetNearestSourcesQuery,
  useLazyGetNearestSourcesQuery,
} = kowalskiArchiveApi;
