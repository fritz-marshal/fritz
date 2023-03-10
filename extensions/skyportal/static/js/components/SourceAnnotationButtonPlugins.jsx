import React, { useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";

import CircularProgress from "@mui/material/CircularProgress";
import Button from "./Button";

import * as archiveActions from "../ducks/archive";

const SourceAnnotationButtonPlugins = ({source}) =>
{
    const dispatch = useDispatch();

    const [isSubmittingAnnotationScopeFeatures, setIsSubmittingAnnotationScopeFeatures] =
        useState(null);
    const handleAnnotationScopeFeatures = async (id, ra, dec) => {
        setIsSubmittingAnnotationScopeFeatures(id);
        await dispatch(archiveActions.fetchScopeFeatures({id, ra, dec}));
        setIsSubmittingAnnotationScopeFeatures(null);
    };

    return (
    <>
        {isSubmittingAnnotationScopeFeatures === source.id ? (
        <div>
        <CircularProgress />
        </div>
    ) : (
        <Button
        secondary
        onClick={() => {
            handleAnnotationScopeFeatures(source.id, source.ra, source.dec);
        }}
        size="small"
        type="submit"
        data-testid={`scopeFeaturesRequest_${source.id}`}
        >
        SCoPe Features
        </Button>
    )}
    </>
    );
    };


SourceAnnotationButtonPlugins.propTypes = {
    source: PropTypes.shape({
        id: PropTypes.string.isRequired,
        ra: PropTypes.number.isRequired,
        dec: PropTypes.number.isRequired,
    }).isRequired,
    };

 export default SourceAnnotationButtonPlugins;
