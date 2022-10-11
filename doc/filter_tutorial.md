# Alerts tutorial

This document will help you navigate through the simulated Rubin alerts ingested in the MongoDB Compass, so that you can try different filtering schemes using the MongoDB syntax, which is compatible with Fritz.
First a summary of what you’ll do:
- Install MongoDB Compass
- Connect to cluster with Rubin alerts
- Create your filter
- Save your candidates
- Explore your results

### 0. Note
I based most of this work on the tutorial you can find here, so, if you have any issues, I would start looking them up there.
### 1. To install MongoDB Compass
 Go to https://www.mongodb.com/products/compass and click in ‘Download now’
### 2. Connecting to cluster
Once Mongo DB Compass is installed, launch it, and connect to the cluster by

   - Opening Mongo DB Compass
   - Copy the following into the box under New Connection, and click Connect.  <br/>
mongodb+srv://alert_digger:WhereIsTheKN@cluster0.s0ada.mongodb.net/test  <br/>


     ![](https://github.com/tahumada/fritz/blob/main/doc/data/filter_examples/tutorial1.png)



 - To see the alerts (around 4000 of them) navigate in the left menu to the folder ZTF > lsst_800

   ![This is an image](https://github.com/tahumada/fritz/blob/main/doc/data/filter_examples/tutorial2.png)



 **Tab description**

- Documents: here you can see all the avro packages, and their individual properties. You can add Data or export a collection. You can apply filters here too, but it is easier in the Aggregation tab. It displays only 20 alerts.
- Aggregations: Here you can make a new filter and apply it to the collection. After each step, you can visualize how many alerts passed the filters and modify the filter step to check how things change. You can export the results and resulting filter.
- Scheme: tbd
- Explain plan: it shows the details of your filter
- Indexes: tbd
- Validation: tbd

### 3. To make a new filter
In the Aggregation tab, click on Create New > Pipeline from text. This will promt a new window where you can write/paste your filter.

 ![This is an image](https://github.com/tahumada/fritz/blob/main/doc/data/filter_examples/tutorial3.png)


At the end of this document there is a filtering example, used by the MMA group to vet SGRB candidates. Once you plug in your filter, MongoDB Compass will break it down for you in different steps. This filter has two $project stages before the $match stage. You can play around with these to modify your filter.

 ![This is an image](https://github.com/tahumada/fritz/blob/main/doc/data/filter_examples/tutorial4.png)



### 4. Saving candidates
Once you are done with the filtering, you can
<ol type="a">
  <li>  ‘Export to language’ (recommended, as MongoDB Compass is not good for saving your filters) - button next to ‘Create new +’ </li>
    <li>  Save your current filter – Save button next to ‘Create new +’ </li>
    <li>  Export your results as a json or csv file – click on the export button next to ‘Run’ and then choose your preferred format. </li>
  </ol>

### 5. Exploring
 Use your favorite language to explore your json or csv file.


### Future work:
Add ZTF alerts
### Filter example
```
[{
$project: {
  _id: 1,
  candid: 1,
  objectId: 1,
  'prv_candidates.jd': 1,
  'prv_candidates.magpsf': 1,
  'prv_candidates.fid': 1,
  'prv_candidates.isdiffpos': 1,
  'prv_candidates.diffmaglim': 1,
  isdiffpos: '$candidate.isdiffpos',
  m_now: '$candidate.magpsf',
  m_app: '$candidate.magap',
  t_now: '$candidate.jd',
  fid_now: '$candidate.fid',
  sgscore: '$candidate.sgscore1',
  sgscore2: '$candidate.sgscore2',
  sgscore3: '$candidate.sgscore3',
  srmag: '$candidate.srmag1',
  srmag2: '$candidate.srmag2',
  srmag3: '$candidate.srmag3',
  sgmag: '$candidate.sgmag1',
  simag: '$candidate.simag1',
  rbscore: '$candidate.rb',
  drbscore: '$candidate.drb',
  magnr: '$candidate.magnr',
  distnr: '$candidate.distnr',
  distpsnr1: '$candidate.distpsnr1',
  distpsnr2: '$candidate.distpsnr2',
  distpsnr3: '$candidate.distpsnr3',
  scorr: '$candidate.scorr',
  fwhm: '$candidate.fwhm',
  elong: '$candidate.elong',
  nbad: '$candidate.nbad',
  chipsf: '$candidate.chipsf',
  gal_lat: '$coordinates.b',
  ssdistnr: '$candidate.ssdistnr',
  ssmagnr: '$candidate.ssmagnr',
  ssnamenr: '$candidate.ssnamenr',
  t_start: '$candidate.jdstarthist',
  age: {
   $subtract: [
	'$candidate.jd',
	'$candidate.jdstarthist'
   ]
  },
  psfminap: {
   $subtract: [
	'$candidate.magpsf',
	'$candidate.magap'
   ]
  }
}
}, {
$project: {
  objectId: 1,
  t_now: 1,
  t_start: 1,
  m_now: 1,
  fid_now: 1,
  sgscore: 1,
  rbscore: 1,
  drbscore: 1,
  magnr: 1,
  distnr: 1,
  scorr: 1,
  gal_lat: 1,
  ssdistnr: 1,
  ssnamenr: 1,
  ssmagnr: 1,
  age: 1,
  nbad: 1,
  fwhm: 1,
  elong: 1,
  psfminap: 1,
  prv_candidates: 1,
  positivesubtraction: {
   $in: [
	'$isdiffpos',
	[
 	1,
 	'1',
 	't',
 	true
	]
   ]
  },
  real: {
   $and: [
	{
 	$gt: [
  	'$drbscore',
  	0.3
 	]
	},
	{
 	$lt: [
  	'$nbad',
  	5
 	]
	},
	{
 	$gt: [
  	'$fwhm',
  	0.5
 	]
	},
	{
 	$lt: [
  	'$fwhm',
  	5
 	]
	},
	{
 	$lt: [
  	{
   	$abs: '$psfminap'
  	},
  	0.75
 	]
	}
   ]
  },
  rock: {
   $and: [
	{
 	$gte: [
  	'$ssdistnr',
  	0
 	]
	},
	{
 	$lt: [
  	'$ssdistnr',
  	10
 	]
	},
	{
 	$lt: [
  	{
   	$abs: '$ssmagnr'
  	},
  	20
 	]
	}
   ]
  },
  young: {
   $lt: [
	'$age',
	10
   ]
  },
  pointunderneath: {
   $and: [
	{
 	$gt: [
  	'$sgscore',
  	0.76
 	]
	},
	{
 	$lt: [
  	'$distpsnr1',
  	2
 	]
	}
   ]
  },
  brightstar: {
   $or: [
	{
 	$and: [
  	{
   	$lt: [
    	'$distpsnr1',
    	15
   	]
  	},
  	{
   	$lt: [
    	'$srmag',
    	15
   	]
  	},
  	{
   	$gt: [
    	'$srmag',
    	0
   	]
  	},
  	{
   	$gt: [
    	'$sgscore',
    	0.49
   	]
  	}
 	]
	},
	{
 	$and: [
  	{
   	$lt: [
    	'$distpsnr2',
    	15
   	]
  	},
  	{
   	$lt: [
    	'$srmag2',
    	15
   	]
  	},
  	{
   	$gt: [
    	'$srmag2',
    	0
   	]
  	},
  	{
   	$gt: [
    	'$sgscore2',
    	0.49
   	]
  	}
 	]
	},
	{
 	$and: [
  	{
   	$lt: [
    	'$distpsnr3',
    	15
   	]
  	},
  	{
   	$lt: [
    	'$srmag3',
    	15
   	]
  	},
  	{
   	$gt: [
    	'$srmag3',
    	0
   	]
  	},
  	{
   	$gt: [
    	'$sgscore3',
    	0.49
   	]
  	}
 	]
	},
	{
 	$and: [
  	{
   	$eq: [
    	'$sgscore',
    	0.5
   	]
  	},
  	{
   	$lt: [
    	'$distpsnr1',
    	0.5
   	]
  	},
  	{
   	$or: [
    	{
     	$lt: [
      	'$sgmag',
      	17
     	]
    	},
    	{
     	$lt: [
      	'$srmag',
      	17
     	]
    	},
    	{
     	$lt: [
      	'$simag',
      	17
     	]
    	}
   	]
  	}
 	]
	}
   ]
  }
}
}, {
$match: {
  brightstar: false,
  pointunderneath: false,
  positivesubtraction: true,
  real: true,
  rock: false,
  young: true
}
}]
```
