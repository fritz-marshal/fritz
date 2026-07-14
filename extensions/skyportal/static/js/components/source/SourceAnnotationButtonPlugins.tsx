import React, { useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import CircularProgress from "@mui/material/CircularProgress";

import Button from "../Button";

import {
  useGetCatalogNamesQuery,
  useFetchScopeFeaturesMutation,
} from "../../ducks/kowalski_archive";

interface PositionedMenuProps {
  handle: (item: any) => void;
  menu_name: string;
  menu_items: string[];
  disabled: boolean;
}

const PositionedMenu = ({
  handle,
  menu_name,
  menu_items,
  disabled,
}: PositionedMenuProps) => {
  const [anchorEl, setAnchorEl] = React.useState<any>(null);
  const open = Boolean(anchorEl);
  const handleClickMenu = (event: any) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMenu = (item?: any) => {
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
        aria-controls={open ? "demo-positioned-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
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
        onClose={() => handleCloseMenu()}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        {menu_items.map((item: string) => (
          <MenuItem
            onClick={(event: any) => {
              event.preventDefault();
              handleCloseMenu(item);
            }}
            key={item}
          >
            {item}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
};

interface SourceAnnotationButtonPluginsProps {
  source: {
    id: string;
    ra: number;
    dec: number;
  };
}

const SourceAnnotationButtonPlugins = ({
  source,
}: SourceAnnotationButtonPluginsProps) => {
  const { data: catalogNames } = useGetCatalogNamesQuery();
  const [fetchScopeFeatures] = useFetchScopeFeaturesMutation();

  const scope_catalogs: string[] = [];
  if (Array.isArray(catalogNames)) {
    // if the catalogs start with ZTF_source_features_DR, then are followed by a number, and nothing else, then they are scope catalogs
    for (let i = 0; i < catalogNames.length; i++) {
      if (
        catalogNames[i].startsWith("ZTF_source_features_DR") &&
        !isNaN(catalogNames[i].slice(22))
      ) {
        scope_catalogs.push(catalogNames[i].slice(20));
      }
    }
  }

  const [
    isSubmittingAnnotationScopeFeatures,
    setIsSubmittingAnnotationScopeFeatures,
  ] = useState<any>(null);
  const handleAnnotationScopeFeatures = async (
    id: any,
    ra: any,
    dec: any,
    item: any,
  ) => {
    setIsSubmittingAnnotationScopeFeatures(id);
    const catalog = `ZTF_source_features_${item}`;
    await fetchScopeFeatures({ id, ra, dec, catalog });
    setIsSubmittingAnnotationScopeFeatures(null);
  };

  const handleMenu = (item: any) => {
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

export default SourceAnnotationButtonPlugins;
