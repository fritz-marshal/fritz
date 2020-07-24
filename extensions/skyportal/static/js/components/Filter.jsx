import React, {useEffect, useState, Suspense} from 'react';
import {useDispatch, useSelector} from 'react-redux';

const Filter = ({route}) => {
  const group_id = route.id;
  const filter_id = route.fid;

  return (
    <div>
      <h2>
        {group_id}
        {' '}
        {filter_id}
      </h2>
    </div>
  );
}

export default Filter;