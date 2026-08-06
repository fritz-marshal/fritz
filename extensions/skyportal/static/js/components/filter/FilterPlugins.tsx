import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Paper from "@mui/material/Paper";
import { makeStyles } from "tss-react/mui";
import CircularProgress from "@mui/material/CircularProgress";

import { useGetFilterQuery } from "../../ducks/filter";
import { useGetBrokersQuery } from "../../ducks/brokers";
import { setBrokerFilterTarget } from "../../ducks/brokerFilterTarget";

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

// Skyportal's FilterPlugins renders the broker builder for any filter with a
// broker_id, defaulting to BOOM when it has none. Fritz adds the Kowalski
// fallback, which takes precedence for the filters that predate broker_id.
const FilterPlugins = ({ group }: FilterPluginsProps) => {
  const { classes } = useStyles();

  const { fid } = useParams();

  const { data: filter } = useGetFilterQuery(fid ?? "", {
    skip: !fid,
  }) as any;
  const { data: brokers } = useGetBrokersQuery();
  const [kowalski, setKowalski] = useState<boolean | null>(null);

  useEffect(() => {
    if (!filter || filter.broker_id || kowalski !== null) {
      return;
    }
    // Called directly rather than via the Redux action to avoid toasts on 404.
    fetch(`/api/kowalski/filters/${fid}/v`)
      .then((response) => setKowalski(response.status === 200))
      .catch(() => setKowalski(false));
  }, [fid, filter, kowalski]);

  if (!filter) {
    return (
      <Paper className={classes.paperDiv}>
        <CircularProgress />
      </Paper>
    );
  }

  if (filter.broker_id) {
    // Set synchronously, before BoomFilterPlugins' mount effects read it.
    setBrokerFilterTarget(filter.broker_id);
    return <BoomFilterPlugins />;
  }

  if (kowalski === null) {
    return (
      <Paper className={classes.paperDiv}>
        <CircularProgress />
      </Paper>
    );
  }

  if (kowalski) {
    return <KowalskiFilterPlugins group={group} />;
  }

  // A filter that is neither broker-attached nor from Kowalski is newly
  // created; the backend attaches it to BOOM on its first version.
  const boomBrokerId = brokers?.find(
    (broker: any) => broker.broker_classname === "BOOMBROKER",
  )?.id;
  if (!boomBrokerId) {
    return <></>;
  }
  setBrokerFilterTarget(boomBrokerId);
  return <BoomFilterPlugins />;
};

export default FilterPlugins;
