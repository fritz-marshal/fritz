import React from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";

import Drawer from "@material-ui/core/Drawer";
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import { blue } from "@material-ui/core/colors";
import HomeIcon from "@material-ui/icons/Home";
import SearchIcon from "@material-ui/icons/Search";
import ExploreIcon from '@material-ui/icons/Explore';
import InfoIcon from "@material-ui/icons/Info";
import MenuIcon from "@material-ui/icons/Menu";
import StorageIcon from '@material-ui/icons/Storage';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";

import HeaderContent from "./HeaderContent";
import * as Actions from "../ducks/sidebar";

const drawerWidth = 190;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  appBar: {
    position: "fixed",
    zIndex: 100,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    height: "6em",
    background: "#11063c",
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: theme.spacing(2),
    paddingTop: "1.3em",
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    zIndex: 99,
    width: drawerWidth,
    paddingLeft: "0.4em",
    background: "#33345C",
    fontSize: "1.2em",
  },
  toolbar: {
    display: "flex",
    height: "4em",
    padding: "1em 0em",
    alignItems: "center",
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    paddingTop: "6em",
    justifyContent: 'flex-end',
  },
  link: {
    color: "#B8D2FF",
    textDecoration: "none",
  }
}));

const SidebarAndHeader = ({ open, root }) => {
  const dispatch = useDispatch();
  const classes = useStyles();

  const handleToggleSidebarOpen = () => {
    dispatch(Actions.toggleSidebar());
  };

  return (
    <>
      <AppBar
        className={classes.appBar}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleToggleSidebarOpen}
            edge="start"
            className={classes.menuButton}
          >
            <MenuIcon />
          </IconButton>
          <HeaderContent root={root} />
        </Toolbar>
      </AppBar>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={open}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div className={classes.drawerHeader} />
        <List>
          <Link to="/" className={classes.link}>
            <ListItem button name="sidebarDashboardButton">
              <ListItemIcon>
                <HomeIcon style={{ color: blue[200] }} />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
          </Link>
          <Link to="/sources" className={classes.link}>
            <ListItem button name="sidebarSourcesButton">
              <ListItemIcon>
                <StorageIcon style={{ color: blue[200] }} />
              </ListItemIcon>
              <ListItemText primary="Sources" />
            </ListItem>
          </Link>
          <Link to="/candidates" className={classes.link}>
            <ListItem button name="sidebarCandidatesButton">
              <ListItemIcon>
                <SearchIcon style={{ color: blue[200] }} />
              </ListItemIcon>
              <ListItemText primary="Candidates" />
            </ListItem>
          </Link>
          <Link to="/alerts" className={classes.link}>
            <ListItem button name="sidebarAlertsButton">
              <ListItemIcon>
                <ExploreIcon style={{ color: blue[200] }} />
              </ListItemIcon>
              <ListItemText primary="Alerts" />
            </ListItem>
          </Link>
          <Link to="/groups" className={classes.link}>
            <ListItem button name="sidebarGroupsButton">
              <ListItemIcon>
                <GroupWorkIcon style={{ color: blue[200] }} />
              </ListItemIcon>
              <ListItemText primary="Groups" />
            </ListItem>
          </Link>
          <Link to="/about" className={classes.link}>
            <ListItem button name="sidebarAboutButton">
              <ListItemIcon>
                <InfoIcon style={{ color: blue[200] }} />
              </ListItemIcon>
              <ListItemText primary="About" />
            </ListItem>
          </Link>
        </List>
      </Drawer>
    </>
  );
};

SidebarAndHeader.propTypes = {
  open: PropTypes.bool.isRequired,
  root: PropTypes.string.isRequired
};

export default SidebarAndHeader;
