import React from "react";
import PropTypes from "prop-types";
import * as archiveActions from "../ducks/archive";


const [isSubmittingAnnotationKowalski, setIsSubmittingAnnotationKowalski] =
    useState(null);
  const handleAnnotationKowalski = async (id, ra, dec) => {
    setIsSubmittingAnnotationKowalski(id);
    await dispatch(sourceActions.fetchKowalskiFeatures({id, ra, dec}));
    setIsSubmittingAnnotationKowalski(null);
  };

 const SourceAnnotationButtonPlugins = ({source}) =>
{
     return (
    <>
        {isSubmittingAnnotationKowalski === source.id ? (
        <div>
        <CircularProgress />
        </div>
    ) : (
        <Button
        secondary
        onClick={() => {
            handleAnnotationKowalski(source.id, source.ra, source.dec);
        }}
        size="small"
        type="submit"
        data-testid={`kowalskiRequest_${source.id}`}
        >
        KOWALSKI
        </Button>
    )};
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
