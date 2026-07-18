import React from "react";
import { Link } from "react-router-dom";

import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import Button from "../Button";

import ArchiveSearchButton from "../archive/ArchiveSearchButton";

interface SourcePluginsProps {
  source: any;
}

// Broker alerts now use SkyPortal's native /brokers page (prefilled from the
// object's id + position); the kowalski ZTF archive search stays fritz-specific.
const brokerAlertsHref = (source: any) => {
  const params = new URLSearchParams({ objectId: source.id, survey: "ZTF" });
  if (source.ra != null && source.dec != null) {
    params.set("ra", String(source.ra));
    params.set("dec", String(source.dec));
    params.set("radius", "3");
  }
  return `/brokers?${params.toString()}`;
};

const SourcePlugins = ({ source }: SourcePluginsProps) => {
  const [anchorElArchive, setAnchorElArchive] = React.useState<any>(null);
  const openArchive = Boolean(anchorElArchive);

  return (
    <div>
      <Button
        aria-controls={openArchive ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={openArchive ? "true" : undefined}
        onClick={(e: any) => setAnchorElArchive(e.currentTarget)}
        primary
        size="small"
      >
        ZTF ARCHIVES
      </Button>
      <Menu
        transitionDuration={50}
        id="archive-menu"
        anchorEl={anchorElArchive}
        open={openArchive}
        onClose={() => setAnchorElArchive(null)}
        slotProps={{
          list: { "aria-labelledby": "basic-button" },
        }}
      >
        <MenuItem>
          <Link
            to={brokerAlertsHref(source)}
            target="_blank"
            style={{ textDecoration: "none", color: "black" }}
          >
            Broker Alerts
          </Link>
        </MenuItem>
        <MenuItem>
          <ArchiveSearchButton ra={source.ra} dec={source.dec} />
        </MenuItem>
      </Menu>
    </div>
  );
};

export default SourcePlugins;
