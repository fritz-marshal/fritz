import React from "react";
import PropTypes from "prop-types";
import { UnifiedBuilderProvider } from "./UnifiedBuilderContext";

export const AnnotationBuilderProvider = ({ children }) => (
  <UnifiedBuilderProvider mode="annotation">{children}</UnifiedBuilderProvider>
);

// props validation
AnnotationBuilderProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
