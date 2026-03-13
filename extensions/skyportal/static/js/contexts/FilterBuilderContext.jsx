import React from "react";
import PropTypes from "prop-types";
import { UnifiedBuilderProvider } from "./UnifiedBuilderContext";

export const FilterBuilderProvider = ({ children }) => (
  <UnifiedBuilderProvider mode="filter">{children}</UnifiedBuilderProvider>
);

// props validation
FilterBuilderProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
