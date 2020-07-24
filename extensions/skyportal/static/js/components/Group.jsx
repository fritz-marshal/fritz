import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import IconButton from '@material-ui/core/IconButton';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Collapse from '@material-ui/core/Collapse';

import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';

import Responsive from "./Responsive";
import FoldBox from "./FoldBox";


import * as groupActions from '../ducks/group';
import * as groupsActions from '../ducks/groups';
import NewGroupUserForm from './NewGroupUserForm';

import styles from './Group.css';

const useStyles = makeStyles((theme) => ({
  paper: {
    width: "100%",
    padding: theme.spacing(1),
    textAlign: 'left',
    color: theme.palette.text.primary,
  },
  nested: {
    paddingLeft: theme.spacing(2),
  },
  heading: {
    fontSize: theme.typography.pxToRem(17),
    fontWeight: 500,
  },
  accordion_details: {
    flexDirection: "column"
  },
  button_add: {
    maxWidth: "120px"
  }
}));

const Group = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [groupLoadError, setGroupLoadError] = useState("");
  const [open, setOpen] = React.useState(true);
  const [expanded1, setExpanded1] = React.useState('panel1');
  const [expanded2, setExpanded2] = React.useState('panel2');

  const handleChange1 = (panel) => (event, isExpanded) => {
    setExpanded1(isExpanded ? panel : false);
  };
  const handleChange2 = (panel) => (event, isExpanded) => {
    setExpanded2(isExpanded ? panel : false);
  };

  const handleClick = () => {
    setOpen(!open);
  };

  const {id} = useParams();
  const loadedId = useSelector((state) => state.group.id);

  useEffect(() => {
    const fetchGroup = async () => {
      const data = await dispatch(groupActions.fetchGroup(id));
      if (data.status === "error") {
        setGroupLoadError(data.message);
      }
    };
    fetchGroup();
  }, [id, loadedId, dispatch]);

  const group = useSelector((state) => state.group);
  const currentUser = useSelector((state) => state.profile);

  if (groupLoadError) {
    return (
      <div>
        {groupLoadError}
      </div>
    );
  }

  if (group && group.users) {
    const isAdmin = (aUser, aGroup) => (
      aGroup.group_users && aGroup.group_users.filter(
        (group_user) => (group_user.user_id === aUser.id)
      )[0].admin
    );

    let numAdmins = 0;
    group.group_users.forEach((groupUser) => {
      if (groupUser.admin) {
        numAdmins += 1;
      }
    });

    function ListItemLink(props) {
      return <ListItem button component="a" {...props} />;
    }

    return (
      <div>
        <h2>
          Group:&nbsp;&nbsp;<span style={{fontVariant: "small-caps"}}>{group.name}</span>
        </h2>

        <Accordion
          expanded={expanded1 === 'panel1'} onChange={handleChange1('panel1')}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography className={classes.heading}>Members</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordion_details}>
            {/*<Paper className={classes.paper}>*/}
              <List component="nav" aria-label="main mailbox folders" className={classes.paper}>
                {
                  group.users.map((user) => (
                    <ListItemLink href={`/user/${user.id}`}>
                      <ListItemText primary={user.username}/>
                      {
                        isAdmin(user, group) &&
                        (
                          <div style={{display: "inline-block"}}>
                          <span className={styles.badge}>
                            Admin
                          </span>
                            &nbsp;&nbsp;
                          </div>
                        )
                      }
                      {
                        isAdmin(user, group) && (numAdmins > 1) && (
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete">
                              <DeleteIcon
                                onClick={() => dispatch(
                                  groupsActions.deleteGroupUser(
                                    {
                                      username: user.username,
                                      group_id: group.id
                                    }
                                  )
                                )}
                              />
                            </IconButton>
                          </ListItemSecondaryAction>
                        )
                      }
                      {
                        !isAdmin(user, group) && (
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete">
                              <DeleteIcon
                                onClick={() => dispatch(
                                  groupsActions.deleteGroupUser(
                                    {
                                      username: user.username,
                                      group_id: group.id
                                    }
                                  )
                                )}
                              />
                            </IconButton>
                          </ListItemSecondaryAction>
                        )
                      }
                    </ListItemLink>
                    )
                  )
                }
              </List>
              <div className={classes.paper}>
                {
                  (currentUser.roles.includes('Super admin') ||
                    currentUser.roles.includes('Group admin')) && <NewGroupUserForm group_id={group.id}/>
                }
              </div>
            {/*</Paper>*/}
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded2 === 'panel2'} onChange={handleChange2('panel2')}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography className={classes.heading}>Alert stream filters</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordion_details}>
            <List
              component="nav"
              aria-labelledby="nested-list-subheader"
              className={classes.root}
            >
              {/*todo: fetch streams that the group has access to*/}
              <ListItem button onClick={handleClick}>
                <ListItemText primary="ZTF"/>
                {open ? <ExpandLess/> : <ExpandMore/>}
              </ListItem>
              <Collapse in={open} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItem button className={classes.nested}>
                    {/*<ListItemIcon />*/}
                    {/*todo: fetch filters defined for streams*/}
                    <ListItemText className={classes.nested} primary="Green transients"/>
                  </ListItem>
                </List>
              </Collapse>
            </List>

            {
              (currentUser.roles.includes('Super admin') || currentUser.roles.includes('Group admin')) && (
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button_add}
                >
                  Add filter
                </Button>
              )
            }
          </AccordionDetails>
        </Accordion>

        <br/>
        {
          (currentUser.roles.includes('Super admin') ||
            currentUser.roles.includes('Group admin')) &&
          (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => dispatch(
                groupsActions.deleteGroup(group.id)
              )}
            >
              Delete Group
            </Button>
          )
        }
      </div>
    );
  }
  return <div>Loading group</div>;
};

Group.propTypes = {
  route: PropTypes.shape({
    id: PropTypes.string
  }).isRequired
};

export default Group;
