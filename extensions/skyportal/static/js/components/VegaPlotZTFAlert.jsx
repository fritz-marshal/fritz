import React from 'react';
import PropTypes from 'prop-types';
import embed from 'vega-embed';


function lc_colors(fid) {
  switch (fid) {
    case 1: {
      return '#28a745';
    }
    case 2: {
      return '#dc3545';
    }
    case 3: {
      return '#f3dc11';
    }
    default:
      return '#222';
  }
}

function filter_name(fid) {
  switch (fid) {
    case 1: {
      return 'ztfg';
    }
    case 2: {
      return 'ztfr';
    }
    case 3: {
      return 'ztfi';
    }
    default:
      return fid.toString();
  }
}


const spec = (url, jd) => ({
  $schema: "https://vega.github.io/schema/vega-lite/v4.json",
  width: 500,
  // width: 400,
  // width: "container",
  height: 250,
  data: {
    url,
    format: {
      type: "json",
      property: "data.prv_candidates" // where in the JSON does the data live
    }
  },
  background: "transparent",
  layer: [
    {
      selection: {
        filterMags: {
          type: "multi",
          fields: ["fid"],
          bind: "legend"
        },
        grid: {
          type: "interval",
          bind: "scales"
        }
      },
      mark: {
        type: "point",
        shape: "circle",
        filled: "true",
        size: 30,
      },
      transform: [
        { calculate: "join([format(datum.magpsf, '.2f'), ' ± ', format(datum.sigmapsf, '.2f'), ' (ab)'], '')", as: "magAndErr" }
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
            reverse: true
          },
          axis: {
            title: "mag"
          }
        },
        color: {
          field: "fid",
          type: "nominal",
          scale: {
            "domain": [1, 2, 3],
            "range": ["#28a745", "#dc3545", "#f3dc11"]
          },
        },
        tooltip: [
          // { field: "candid", title: "candid" },
          { field: "magAndErr", title: "mag", type: "nominal" },
          { field: "fid", type: "ordinal" },
          { field: "jd", type: "quantitative" },
          { field: "diffmaglim", type: "quantitative", format: ".2f" }
        ],
        opacity: {
          condition: { selection: "filterMags", value: 1 },
          value: 0
        }
      }
    },

    // Render error bars
    {
      selection: {
        filterErrBars: {
          type: "multi",
          fields: ["fid"],
          bind: "legend"
        }
      },
      transform: [
        { filter: "datum.magpsf != null && datum.sigmapsf != null" },
        { calculate: "datum.magpsf - datum.sigmapsf", as: "magMin" },
        { calculate: "datum.magpsf + datum.sigmapsf", as: "magMax" }
      ],
      mark: {
        type: "rule",
        size: 0.5
      },
      encoding: {
        x: {
          field: "jd",
          type: "quantitative",
          scale: {
            zero: false,
          }
        },
        y: {
          field: "magMin",
          type: "quantitative",
          scale: {
            zero: false,
            reverse: true
          }
        },
        y2: {
          field: "magMax",
          type: "quantitative",
          scale: {
            zero: false,
            reverse: true
          }
        },
        color: {
          field: "fid",
          type: "nominal"
        },
        opacity: {
          condition: { selection: "filterErrBars", value: 1 },
          value: 0
        }
      }
    },

    // Render limiting mags
    {
      transform: [
        { filter: "datum.magpsf == null" }
      ],
      selection: {
        filterLimitingMags: {
          type: "multi",
          fields: ["fid"],
          bind: "legend"
        }
      },
      mark: {
        type: "point",
        shape: "triangle-down"
      },
      encoding: {
        x: {
          field: "jd",
          type: "quantitative",
          scale: {
            zero: false,
          }
        },
        y: {
          field: "diffmaglim",
          type: "quantitative"
        },
        color: {
          field: "fid",
          type: "nominal"
        },
        tooltip: [
          { field: "fid", type: "ordinal" },
          { field: "jd", type: "quantitative" },
          { field: "diffmaglim", type: "quantitative", format: ".2f" }
        ],
        opacity: {
          condition: { selection: "filterLimitingMags", value: 0.3 },
          value: 0
        }
      }
    },

    // render selected candid date
    {
      data: {values: [{}]},
      mark: {type: "rule", strokeDash: [4, 4], size: 2},
      encoding: {
        x: {
          datum: jd,
          type: "quantitative"
        }
      }
    }
  ]
});


const VegaPlot = ({ dataUrl, jd }) => (
    <div
        ref={
          (node) => {
            embed(node, spec(dataUrl, jd), {
              actions: false
            });
          }
        }
    />
);

VegaPlot.propTypes = {
  dataUrl: PropTypes.string.isRequired
};

export default VegaPlot;
