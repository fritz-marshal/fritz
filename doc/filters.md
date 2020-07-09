# Alert filters in `Fritz`

In this tutorial, we will discuss the alert filters in `Fritz`:
- Technical details on the implementation
- Filter examples with step-by-step explanations 

## Introduction

One of `Fritz`'s submodules, `Kowalski`, constantly listens to the alert streams and persists the alert data in a 
database. `Kowalski` additionally computes a number of frequently-used quantities such as the Galactic coordinates for 
each alert, cross-matches them with several external catalogs, and executes machine learning models. 

`Kowalski` uses `MongoDB`, a document-based NoSQL database, on the backend. 
See [here](https://github.com/dmitryduev/ay119/blob/master/databases/mongodb.ipynb) and the references therein 
for a brief introduction into `MongoDB`.   

### Filtering implementation

Upon alert ingestion into the database, `Kowalski` executes user-defined filters and reports the passing alerts 
to `Fritz`'s `SkyPortal` submodule. This is implemented as a `MongoDB` aggregation pipeline that first "massages" 
the newly ingested alert data such that the user's filter deals with enhanced "packets" containing, for example, 
the full photometry history (and not just the rolling 30-day window), cross-match data, and custom ML scores.

The [MongoDB aggregation pipeline](https://docs.mongodb.com/manual/core/aggregation-pipeline/) is a framework 
for data aggregation modeled on the concept of data processing pipelines. Documents enter a multi-stage pipeline 
that transforms the documents into aggregated results.

### User interfaces

To ease the process of writing and debugging the filters, we have set up a live public `MongoDB Atlas` database 
in the cloud with a curated set of sample public ZTF alerts.

In this tutorial, we will show how to use a tool called [MongoDB Compass](https://www.mongodb.com/try/download/compass) 
(the full version is now free) to construct and debug aggregation pipelines aka alert filters that can be then 
plugged into `Fritz`.

Filters will be managed on a dedicated page on `Fritz`. A detailed description of the interface and its capabilities
(including, for example, filter versioning and diff'ing) will be covered elsewhere -- please stay tuned.

#### MongoDB Compass

Download and install MongoDB Compass for your system from [here](https://www.mongodb.com/try/download/compass).

The connection string to access the sample public alert database:
```
mongodb://ztf:FritzZwicky@fritz-test-shard-00-00-uas9d.gcp.mongodb.net:27017,fritz-test-shard-00-01-uas9d.gcp.mongodb.net:27017,fritz-test-shard-00-02-uas9d.gcp.mongodb.net:27017/test?authSource=admin&replicaSet=fritz-test-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true
```

Upon connection, select the `ZTF_alerts` collection and go to the Aggregations tab. 

### "Upstream" aggregation pipeline stages

The upstream "massaging" mentioned above is performed by `Fritz` for each alert and includes:

- Selecting the newly ingested alert from the `ZTF_alerts` collection by its `candid`
- Removing the image cutouts to reduce traffic
- Joining the alert by its `objectId` with the corresponding entry in the `ZTF_alerts_aux` collection, which contains 
the cross-matches, ML scores, computed quantities, and archival photometry

The upstream stages also take care of the ACLs.

`Fritz` automatically prepends these stages to all user-defined filters. 

### Limitations

`$lookup` stages are not allowed in the user-defined filters.

## Filter examples

### Simple filter

[fritz_filter_101.json](data/filter_examples/fritz_filter_101.json)

```js
[ 
  /* UPSTREAM STAGES -- automatically prepended by Fritz to user-defined filters */
  // UPSTREAM STAGE: For this example, we will select alerts by objectId. In practice, alert is selected by candid
  {
    "$match": {
      "objectId": "ZTF20aaelulu"
    }
  },
  // UPSTREAM STAGE: Remove the cutouts
  {
    "$project": {
      "cutoutScience": 0,
      "cutoutTemplate": 0,
      "cutoutDifference": 0
    }
  },
  // UPSTREAM STAGE: Join alert with auxiliary data stored in ZTF_alerts_aux collection
  {
    "$lookup": {
      "from": "ZTF_alerts_aux",
      "localField": "objectId",
      "foreignField": "_id",
      "as": "aux"
    }
  },
  // UPSTREAM STAGE: Reshuffle and apply ACLs
  {
    "$project": {
      "cross_matches": {
        "$arrayElemAt": [
          "$aux.cross_matches",
          0
        ]
      },
      "prv_candidates": {
        "$filter": {
          "input": {
            "$arrayElemAt": [
              "$aux.prv_candidates",
              0
            ]
          },
          "as": "item",
          "cond": {
            "$in": [
              "$$item.programid",
              [
                1
              ]
            ]
          }
        }
      },
      "schemavsn": 1,
      "publisher": 1,
      "objectId": 1,
      "candid": 1,
      "candidate": 1,
      "classifications": 1,
      "coordinates": 1
    }
  },
  /* USER-DEFINED PART */
  // Select alerts with drb scores greater than 0.9999999 that don't have any matches with 
  // Gaia_DR2 catalog (zeroth element of corresponding array does not exist)
  {
    "$match": {
      "candidate.drb": {
        "$gt": 0.9999999
      },
      "cross_matches.Gaia_DR2.0": {
        "$exists": false
      }
    }
  },
  // Add annotations
  {
    "$project": {
      "_id": 0,
      "annotations.author": "dd",
      "annotations.mean_rb": {
        "$avg": "$prv_candidates.rb"
      }
    }
  }
]
```

### CLU filter

Now that we've looked at the basic concepts, let us explore a concrete example a build a filter for 
the Census of the Local Universe program.

As a reference, we will use the filter definition from the GROWTH marshal translated into `python` code:

```python
def clu_filter(current_observation):
    filteron = False
    annotations = {}
    calccount = 10000
    bright = False
    nopointunderneath = True
    mover = True
    real = False
    tdiff = (-99.0)
    magdiff = (-99)
    riserate = (-99)
    decayrate = (-99)
    hostgr = (-99)
    hostri = (-99)
    positivesubtraction = False
    brightstar = False
    highlum = False
    deltajd = 0
    prevcandidates = current_observation['prv_candidates']
    m_now = current_observation['candidate']['magpsf']
    m_app = current_observation['candidate']['magap']
    t_now = current_observation['candidate']['jd']
    fid_now = current_observation['candidate']['fid']
    sgscore = current_observation['candidate']['sgscore1']
    sgscore2 = current_observation['candidate']['sgscore2']
    sgscore3 = current_observation['candidate']['sgscore3']
    srmag = current_observation['candidate']['srmag1']
    srmag2 = current_observation['candidate']['srmag2']
    srmag3 = current_observation['candidate']['srmag3']
    sgmag = current_observation['candidate']['sgmag1']
    simag = current_observation['candidate']['simag1']
    rbscore = current_observation['candidate']['rb']
    magnr = current_observation['candidate']['magnr']
    distnr = current_observation['candidate']['distnr']
    distpsnr1 = current_observation['candidate']['distpsnr1']
    distpsnr2 = current_observation['candidate']['distpsnr2']
    distpsnr3 = current_observation['candidate']['distpsnr3']
    scorr = current_observation['candidate']['scorr']
    fwhm = current_observation['candidate']['fwhm']
    elong = current_observation['candidate']['elong']
    nbad = current_observation['candidate']['nbad']
    chipsf = current_observation['candidate']['chipsf']
    gal_lat = current_observation['candidate']['gal_lat']
    jdstarthist = current_observation['candidate']['jdstarthist']
    jdendhist = current_observation['candidate']['jdendhist']
    ssdistnr = current_observation['candidate']['ssdistnr']
    ssmagnr = current_observation['candidate']['ssmagnr']
    drb = current_observation['candidate']['drb']
    if (jdstarthist and jdendhist):
        deltajd = jdendhist - jdstarthist
        calccount -= 2
    psfminap = m_now - m_app
    bright = m_now < 99.0
    if (current_observation['candidate']['isdiffpos'] and (current_observation['candidate']['isdiffpos'] == 't' or current_observation['candidate']['isdiffpos'] == '1')):
        positivesubtraction = True
        calccount -= 2
    if (rbscore and rbscore > 0.3 and drb > 0.5 and fwhm > 0.5 and fwhm < 8 and nbad < 5 and (psfminap < 0.75 or psfminap > (-0.75))):
        real = True
        calccount -= 2
    if (sgscore and distpsnr1 and sgscore > 0.76 and distpsnr1 < 2):
        nopointunderneath = False
        calccount -= 2
    if ((distpsnr1 and srmag and distpsnr1 < 20 and srmag < 15.0 and srmag > 0 and sgscore > 0.49) or (distpsnr2 and srmag2 and distpsnr2 < 20 and srmag2 < 15.0 and srmag2 > 0 and sgscore2 > 0.49) or (distpsnr3 and srmag3 and distpsnr3 < 20 and srmag3 < 15.0 and srmag3 > 0 and sgscore3 > 0.49)):
        brightstar = True
        calccount -= 2
    for candidate in prevcandidates:
        calccount -= 2
        if (candidate['jd'] and candidate['magpsf'] and candidate['fid'] and candidate['isdiffpos'] and (candidate['isdiffpos'] == 't' or candidate['isdiffpos'] == '1')):
            dt = t_now - candidate['jd']
            if (dt > 0.02 and candidate['magpsf'] < 99 and (ssdistnr > 2 or ssdistnr < (-0.5))):
                mover = False
                calccount -= 2
            calccount -= 3
        if calccount < 0:
            break
    prevcandidates = current_observation['prv_candidates']
    m_now = current_observation['candidate']['magpsf']
    m_max = current_observation['candidate']['magpsf']
    m_min = current_observation['candidate']['magpsf']
    t_now = current_observation['candidate']['jd']
    t_max = current_observation['candidate']['jd']
    t_min = current_observation['candidate']['jd']
    fid_now = current_observation['candidate']['fid']
    for candidate in prevcandidates:
        calccount -= 2
        if (candidate['jd'] and candidate['magpsf'] and candidate['fid'] and candidate['isdiffpos'] and (candidate['isdiffpos'] == 't' or candidate['isdiffpos'] == '1')):
            if (candidate['fid'] and candidate['fid'] == fid_now):
                if (m_now < 99 and candidate['magpsf'] < 99):
                    if (candidate['magpsf'] > m_max):
                        m_max = candidate['magpsf']
                        t_max = candidate['jd']
                        calccount -= 3
                    else:
                        if (candidate['magpsf'] < m_min):
                            m_min = candidate['magpsf']
                            t_min = candidate['jd']
                            calccount -= 3
                        calccount -= 2
                    calccount -= 3
                calccount -= 2
            calccount -= 2
        if calccount < 0:
            break
    tdiff = t_max - t_min
    magdiff = m_min - m_max
    if (tdiff != 0):
        if (tdiff > 0):
            riserate = magdiff / tdiff
            calccount -= 2
        else:
            decayrate = (-magdiff) / tdiff
            calccount -= 2
        calccount -= 3
    if (ssdistnr < 2 and ssdistnr > (-0.5)):
        mover = True
        calccount -= 2
    hostgr = sgmag - srmag
    hostri = srmag - simag
    annotations['FWHM'] = fwhm
    annotations['host g-r'] = hostgr
    annotations['host r-i'] = hostri
    annotations['mag at max'] = m_max
    annotations['time at max'] = t_max
    annotations['min-mag'] = m_min
    annotations['min-time'] = t_min
    annotations['time difference'] = tdiff
    annotations['mag diff'] = magdiff
    annotations['rise rate'] = riserate
    annotations['decay rate'] = decayrate
    annotations['host ZTF ref PSF r-mag'] = magnr
    annotations['PS1 psf r-mag'] = srmag
    annotations['rb score'] = rbscore
    annotations['sgscore1'] = sgscore
    annotations['ZOGI scorr'] = scorr
    annotations['distpsnr1'] = distpsnr1
    annotations['distpsnr2'] = distpsnr2
    annotations['distpsnr3'] = distpsnr3
    annotations['magpsf'] = m_now
    annotations['elongation'] = elong
    annotations['magap_min_magpsf'] = psfminap
    annotations['gal_lat'] = gal_lat
    annotations['deltajd'] = deltajd
    filteron = bright and nopointunderneath and ((not mover)) and real and positivesubtraction and ((not brightstar))
    return filteron, annotations
```

The `Fritz`-implementation that can be loaded into Compass can be found here:

[fritz_filter_clu.json](data/filter_examples/fritz_filter_clu.json)

Let us explore it step by step:

```js
[
  {
    "$match": {
      "objectId": "ZTF20aacbyec", 
      "candidate.programid": {
        "$in": [
          1, 2, 3
        ]
      }
    }
  }, {
    "$project": {
      "cutoutScience": 0, 
      "cutoutTemplate": 0, 
      "cutoutDifference": 0
    }
  }, {
    "$lookup": {
      "from": "ZTF_alerts_aux", 
      "localField": "objectId", 
      "foreignField": "_id", 
      "as": "aux"
    }
  }, {
    "$project": {
      "cross_matches": {
        "$arrayElemAt": [
          "$aux.cross_matches", 0
        ]
      }, 
      "prv_candidates": {
        "$filter": {
          "input": {
            "$arrayElemAt": [
              "$aux.prv_candidates", 0
            ]
          }, 
          "as": "item", 
          "cond": {
            "$in": [
              "$$item.programid", [
                1
              ]
            ]
          }
        }
      }, 
      "schemavsn": 1, 
      "publisher": 1, 
      "objectId": 1, 
      "candid": 1, 
      "candidate": 1, 
      "classifications": 1, 
      "coordinates": 1
    }
  }, {
    "$project": {
      "_id": 0, 
      "candid": 1, 
      "objectId": 1, 
      "prv_candidates.jd": 1, 
      "prv_candidates.magpsf": 1, 
      "prv_candidates.fid": 1, 
      "prv_candidates.isdiffpos": 1, 
      "isdiffpos": "$candidate.isdiffpos", 
      "m_now": "$candidate.magpsf", 
      "m_app": "$candidate.magap", 
      "t_now": "$candidate.jd", 
      "fid_now": "$candidate.fid", 
      "sgscore": "$candidate.sgscore1", 
      "sgscore2": "$candidate.sgscore2", 
      "sgscore3": "$candidate.sgscore3", 
      "srmag": "$candidate.srmag1", 
      "srmag2": "$candidate.srmag2", 
      "srmag3": "$candidate.srmag3", 
      "sgmag": "$candidate.sgmag1", 
      "simag": "$candidate.simag1", 
      "rbscore": "$candidate.rb", 
      "drb": "$candidate.drb", 
      "magnr": "$candidate.magnr", 
      "distnr": "$candidate.distnr", 
      "distpsnr1": "$candidate.distpsnr1", 
      "distpsnr2": "$candidate.distpsnr2", 
      "distpsnr3": "$candidate.distpsnr3", 
      "scorr": "$candidate.scorr", 
      "fwhm": "$candidate.fwhm", 
      "elong": "$candidate.elong", 
      "nbad": "$candidate.nbad", 
      "chipsf": "$candidate.chipsf", 
      "gal_lat": "$coordinates.b", 
      "ssdistnr": "$candidate.ssdistnr", 
      "ssmagnr": "$candidate.ssmagnr", 
      "ssnamenr": "$candidate.ssnamenr", 
      "jdstarthist": "$candidate.jdstarthist", 
      "jdendhist": "$candidate.jdendhist", 
      "deltajd": {
        "$subtract": [
          "$candidate.jdendhist", "$candidate.jdstarthist"
        ]
      }, 
      "psfminap": {
        "$subtract": [
          "$candidate.magpsf", "$candidate.magap"
        ]
      }, 
      "candidates_fid": {
        "$concatArrays": [
          {
            "$filter": {
              "input": "$prv_candidates", 
              "as": "cand", 
              "cond": {
                "$and": [
                  {
                    "$eq": [
                      "$$cand.fid", "$candidate.fid"
                    ]
                  }, {
                    "$gt": [
                      "$$cand.magpsf", 0
                    ]
                  }, {
                    "$lt": [
                      "$$cand.magpsf", 99
                    ]
                  }
                ]
              }
            }
          }, [
            {
              "jd": "$candidate.jd", 
              "magpsf": "$candidate.magpsf"
            }
          ]
        ]
      }
    }
  }, {
    "$project": {
      "t_now": 1, 
      "m_now": 1, 
      "fid_now": 1, 
      "sgscore": 1, 
      "drbscore": 1, 
      "magnr": 1, 
      "distnr": 1, 
      "scorr": 1,
      "ssdistnr": 1, 
      "ssnamenr": 1, 
      "rbscore": 1, 
      "drb": 1, 
      "sgmag": 1, 
      "srmag": 1, 
      "simag": 1, 
      "distpsnr1": 1, 
      "distpsnr2": 1, 
      "distpsnr3": 1, 
      "fwhm": 1, 
      "elong": 1, 
      "gal_lat": 1, 
      "jdstarthist": 1, 
      "jdendhist": 1, 
      "psfminap": 1, 
      "candidates_fid": 1, 
      "m_max_index": {
        "$indexOfArray": [
          "$candidates_fid.magpsf", {
            "$max": [
              "$candidates_fid.magpsf"
            ]
          }
        ]
      }, 
      "m_min_index": {
        "$indexOfArray": [
          "$candidates_fid.magpsf", {
            "$min": [
              "$candidates_fid.magpsf"
            ]
          }
        ]
      }, 
      "bright": {
        "$lt": [
          "$m_now", 99.0
        ]
      }, 
      "positivesubtraction": {
        "$in": [
          "$isdiffpos", [
            1, "1", "t", true
          ]
        ]
      }, 
      "real": {
        "$and": [
          {
            "$gt": [
              "$rbscore", 0.3
            ]
          }, {
            "$gt": [
              "$drb", 0.5
            ]
          }, {
            "$gt": [
              "$fwhm", 0.5
            ]
          }, {
            "$lt": [
              "$fwhm", 8
            ]
          }, {
            "$lt": [
              "$nbad", 5
            ]
          }, {
            "$lt": [
              {
                "$abs": "$psfminap"
              }, 0.75
            ]
          }
        ]
      }, 
      "nopointunderneath": {
        "$not": [
          {
            "$and": [
              {
                "$gt": [
                  "$sgscore", 0.76
                ]
              }, {
                "$lt": [
                  "$distpsnr1", 2
                ]
              }
            ]
          }
        ]
      }, 
      "brightstar": {
        "$or": [
          {
            "$and": [
              {
                "$lt": [
                  "$distpsnr1", 20
                ]
              }, {
                "$lt": [
                  "$srmag", 15
                ]
              }, {
                "$gt": [
                  "$srmag", 0
                ]
              }, {
                "$gt": [
                  "$sgscore", 0.49
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$lt": [
                  "$distpsnr2", 20
                ]
              }, {
                "$lt": [
                  "$srmag2", 15
                ]
              }, {
                "$gt": [
                  "$srmag2", 0
                ]
              }, {
                "$gt": [
                  "$sgscore2", 0.49
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$lt": [
                  "$distpsnr3", 20
                ]
              }, {
                "$lt": [
                  "$srmag3", 15
                ]
              }, {
                "$gt": [
                  "$srmag3", 0
                ]
              }, {
                "$gt": [
                  "$sgscore3", 0.49
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$eq": [
                  "$sgscore", 0.5
                ]
              }, {
                "$lt": [
                  "$distpsnr1", 0.5
                ]
              }, {
                "$or": [
                  {
                    "$lt": [
                      "$sgmag", 17
                    ]
                  }, {
                    "$lt": [
                      "$srmag", 17
                    ]
                  }, {
                    "$lt": [
                      "$simag", 17
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }, 
      "variablesource": {
        "$or": [
          {
            "$and": [
              {
                "$lt": [
                  "$distnr", 0.4
                ]
              }, {
                "$lt": [
                  "$magnr", 19
                ]
              }, {
                "$gt": [
                  "$age", 90
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$lt": [
                  "$distnr", 0.8
                ]
              }, {
                "$lt": [
                  "$magnr", 17
                ]
              }, {
                "$gt": [
                  "$age", 90
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$lt": [
                  "$distnr", 1.2
                ]
              }, {
                "$lt": [
                  "$magnr", 15
                ]
              }, {
                "$gt": [
                  "$age", 90
                ]
              }
            ]
          }
        ]
      }, 
      "rock": {
        "$and": [
          {
            "$gte": [
              "$ssdistnr", 0
            ]
          }, {
            "$lt": [
              "$ssdistnr", 12
            ]
          }, {
            "$lt": [
              {
                "$abs": "$ssmagnr"
              }, 20
            ]
          }
        ]
      }, 
      "stationary": {
        "$anyElementTrue": {
          "$map": {
            "input": "$prv_candidates", 
            "as": "cand", 
            "in": {
              "$and": [
                {
                  "$gt": [
                    {
                      "$abs": {
                        "$subtract": [
                          "$t_now", "$$cand.jd"
                        ]
                      }
                    }, 0.02
                  ]
                }, {
                  "$lt": [
                    "$$cand.magpsf", 99
                  ]
                }, {
                  "$in": [
                    "$$cand.isdiffpos", [
                      1, "1", true, "t"
                    ]
                  ]
                }, {
                  "$or": [
                    {
                      "$lt": [
                        "$ssdistnr", -0.5
                      ]
                    }, {
                      "$gt": [
                        "$ssdistnr", 2
                      ]
                    }
                  ]
                }
              ]
            }
          }
        }
      }
    }
  }, {
    "$project": {
      "m_max": {
        "$arrayElemAt": [
          "$candidates_fid.magpsf", "$m_max_index"
        ]
      }, 
      "m_min": {
        "$arrayElemAt": [
          "$candidates_fid.magpsf", "$m_min_index"
        ]
      }, 
      "t_max": {
        "$arrayElemAt": [
          "$candidates_fid.jd", "$m_max_index"
        ]
      }, 
      "t_min": {
        "$arrayElemAt": [
          "$candidates_fid.jd", "$m_min_index"
        ]
      }, 
      "t_now": 1, 
      "m_now": 1, 
      "fid_now": 1, 
      "sgscore": 1, 
      "drbscore": 1, 
      "magnr": 1, 
      "distnr": 1, 
      "scorr": 1, 
      "gal_lat": 1, 
      "ssdistnr": 1, 
      "ssnamenr": 1, 
      "rbscore": 1, 
      "drb": 1, 
      "sgmag": 1, 
      "srmag": 1, 
      "simag": 1, 
      "distpsnr1": 1, 
      "distpsnr2": 1, 
      "distpsnr3": 1, 
      "fwhm": 1, 
      "elong": 1,
      "jdstarthist": 1, 
      "jdendhist": 1, 
      "psfminap": 1, 
      "bright": 1, 
      "positivesubtraction": 1, 
      "real": 1, 
      "nopointunderneath": 1, 
      "brightstar": 1, 
      "variablesource": 1, 
      "rock": 1, 
      "stationary": 1
    }
  }, {
    "$match": {
      "bright": true, 
      "nopointunderneath": true, 
      "positivesubtraction": true, 
      "real": true, 
      "stationary": true, 
      "brightstar": false, 
      "rock": false
    }
  }, {
    "$project": {
      "annotations.FWHM": "$fwhm", 
      "annotations.drb": "$drb", 
      "annotations.host g-r": {
        "$subtract": [
          "$sgmag", "$srmag"
        ]
      }, 
      "annotations.host r-i": {
        "$subtract": [
          "$srmag", "$simag"
        ]
      }, 
      "annotations.mag at max": "$m_max", 
      "annotations.time at max": "$t_max", 
      "annotations.min-mag": "$m_min", 
      "annotations.min-time": "$t_min", 
      "annotations.time difference": {
        "$subtract": [
          "$t_max", "$t_min"
        ]
      }, 
      "annotations.mag diff": {
        "$subtract": [
          "$m_min", "$m_max"
        ]
      }, 
      "annotations.rise rate": {
        "$cond": {
          "if": {
            "$gt": [
              {
                "$subtract": [
                  "$t_max", "$t_min"
                ]
              }, 0
            ]
          }, 
          "then": {
            "$divide": [
              {
                "$subtract": [
                  "$m_min", "$m_max"
                ]
              }, {
                "$subtract": [
                  "$t_max", "$t_min"
                ]
              }
            ]
          }, 
          "else": null
        }
      }, 
      "annotations.decay rate": {
        "$cond": {
          "if": {
            "$lt": [
              {
                "$subtract": [
                  "$t_max", "$t_min"
                ]
              }, 0
            ]
          }, 
          "then": {
            "$divide": [
              {
                "$subtract": [
                  "$m_max", "$m_min"
                ]
              }, {
                "$subtract": [
                  "$t_max", "$t_min"
                ]
              }
            ]
          }, 
          "else": null
        }
      }, 
      "annotations.host ZTF ref PSF r-mag": "$magnr", 
      "annotations.PS1 psf r-mag": "$srmag", 
      "annotations.rb score": "$rbscore", 
      "annotations.sgscore1": "$sgscore", 
      "annotations.ZOGI scorr": "$scorr", 
      "annotations.distpsnr1": "$distpsnr1", 
      "annotations.distpsnr2": "$distpsnr2", 
      "annotations.distpsnr3": "$distpsnr3", 
      "annotations.magpsf": "$m_now", 
      "annotations.elongation": "$elong", 
      "annotations.magap_min_magpsf": "$psfminap", 
      "annotations.gal_lat": "$gal_lat", 
      "annotations.deltajd": {
        "$subtract": [
          "$jdendhist", "$jdstarthist"
        ]
      }
    }
  }
]
```

### BTS/RCF program (simplified) filter

[fritz_filter_rcf.json](data/filter_examples/fritz_filter_rcf.json)

```js
[
  /* UPSTREAM STAGES */
  // For this example, select alerts by objectId. In practice, alert is selected by candid
  {
    "$match": {
      "objectId": "ZTF20aacbyec", 
      "candidate.programid": {
        "$in": [
          1
        ]
      }
    }
  }, 
  {
    "$project": {
      "cutoutScience": 0, 
      "cutoutTemplate": 0, 
      "cutoutDifference": 0
    }
  }, 
  {
    "$lookup": {
      "from": "ZTF_alerts_aux", 
      "localField": "objectId", 
      "foreignField": "_id", 
      "as": "aux"
    }
  }, 
  {
    "$project": {
      "cross_matches": {
        "$arrayElemAt": [
          "$aux.cross_matches", 0
        ]
      }, 
      "prv_candidates": {
        "$filter": {
          "input": {
            "$arrayElemAt": [
              "$aux.prv_candidates", 0
            ]
          }, 
          "as": "item", 
          "cond": {
            "$in": [
              "$$item.programid", [
                1
              ]
            ]
          }
        }
      }, 
      "schemavsn": 1, 
      "publisher": 1, 
      "objectId": 1, 
      "candid": 1, 
      "candidate": 1, 
      "classifications": 1, 
      "coordinates": 1
    }
  },
  /* USER-DEFINED PART */
  {
    "$project": {
      "_id": 0, 
      "candid": 1, 
      "objectId": 1, 
      "prv_candidates.jd": 1, 
      "prv_candidates.magpsf": 1, 
      "prv_candidates.fid": 1, 
      "prv_candidates.isdiffpos": 1, 
      "isdiffpos": "$candidate.isdiffpos", 
      "m_now": "$candidate.magpsf", 
      "m_app": "$candidate.magap", 
      "t_now": "$candidate.jd", 
      "fid_now": "$candidate.fid", 
      "sgscore": "$candidate.sgscore1", 
      "sgscore2": "$candidate.sgscore2", 
      "sgscore3": "$candidate.sgscore3", 
      "srmag": "$candidate.srmag1", 
      "srmag2": "$candidate.srmag2", 
      "srmag3": "$candidate.srmag3", 
      "sgmag": "$candidate.sgmag1", 
      "simag": "$candidate.simag1", 
      "drbscore": "$candidate.drb", 
      "magnr": "$candidate.magnr", 
      "distnr": "$candidate.distnr", 
      "distpsnr1": "$candidate.distpsnr1", 
      "distpsnr2": "$candidate.distpsnr2", 
      "distpsnr3": "$candidate.distpsnr3", 
      "scorr": "$candidate.scorr", 
      "fwhm": "$candidate.fwhm", 
      "elong": "$candidate.elong", 
      "nbad": "$candidate.nbad", 
      "chipsf": "$candidate.chipsf", 
      "gal_lat": "$coordinates.b", 
      "ssdistnr": "$candidate.ssdistnr", 
      "ssmagnr": "$candidate.ssmagnr", 
      "ssnamenr": "$candidate.ssnamenr", 
      "t_start": "$candidate.jdstarthist", 
      "age": {
        "$subtract": [
          "$candidate.jd", "$candidate.jdstarthist"
        ]
      }
    }
  }, 
  {
    "$project": {
      "objectId": 1, 
      "t_now": 1, 
      "m_now": 1, 
      "fid_now": 1, 
      "sgscore": 1, 
      "drbscore": 1, 
      "magnr": 1, 
      "distnr": 1, 
      "scorr": 1, 
      "gal_lat": 1, 
      "ssdistnr": 1, 
      "ssnamenr": 1, 
      "age": 1, 
      "peakmag": {
        "$min": [
          {
            "$map": {
              "input": "$prv_candidates", 
              "as": "cand", 
              "in": {
                "$cond": [
                  {
                    "$eq": [
                      "$$cand.fid", "$fid_now"
                    ]
                  }, "$$cand.magpsf", null
                ]
              }
            }
          }, "$m_now"
        ]
      }, 
      "bright": {
        "$or": [
          {
            "$lt": [
              "$m_now", 19.0
            ]
          }, {
            "$map": {
              "input": "$prv_candidates", 
              "as": "cand", 
              "in": {
                "$and": [
                  {
                    "$lt": [
                      {
                        "$abs": {
                          "$subtract": [
                            "$t_now", "$$cand.jd"
                          ]
                        }
                      }, 0.75
                    ]
                  }, {
                    "$in": [
                      "$isdiffpos", [
                        1, "1", "t", true
                      ]
                    ]
                  }, {
                    "$ne": [
                      "$$cand.magpsf", null
                    ]
                  }, {
                    "$lt": [
                      "$$cand.magpsf", 19
                    ]
                  }
                ]
              }
            }
          }
        ]
      }, 
      "latitude": {
        "$gte": [
          {
            "$abs": "$gal_lat"
          }, 7
        ]
      }, 
      "positivesubtraction": {
        "$in": [
          "$isdiffpos", [
            1, "1", "t", true
          ]
        ]
      }, 
      "real": {
        "$gt": [
          "$drbscore", 0.5
        ]
      }, 
      "nopointunderneath": {
        "$not": [
          {
            "$and": [
              {
                "$gt": [
                  "$sgscore", 0.76
                ]
              }, {
                "$lt": [
                  "$distpsnr1", 2
                ]
              }
            ]
          }
        ]
      }, 
      "brightstar": {
        "$or": [
          {
            "$and": [
              {
                "$lt": [
                  "$distpsnr1", 20
                ]
              }, {
                "$lt": [
                  "$srmag", 15
                ]
              }, {
                "$gt": [
                  "$srmag", 0
                ]
              }, {
                "$gt": [
                  "$sgscore", 0.49
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$lt": [
                  "$distpsnr2", 20
                ]
              }, {
                "$lt": [
                  "$srmag2", 15
                ]
              }, {
                "$gt": [
                  "$srmag2", 0
                ]
              }, {
                "$gt": [
                  "$sgscore2", 0.49
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$lt": [
                  "$distpsnr3", 20
                ]
              }, {
                "$lt": [
                  "$srmag3", 15
                ]
              }, {
                "$gt": [
                  "$srmag3", 0
                ]
              }, {
                "$gt": [
                  "$sgscore3", 0.49
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$eq": [
                  "$sgscore", 0.5
                ]
              }, {
                "$lt": [
                  "$distpsnr1", 0.5
                ]
              }, {
                "$or": [
                  {
                    "$lt": [
                      "$sgmag", 17
                    ]
                  }, {
                    "$lt": [
                      "$srmag", 17
                    ]
                  }, {
                    "$lt": [
                      "$simag", 17
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }, 
      "variablesource": {
        "$or": [
          {
            "$and": [
              {
                "$lt": [
                  "$distnr", 0.4
                ]
              }, {
                "$lt": [
                  "$magnr", 19
                ]
              }, {
                "$gt": [
                  "$age", 90
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$lt": [
                  "$distnr", 0.8
                ]
              }, {
                "$lt": [
                  "$magnr", 17
                ]
              }, {
                "$gt": [
                  "$age", 90
                ]
              }
            ]
          }, {
            "$and": [
              {
                "$lt": [
                  "$distnr", 1.2
                ]
              }, {
                "$lt": [
                  "$magnr", 15
                ]
              }, {
                "$gt": [
                  "$age", 90
                ]
              }
            ]
          }
        ]
      }, 
      "rock": {
        "$and": [
          {
            "$gte": [
              "$ssdistnr", 0
            ]
          }, {
            "$lt": [
              "$ssdistnr", 12
            ]
          }, {
            "$lt": [
              {
                "$abs": "$ssmagnr"
              }, 20
            ]
          }
        ]
      }, 
      "stationary": {
        "$anyElementTrue": {
          "$map": {
            "input": "$prv_candidates", 
            "as": "cand", 
            "in": {
              "$and": [
                {
                  "$gt": [
                    {
                      "$abs": {
                        "$subtract": [
                          "$t_now", "$$cand.jd"
                        ]
                      }
                    }, 0.02
                  ]
                }, {
                  "$lt": [
                    "$$cand.magpsf", 99
                  ]
                }, {
                  "$in": [
                    "$$cand.isdiffpos", [
                      1, "1", true, "t"
                    ]
                  ]
                }
              ]
            }
          }
        }
      }
    }
  }, 
  {
    "$match": {
      "latitude": true, 
      "bright": true, 
      "nopointunderneath": true, 
      "positivesubtraction": true, 
      "real": true, 
      "stationary": true, 
      "brightstar": false, 
      "rock": false
    }
  }, 
  {
    "$project": {
      "objectId": 1,
      "annotations.jd": "$t_now", 
      "annotations.magnitude": "$m_now", 
      "annotations.sgscore": "$sgscore", 
      "annotations.peakmag": "$peakmag", 
      "annotations.atpeak": {
        "$eq": [
          "$m_now", "$peakmag"
        ]
      }, 
      "annotations.age": "$age", 
      "annotations.drb": "$drbscore"
    }
  }
]
```