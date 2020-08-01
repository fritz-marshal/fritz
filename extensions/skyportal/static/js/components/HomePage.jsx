import React from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import SourceList from './SourceList';
import GroupList from './GroupList';
import NewsFeed from './NewsFeed';
import TopSources from './TopSources';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    width: "100%",
    padding: theme.spacing(1),
    textAlign: 'left',
    color: theme.palette.text.primary,
  },
}));

const HomePage = () => {
  const classes = useStyles();
  const groups = useSelector((state) => state.groups.user);

  return (
    <div>
      <Grid container spacing={2}>
        <Grid container item sm={12} md={8}>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <SourceList />
            </Paper>
          </Grid>
        </Grid>
        <Grid container item sm={12} md={4}>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <NewsFeed />
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <GroupList title="My Groups" groups={groups} />
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <TopSources />
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
};

export default HomePage;
