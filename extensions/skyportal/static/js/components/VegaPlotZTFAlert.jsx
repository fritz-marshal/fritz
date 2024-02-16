import React from "react";
import PropTypes from "prop-types";
import embed from "vega-embed";

const spec = (url, values, jd) => {
  const specJSON = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.2.0.json",
    width: "container",
    height: "container",
    autosize: {
      type: "fit",
      resize: true,
    },
    background: "transparent",
    layer: [
      // Render error bars
      {
        selection: {
          filterErrBars: {
            type: "multi",
            fields: ["fid"],
            bind: "legend",
          },
        },
        transform: [
          { filter: "datum.magpsf != null && datum.sigmapsf != null" },
          { calculate: "datum.magpsf - datum.sigmapsf", as: "magMin" },
          { calculate: "datum.magpsf + datum.sigmapsf", as: "magMax" },
        ],
        mark: {
          type: "rule",
          size: 2,
        },
        encoding: {
          x: {
            field: "jd",
            type: "quantitative",
            scale: {
              zero: false,
            },
          },
          y: {
            field: "magMin",
            type: "quantitative",
            scale: {
              zero: false,
              reverse: true,
            },
          },
          y2: {
            field: "magMax",
            type: "quantitative",
            scale: {
              zero: false,
              reverse: true,
            },
          },
          color: {
            field: "fid",
            type: "nominal",
          },
          opacity: {
            condition: { selection: "filterErrBars", value: 1 },
            value: 0,
          },
        },
      },

      // Render Detections
      {
        selection: {
          filterMags: {
            type: "multi",
            fields: ["fid"],
            bind: "legend",
          },
          grid: {
            name: "grid",
            type: "interval",
            bind: "scales",
          },
        },
        mark: {
          type: "point",
          shape: "circle",
          filled: "true",
          size: 100,
        },
        transform: [
          {
            calculate:
              "join([format(datum.magpsf, '.2f'), ' ± ', format(datum.sigmapsf, '.2f'), ' (ab)'], '')",
            as: "magAndErr",
          },
        ],
        encoding: {
          x: {
            field: "jd",
            type: "quantitative",
            scale: {
              zero: false,
            },
          },
          y: {
            field: "magpsf",
            type: "quantitative",
            scale: {
              zero: false,
              reverse: true,
            },
            axis: {
              title: "mag",
            },
          },
          color: {
            field: "fid",
            type: "nominal",
            scale: {
              domain: [1, 2, 3],
              range: ["#28a745", "#dc3545", "#f3dc11"],
            },
          },
          tooltip: [
            // { field: "candid", title: "candid" },
            { field: "magAndErr", title: "mag", type: "nominal" },
            { field: "fid", type: "ordinal" },
            { field: "jd", type: "quantitative" },
            { field: "diffmaglim", type: "quantitative", format: ".2f" },
            { field: "origin", type: "ordinal" },
          ],
          opacity: {
            condition: { selection: "filterMags", value: 1 },
            value: 0,
          },
        },
      },

      // Render limiting mags
      {
        transform: [{ filter: "datum.magpsf == null" }],
        selection: {
          filterLimitingMags: {
            type: "multi",
            fields: ["fid"],
            bind: "legend",
          },
        },
        mark: {
          type: "point",
          shape: "triangle-down",
          size: 60,
        },
        encoding: {
          x: {
            field: "jd",
            type: "quantitative",
            scale: {
              zero: false,
            },
          },
          y: {
            field: "diffmaglim",
            type: "quantitative",
          },
          color: {
            field: "fid",
            type: "nominal",
          },
          tooltip: [
            { field: "fid", type: "ordinal" },
            { field: "jd", type: "quantitative" },
            { field: "diffmaglim", type: "quantitative", format: ".2f" },
          ],
          opacity: {
            condition: { selection: "filterLimitingMags", value: 0.3 },
            value: 0,
          },
        },
      },

      // render selected candid date
      {
        data: { values: [{}] },
        mark: { type: "rule", strokeDash: [4, 4], size: 1, opacity: 0.3 },
        encoding: {
          x: {
            datum: jd,
            type: "quantitative",
          },
        },
      },
    ],
  };

  if (url) {
    specJSON.data = {
      url,
      format: {
        type: "json",
        property: "data.prv_candidates", // where in the JSON does the data live
      },
    };
  } else {
    specJSON.data = {
      values,
    };
  }
  return specJSON;
};

const VegaPlot = ({ dataUrl, values, jd }) => {
  if (!dataUrl && !values) {
    return null;
  }
  return (
    <div
      ref={(node) => {
        embed(node, spec(dataUrl, values, jd), {
          actions: false,
        });
      }}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

VegaPlot.propTypes = {
  dataUrl: PropTypes.string,
  values: PropTypes.arrayOf(PropTypes.shape({})),
  jd: PropTypes.number.isRequired,
};

VegaPlot.defaultProps = {
  dataUrl: null,
  values: null,
};

export default VegaPlot;
