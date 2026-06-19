import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Paper from "@mui/material/Paper";
import { makeStyles } from "tss-react/mui";
import CircularProgress from "@mui/material/CircularProgress";

import { useAppSelector } from "../../types/hooks";

import { useGetFilterQuery } from "../../ducks/filter";

import BoomFilterPlugins from "./boom/BoomFilterPlugins";
import KowalskiFilterPlugins from "./kowalski/KowalskiFilterPlugins";

interface FilterPluginsProps {
  group: any;
}

const useStyles = makeStyles()(() => ({
  paperDiv: {
    padding: "1rem",
    height: "100%",
  },
}));

const FilterPlugins = ({ group }: FilterPluginsProps) => {
  const { classes } = useStyles();

  const { fid } = useParams();

  const { data: filter } = useGetFilterQuery(fid ?? "", {
    skip: !fid,
  }) as any;
  const [filterOrigin, setFilterOrigin] = useState<any>(null);

  useEffect(() => {
    if (filterOrigin || !filter) {
      return;
    }
    // Determine filter origin
    if (filter?.altdata?.boom) {
      setFilterOrigin("boom");
    } else {
      // Check if filter exists in Kowalski (we call the API directy and not via the
      // Redux action o avoid toast notifications for status codes other than 200)
      fetch(`/api/kowalski/filters/${fid}/v`)
        .then((response) => {
          if (response.status === 200) {
            console.log(
              "Filter found in Kowalski, setting filter origin to kowalski",
            );
            setFilterOrigin("kowalski");
          } else if (response.status === 404) {
            console.log(
              "Filter not found in Kowalski, setting filter origin to boom",
            );
            setFilterOrigin("boom");
          } else {
            console.error(
              `Unexpected response status ${response.status} when determining filter origin`,
            );
            setFilterOrigin("boom");
          }
        })
        .catch(() => {
          console.error("Error occurred while determining filter origin");
          setFilterOrigin("unknown");
        });
    }
  }, [fid, filter]);

  const allGroups = useAppSelector((state) => (state as any).groups.all);

  const groupLookUp: Record<string, any> = {};

  allGroups?.forEach((g: any) => {
    groupLookUp[g.id] = g;
  });

  if (!filter || filterOrigin === null) {
    return (
      <Paper className={classes.paperDiv}>
        <CircularProgress />
      </Paper>
    );
  }

  if (filterOrigin === "boom") {
    return <BoomFilterPlugins group={group} />;
  } else if (filterOrigin === "kowalski") {
    return <KowalskiFilterPlugins group={group} />;
  } else {
    return (
      <Paper className={classes.paperDiv}>
        <div>Unable to determine filter type.</div>
      </Paper>
    );
  }
};

export default FilterPlugins;
