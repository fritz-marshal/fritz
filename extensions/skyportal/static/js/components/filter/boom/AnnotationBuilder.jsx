import React from "react";
import { UnifiedBuilderProvider } from "../../contexts/UnifiedBuilderContext";
import AnnotationBuilderContent from "./AnnotationBuilderContent.jsx";

const AnnotationBuilder = () => {
  return (
    <UnifiedBuilderProvider mode="annotation">
      <AnnotationBuilderContent />
    </UnifiedBuilderProvider>
  );
};

export default AnnotationBuilder;
