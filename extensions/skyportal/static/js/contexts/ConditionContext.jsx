import React, { createContext } from "react";
import PropTypes from "prop-types";

const ConditionContext = createContext();

export const ConditionProvider = ({
  children,
  customVariables,
  customListVariables,
  customSwitchCases,
  fieldOptionsList,
  isListDialogOpen,
  setListConditionDialog,
}) => {
  const value = {
    customVariables,
    customListVariables,
    customSwitchCases,
    fieldOptionsList,
    isListDialogOpen,
    setListConditionDialog,
  };

  return (
    <ConditionContext.Provider value={value}>
      {children}
    </ConditionContext.Provider>
  );
};

// Export the context for the hook
export { ConditionContext };

// props validation
ConditionProvider.propTypes = {
  children: PropTypes.node.isRequired,
  customVariables: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  customListVariables: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  customSwitchCases: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  fieldOptionsList: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  isListDialogOpen: PropTypes.bool.isRequired,
  setListConditionDialog: PropTypes.func.isRequired,
};
