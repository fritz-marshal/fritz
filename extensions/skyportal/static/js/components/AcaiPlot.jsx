import React, { useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import embed from "vega-embed";

const useStyles = makeStyles(() => ({
  container: { width: "100%" },
  plotDiv: (props) => ({
    width: props.width,
    height: props.height,
  }),
}));

const plotSpec = (inputData, color, textColor) => ({
  $schema: "https://vega.github.io/schema/vega-lite/v4.json",
  description: "Bar chart of latest ACAI values",
  width: "container",
  height: "container",
  background: "transparent",
  data: {
    values: inputData.data,
  },
  encoding: {
    y: {
      field: "model",
      type: "nominal",
      axis: {
        labelFontSize: "14",
        titleFontSize: "16",
        labelColor: textColor,
        tickColor: textColor,
        titleColor: textColor,
      },
    },
    x: {
      field: "score",
      type: "quantitative",
      scale: { domain: [0, 1.2] },
      axis: {
        labelFontSize: "12",
        titleFontSize: "16",
        labelColor: textColor,
        tickColor: textColor,
        titleColor: textColor,
      },
    },
  },
  layer: [
    {
      mark: "bar",
      encoding: {
        color: { value: color },
      },
    },
    {
      mark: { type: "text", align: "left", baseline: "middle", dx: 3 },
      encoding: {
        text: { field: "score", type: "quantitative" },
        color: { value: textColor },
      },
    },
  ],
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

TabPanel.defaultProps = {
  children: null,
};

const AcaiPlot = ({ width, height }) => {
  const theme = useTheme();
  const { annotations } = useSelector((state) => state.source);
  const classes = useStyles({ width, height });
  const [value, setValue] = useState(0);
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const acaiAnnotations = annotations?.filter((annotation) => {
    const acaiOrigins = ["au:hosted", "au-public:hosted", "au-caltech:hosted"];
    return acaiOrigins.includes(annotation.origin);
  });

  // Get just the ACAI values
  const getAcaiValues = ({ acai_b, acai_h, acai_n, acai_o, acai_v }) => [
    { model: "acai_b", score: acai_b },
    { model: "acai_h", score: acai_h },
    { model: "acai_n", score: acai_n },
    { model: "acai_o", score: acai_o },
    { model: "acai_v", score: acai_v },
  ];
  const plotDatas = acaiAnnotations?.map((annotation) => ({
    origin: annotation.origin,
    data: getAcaiValues(annotation.data),
  }));

  if (plotDatas) {
    return (
      <div className={classes.container}>
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="simple tabs example"
        >
          {plotDatas.map((plotData, i) => (
            <Tab
              key={`tab-${plotData.origin}`}
              label={plotData.origin}
              id={`simple-tab-${i}`}
            />
          ))}
        </Tabs>
        <div>
          {plotDatas.map((plotData, i) => (
            <TabPanel
              value={value}
              index={i}
              key={`acai-plot-div-${plotData.origin}`}
              data-testid={`acai-plot-div-${plotData.origin}`}
            >
              <div
                className={classes.plotDiv}
                ref={(node) => {
                  if (node) {
                    embed(
                      node,
                      plotSpec(
                        plotData,
                        theme.palette.primary.main,
                        theme.palette.text.primary
                      ),
                      {
                        actions: false,
                      }
                    );
                  }
                }}
              />
            </TabPanel>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

AcaiPlot.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
};

AcaiPlot.defaultProps = {
  width: "300px",
  height: "150px",
};

export default AcaiPlot;
