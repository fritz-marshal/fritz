# Alert filters in `Fritz`

In this tutorial, we will discuss the alert filters in `Fritz`:
- Technical details on the implementation
- Filter examples with step-by-step explanations 

## Introduction

One of `Fritz`'s submodules, `Kowalski`, constantly listens to the alert streams and persists the alert data in a 
database. `Kowalski` additionally computes a number of frequently-used quantities such as the Galactic coordinates for 
each alert and cross-matches them with several external catalogs and executes machine learning models. 

`Kowalski` uses `MongoDB`, a NoSQL database on the backend. 
See [here](https://github.com/dmitryduev/ay119/blob/master/databases/mongodb.ipynb) and the references therein 
for a brief introduction into `MongoDB`.   

### Filtering implementation

Upon alert ingestion into the database, `Kowalski` executes user-defined filters and reports the passing alerts 
to `Fritz`'s `SkyPortal` submodule. This is implemented as a `MongoDB` aggregation pipeline that first "massages" 
the newly ingested alert data such that the user's filter deals with enhanced "packets" containing, for example, 
the full photometry history (not just the rolling 30-day window), cross-match data, and custom ML scores.

The [MongoDB aggregation pipeline](https://docs.mongodb.com/manual/core/aggregation-pipeline/) is a framework 
for data aggregation modeled on the concept of data processing pipelines. Documents enter a multi-stage pipeline 
that transforms the documents into aggregated results.

### "Upstream" aggregation pipeline stages

- Select the newly ingested alert from the `ZTF_alerts` collection by its `candid`
- Remove the cutouts to reduce traffic
- Join the alert by its `objectId` with the corresponding entry in the `ZTF_alerts_aux` collection containing 
the cross-matches, ML scores, computed quantities, and archival photometry

The upstream stages also take care of the ACLs.

`Fritz` automatically prepends these stages to all user-defined filters. 

### User interfaces

- `Fritz`'s GUI + filter management page + filter versioning + no upstream stages
- MongoDB Compass + great for debugging + sample alert database in Atlas + got to prepend the upstream stages

We have set up a live public `MongoDB Atlas` cloud database with a curated set of sample public ZTF alerts.

In this tutorial, we will show how to use [MongoDB Compass](https://www.mongodb.com/try/download/compass) 
(the full version is now free)
to construct and debug aggregation pipelines aka alert filters to then plug them into `Fritz`.

### Limitations

`$lookup` stages are not allowed

## Filter examples

### Simple filter

[fritz_filter_02.json](data/filter_examples/fritz_filter_02.json)

```js
[ 
  /* UPSTREAM STAGES */
  // For this example, select alerts by objectId. In practice, alert is selected by candid
  {
    "$match": {
      "objectId": "ZTF20aaelulu"
    }
  },
  // Remove the cutouts
  {
    "$project": {
      "cutoutScience": 0,
      "cutoutTemplate": 0,
      "cutoutDifference": 0
    }
  },
  // Join alert with auxiliary data stored in different collection
  {
    "$lookup": {
      "from": "ZTF_alerts_aux",
      "localField": "objectId",
      "foreignField": "_id",
      "as": "aux"
    }
  },
  // Reshuffle and apply ACLs
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
  // select alerts with drb scores greater than 0.9999999 that don't have any matches with 
  // CLU catalog (zeroth element of corresponding array does not exist)
  {
    "$match": {
      "candidate.drb": {
        "$gt": 0.9999999
      },
      "cross_matches.CLU_20190625.0": {
        "$exists": false
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "candid": 1,
      "objectId": 1,
      "annotations.author": "dd",
      "annotations.mean_rb": {
        "$avg": "$prv_candidates.rb"
      }
    }
  }
]
```

### BTS/RCF program filter

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

### CLU filter

[fritz_filter_clu.json](data/filter_examples/fritz_filter_clu.json)
