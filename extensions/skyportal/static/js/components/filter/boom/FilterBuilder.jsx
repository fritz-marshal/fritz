import React from "react";
import { UnifiedBuilderProvider } from "../../contexts/UnifiedBuilderContext";
import FilterBuilderContent from "./FilterBuilderContent.jsx";

const FilterBuilder = () => {
  return (
    <UnifiedBuilderProvider mode="filter">
      <FilterBuilderContent />
    </UnifiedBuilderProvider>
  );
};

export default FilterBuilder;
