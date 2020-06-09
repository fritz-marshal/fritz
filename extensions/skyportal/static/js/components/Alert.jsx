import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Import our action creators from `static/js/ducks/randomString.js` - see below
import * as Actions from '../ducks/alert';


const RandomString = () => {
  const value = useSelector((state) => state.randomString);
  const dispatch = useDispatch();

  return (
    <div>
      <div>
        Back-end random string generator.
        <br />
        This is a dummy component for educational purposes.
        <br />
        Current value is: {value}
      </div>
      <div>
        <button type="button" onClick={() => dispatch(Actions.fetchRandomString())}>
          Generate new random string on the back-end.
        </button>
      </div>
    </div>
  );
};

export default RandomString;