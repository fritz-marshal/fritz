import React, {useEffect, useState} from 'react';
import { useHistory } from "react-router-dom";
import PropTypes from 'prop-types';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, useTheme } from '@material-ui/core/styles';
// import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
// import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
// import ListSubheader from '@material-ui/core/ListSubheader';
import IconButton from '@material-ui/core/IconButton';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Collapse from '@material-ui/core/Collapse';

import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import TextField from '@material-ui/core/TextField';
import TextareaAutosize from '@material-ui/core/TextareaAutosize';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Divider from '@material-ui/core/Divider';


import * as groupActions from '../ducks/group';
import * as groupsActions from '../ducks/groups';
import NewGroupUserForm from './NewGroupUserForm';

import styles from './Group.css';

const useStyles = makeStyles((theme) => ({
  padding_bottom: {
    paddingBottom: "2em"
  },
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
  },
  selectEmpty: {
    width: "100%",
    marginTop: theme.spacing(2),
  },
}));

const Group = ({ route }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [groupLoadError, setGroupLoadError] = useState("");
  const [open, setOpen] = React.useState(true);
  const [expanded1, setExpanded1] = React.useState('panel1');
  const [expanded2, setExpanded2] = React.useState('panel2');

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [stream, setStream] = useState(null);
  const [scroll, setScroll] = React.useState('paper');

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const history = useHistory();

  const handleStreamChange = (event) => {
    setStream(event.target.value);
  };

  const handleClickDialogOpen = (scrollType) => {
    setDialogOpen(true);
    setScroll(scrollType);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleConfirmDeleteDialogClose = () => {
    setConfirmDeleteOpen(false);
  };

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

    const handleCancel = () => {
      onClose();
    };

    const handleOk = () => {
      onClose(value);
    };

    const stream_ids = group.streams.map((stream) => (stream.id))

    return (
      <div>
        <Typography variant="h5" style={{paddingBottom: 10}}>
          Group:&nbsp;&nbsp;{group.name}
        </Typography>

        <Accordion
          expanded={expanded1 === 'panel1'} onChange={handleChange1('panel1')}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
            style={{borderBottom: '1px solid rgba(0, 0, 0, .125)',}}
          >
            <Typography className={classes.heading}>Members</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordion_details}>
            {/*<Paper className={classes.paper}>*/}
              <List component="nav" aria-label="main mailbox folders" className={classes.paper} dense>
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
              <Divider />
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
            aria-controls="panel2-content"
            id="panel2-header"
            style={{borderBottom: '1px solid rgba(0, 0, 0, .125)',}}
          >
            <Typography className={classes.heading}>Alert stream filters</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordion_details}>
            <List component="nav"
              className={classes.padding_bottom}
            >
              {/*todo: fetch streams that the group has access to*/}
              {
                group.streams.map((stream) => (
                  <div>
                    <ListItem>
                      <ListItemText primary={stream.name}/>
                    </ListItem>
                    <List component="nav" disablePadding>
                      {
                        group.filters.map((filter) => (
                          filter.stream_id === stream.id ?
                            <Link to={`/filter/${filter.id}`} role="link">
                              <ListItem button className={classes.nested}>
                                {/*<ListItemIcon />*/}
                                <ListItemText className={classes.nested} primary={filter.name}/>
                              </ListItem>
                            </Link> : "" /*<div style={{paddingLeft: "2em"}}>No filters defined on stream</div>*/
                          )
                        )
                      }
                    </List>
                  </div>
                  )
                )
              }
            </List>

            {
              (currentUser.roles.includes('Super admin') || currentUser.roles.includes('Group admin')) && (
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button_add}
                  onClick={handleClickDialogOpen}
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
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Delete Group
            </Button>
          )
        }

        <Dialog
          fullScreen={fullScreen}
          open={dialogOpen}
          onClose={handleDialogClose}
          aria-labelledby="responsive-dialog-title"
        >
          <DialogTitle id="responsive-dialog-title">{"Create a new alert stream filter"}</DialogTitle>
          <DialogContent dividers={true}>
            <DialogContentText>
              Please refer to the &nbsp;
              <a href={"https://fritz-marshal.org/doc/user_guide.html#alert-filters-in-fritz"} target={'_blank'}>
                docs <OpenInNewIcon style={{fontSize: "small"}}/>
              </a>
              &nbsp; for an extensive guide on Alert filters in Fritz.
            </DialogContentText>
            <TextField
              autoFocus
              required
              margin="dense"
              id="name"
              label="Filter Name"
              type="text"
              fullWidth
            />
            <FormControl required className={classes.selectEmpty}>
              <InputLabel id="alert-stream-select-required-label">Alert stream</InputLabel>
              <Select
                labelId="alert-stream-select-required-label"
                id="alert-stream-select"
                value={stream}
                onChange={handleStreamChange}
                className={classes.selectEmpty}
              >
                {
                  group.streams.map((stream) => (
                      <MenuItem value={stream.id}>{stream.name}</MenuItem>
                    )
                  )
                }
              </Select>
              <FormHelperText>Required</FormHelperText>
            </FormControl>
            <br /><br />
            Filter definition:
            <TextareaAutosize
                rowsMax={10000}
                rowsMin={5}
                placeholder="Filter definition (aggregation pipeline, see the docs)"
                style={{width: "100%"}}
              />
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="primary"
              className={classes.button_add}
            >
              Test
            </Button>
            <br /><br />
            <Button
              variant="contained"
              color="primary"
              disabled={true}
              className={classes.button_add}
            >
              Save
            </Button>
            <Button autoFocus onClick={handleDialogClose} color="primary">
              Dismiss
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog fullWidth open={confirmDeleteOpen} onClose={handleConfirmDeleteDialogClose}>
          <DialogTitle>Delete Group?</DialogTitle>
          <DialogContent dividers>
            <DialogContentText>
              Are you sure you want to delete this Group?
              <br />
              Warning! This will delete the group and all of its filters.
              All source data will be transferred to the Site-wide group.
            </DialogContentText>
          </DialogContent>

          <DialogActions>
            <Button autoFocus onClick={() => setConfirmDeleteOpen(false)}>
              Dismiss
            </Button>
            <Button
              color="primary"
              onClick={() => {
                dispatch(groupsActions.deleteGroup(group.id));
                setConfirmDeleteOpen(false);
                history.push("/groups");
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

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
