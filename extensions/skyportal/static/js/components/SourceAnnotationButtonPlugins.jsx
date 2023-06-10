import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import CircularProgress from "@mui/material/CircularProgress";
import Button from "./Button";

import * as archiveActions from "../ducks/archive";

const PositionedMenu = ({handle, menu_name, menu_items, disabled}) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const handleClickMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleCloseMenu = (item) => {
        setAnchorEl(null);
        if (item) {
            handle(item);
        }
    };

    return (
        <div>
            <Button
                secondary
                size="small"
                id="demo-positioned-button"
                aria-controls={open ? 'demo-positioned-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClickMenu}
                disabled={disabled}
            >
                {menu_name}
            </Button>
            <Menu
                id={`${menu_name}_menu`}
                aria-labelledby={`${menu_name}_menu_button`}
                anchorEl={anchorEl}
                open={open}
                onClose={handleCloseMenu}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                {menu_items.map((item) => (
                    <MenuItem onClick={
                        (event) => {
                            event.preventDefault();
                            handleCloseMenu(item)
                        }
                    }>{item}</MenuItem>
                ))}
            </Menu>
        </div>
    );
}

const SourceAnnotationButtonPlugins = ({source}) =>
{
    const dispatch = useDispatch();
    const catalogNames = useSelector((state) => state.catalog_names);

    useEffect(() => {
        const fetchCatalogNames = () => {
        dispatch(archiveActions.fetchCatalogNames());
        };
        if (!catalogNames) {
            fetchCatalogNames();
        }
    }, [catalogNames, dispatch]);

    const scope_catalogs =[];
    if (Array.isArray(catalogNames)) {
        // if the catalogs start with ZTF_source_features_DR, then are followed by a number, and nothing else, then they are scope catalogs
        for (let i = 0; i < catalogNames.length; i++) {
            if (catalogNames[i].startsWith("ZTF_source_features_DR") && !isNaN(catalogNames[i].slice(22))) {
                scope_catalogs.push(catalogNames[i].slice(20))
            }
        }
    }

    const [isSubmittingAnnotationScopeFeatures, setIsSubmittingAnnotationScopeFeatures] =
        useState(null);
    const handleAnnotationScopeFeatures = async (id, ra, dec, item) => {
        setIsSubmittingAnnotationScopeFeatures(id);
        const catalog = `ZTF_source_features_${item}`;
        await dispatch(archiveActions.fetchScopeFeatures({id, ra, dec, catalog}));
        setIsSubmittingAnnotationScopeFeatures(null);
    };

    const handleMenu = (item) => {
        if (item && scope_catalogs.includes(item)) {
            handleAnnotationScopeFeatures(source.id, source.ra, source.dec, item);
        }
    };

    return (
    <>
        {isSubmittingAnnotationScopeFeatures === source.id || !catalogNames ? (
        <div>
        <CircularProgress />
        </div>
    ) : (
        <PositionedMenu
            handle={handleMenu}
            menu_name="Scope Features"
            menu_items={scope_catalogs}
            disabled={scope_catalogs.length === 0}
        />
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
