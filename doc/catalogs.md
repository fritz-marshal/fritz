# Kowalski collection schemas

Fritz hosts a number of astronomical catalogs on its Kowalski backend.
Below you will find a list of available catalogs and the approximate contents of
individual entries therein (i.e. example documents per MongoDB collection).
Note that there is no schema enforcement, so specific fields may or may not exist
for individual documents.


## 2MASS_PSC

```json
{
  "_id": "14430226+6244192",
  "ra": 220.759452,
  "decl": 62.738686,
  "err_maj": 0.29,
  "err_min": 0.23,
  "err_ang": 173,
  "designation": "14430226+6244192",
  "j_m": 16.794,
  "j_cmsig": 0.158,
  "j_msigcom": 0.159,
  "j_snr": 7.7,
  "h_m": 16.066,
  "h_cmsig": 0.171,
  "h_msigcom": 0.171,
  "h_snr": 6,
  "k_m": 15.646,
  "k_cmsig": 0.177,
  "k_msigcom": 0.177,
  "k_snr": 5.7,
  "ph_qual": "CCC",
  "rd_flg": "222",
  "bl_flg": "111",
  "cc_flg": "000",
  "ndet": "060606",
  "prox": 42.3,
  "pxpa": 194,
  "pxcntr": 615703057,
  "gal_contam": 0,
  "mp_flg": 0,
  "pts_key": 615703070,
  "hemis": "n",
  "date": "1999-04-10",
  "scan": 76,
  "glon": 103.47,
  "glat": 49.962,
  "x_scan": 118.6,
  "jdate": 2451278.8326,
  "j_psfchi": 0.97,
  "h_psfchi": 1.14,
  "k_psfchi": 0.85,
  "j_m_stdap": 16.641,
  "j_msig_stdap": 0.229,
  "h_m_stdap": 16.771,
  "h_msig_stdap": 0.349,
  "k_m_stdap": 15.67,
  "k_msig_stdap": 0.286,
  "dist_edge_ns": 10378,
  "dist_edge_ew": 134,
  "dist_edge_flg": "sw",
  "dup_src": 0,
  "use_src": 1,
  "a": "0",
  "dist_opt": null,
  "phi_opt": null,
  "b_m_opt": null,
  "vr_m_opt": null,
  "nopt_mchs": 0,
  "ext_key": null,
  "scan_key": 33812,
  "coadd_key": 777664,
  "coadd": 126,
  "coordinates": {
    "radec_str": [
      "14:43:02.2685",
      "62:44:19.270"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        40.75945200000001,
        62.738686
      ]
    }
  }
}
```

## 2MASS_XSC

```json
{
  "_id": "23204638-8956429 ",
  "jdate": 2451828.7145,
  "designation": "23204638-8956429 ",
  "ra": 350.193268,
  "decl": -89.945274,
  "sup_ra": 350.207764,
  "sup_dec": -89.945168,
  "glon": 302.956,
  "glat": -27.179,
  "density": 3.05,
  "r_k20fe": 5,
  "j_m_k20fe": 15.29,
  "j_msig_k20fe": 0.089,
  "j_flg_k20fe": 0,
  "h_m_k20fe": 14.554,
  "h_msig_k20fe": 0.103,
  "h_flg_k20fe": 0,
  "k_m_k20fe": 14.282,
  "k_msig_k20fe": 0.144,
  "k_flg_k20fe": 0,
  "r_3sig": 3.3,
  "j_ba": 0.64,
  "j_phi": 15,
  "h_ba": 1,
  "h_phi": 90,
  "k_ba": 0.64,
  "k_phi": 15,
  "sup_r_3sig": 4.7,
  "sup_ba": 1,
  "sup_phi": 90,
  "r_fe": 6.3,
  "j_m_fe": 15.185,
  "j_msig_fe": 0.101,
  "j_flg_fe": 0,
  "h_m_fe": 14.442,
  "h_msig_fe": 0.116,
  "h_flg_fe": 0,
  "k_m_fe": 14.159,
  "k_msig_fe": 0.161,
  "k_flg_fe": 0,
  "r_ext": 10.02,
  "j_m_ext": 15.2,
  "j_msig_ext": 0.147,
  "j_pchi": 0.5,
  "h_m_ext": 14.42,
  "h_msig_ext": 0.169,
  "h_pchi": 0.5,
  "k_m_ext": 14.157,
  "k_msig_ext": 0.252,
  "k_pchi": 0.5,
  "j_r_eff": 2.08,
  "j_mnsurfb_eff": 18.73,
  "h_r_eff": 2.23,
  "h_mnsurfb_eff": 18.18,
  "k_r_eff": 1.94,
  "k_mnsurfb_eff": 17.6,
  "j_con_indx": 2.58,
  "h_con_indx": 2.69,
  "k_con_indx": 2.69,
  "j_peak": 18.23,
  "h_peak": 17.58,
  "k_peak": 16.97,
  "j_5surf": 20.12,
  "h_5surf": 19.38,
  "k_5surf": 19.07,
  "e_score": 1,
  "g_score": 1.4,
  "vc": -1,
  "cc_flg": "0",
  "im_nx": 29,
  "r_k20fc": 5,
  "j_m_k20fc": 15.2,
  "j_msig_k20fc": 0.103,
  "j_flg_k20fc": 0,
  "h_m_k20fc": 14.463,
  "h_msig_k20fc": 0.119,
  "h_flg_k20fc": 0,
  "k_m_k20fc": 14.16,
  "k_msig_k20fc": 0.161,
  "k_flg_k20fc": 0,
  "j_r_e": null,
  "j_m_e": null,
  "j_msig_e": null,
  "j_flg_e": null,
  "h_r_e": 5.4,
  "h_m_e": 14.424,
  "h_msig_e": 0.124,
  "h_flg_e": 0,
  "k_r_e": 6.3,
  "k_m_e": 14.159,
  "k_msig_e": 0.161,
  "k_flg_e": 0,
  "j_r_c": null,
  "j_m_c": null,
  "j_msig_c": null,
  "j_flg_c": null,
  "h_r_c": 5.4,
  "h_m_c": 14.424,
  "h_msig_c": 0.124,
  "h_flg_c": 0,
  "k_r_c": 5,
  "k_m_c": 14.161,
  "k_msig_c": 0.16,
  "k_flg_c": 0,
  "r_fc": 5,
  "j_m_fc": 15.2,
  "j_msig_fc": 0.103,
  "j_flg_fc": 0,
  "h_m_fc": 14.463,
  "h_msig_fc": 0.119,
  "h_flg_fc": 0,
  "k_m_fc": 14.161,
  "k_msig_fc": 0.16,
  "k_flg_fc": 0,
  "j_r_i20e": -3.8,
  "j_m_i20e": null,
  "j_msig_i20e": null,
  "j_flg_i20e": null,
  "h_r_i20e": 5,
  "h_m_i20e": 14.463,
  "h_msig_i20e": 0.119,
  "h_flg_i20e": 0,
  "k_r_i20e": 5,
  "k_m_i20e": 14.282,
  "k_msig_i20e": 0.144,
  "k_flg_i20e": 0,
  "j_r_i20c": -2.3,
  "j_m_i20c": null,
  "j_msig_i20c": null,
  "j_flg_i20c": null,
  "h_r_i20c": 5,
  "h_m_i20c": 14.463,
  "h_msig_i20c": 0.119,
  "h_flg_i20c": 0,
  "k_r_i20c": 5,
  "k_m_i20c": 14.16,
  "k_msig_i20c": 0.161,
  "k_flg_i20c": 0,
  "j_r_i21e": 5,
  "j_m_i21e": 15.29,
  "j_msig_i21e": 0.089,
  "j_flg_i21e": 0,
  "h_r_i21e": 5.4,
  "h_m_i21e": 14.425,
  "h_msig_i21e": 0.124,
  "h_flg_i21e": 0,
  "k_r_i21e": -10,
  "k_m_i21e": null,
  "k_msig_i21e": null,
  "k_flg_i21e": null,
  "r_j21fe": 7,
  "j_m_j21fe": 15.158,
  "j_msig_j21fe": 0.111,
  "j_flg_j21fe": 0,
  "h_m_j21fe": 14.408,
  "h_msig_j21fe": 0.126,
  "h_flg_j21fe": 0,
  "k_m_j21fe": 14.1,
  "k_msig_j21fe": 0.171,
  "k_flg_j21fe": 0,
  "j_r_i21c": 5,
  "j_m_i21c": 15.2,
  "j_msig_i21c": 0.103,
  "j_flg_i21c": 0,
  "h_r_i21c": 5.4,
  "h_m_i21c": 14.425,
  "h_msig_i21c": 0.124,
  "h_flg_i21c": 0,
  "k_r_i21c": 8.2,
  "k_m_i21c": 13.931,
  "k_msig_i21c": 0.216,
  "k_flg_i21c": 0,
  "r_j21fc": 7,
  "j_m_j21fc": 15.09,
  "j_msig_j21fc": 0.13,
  "j_flg_j21fc": 0,
  "h_m_j21fc": 14.408,
  "h_msig_j21fc": 0.126,
  "h_flg_j21fc": 0,
  "k_m_j21fc": 13.99,
  "k_msig_j21fc": 0.193,
  "k_flg_j21fc": 0,
  "j_m_5": 15.2,
  "j_msig_5": 0.103,
  "j_flg_5": 0,
  "h_m_5": 14.463,
  "h_msig_5": 0.119,
  "h_flg_5": 0,
  "k_m_5": 14.16,
  "k_msig_5": 0.161,
  "k_flg_5": 0,
  "j_m_7": 15.09,
  "j_msig_7": 0.13,
  "j_flg_7": 0,
  "h_m_7": 14.366,
  "h_msig_7": 0.152,
  "h_flg_7": 0,
  "k_m_7": 13.99,
  "k_msig_7": 0.193,
  "k_flg_7": 0,
  "j_m_10": 14.896,
  "j_msig_10": 0.156,
  "j_flg_10": 0,
  "h_m_10": 14.288,
  "h_msig_10": 0.203,
  "h_flg_10": 0,
  "k_m_10": 13.894,
  "k_msig_10": 0.254,
  "k_flg_10": 0,
  "j_m_15": 14.722,
  "j_msig_15": 0.203,
  "j_flg_15": 0,
  "h_m_15": 14.159,
  "h_msig_15": 0.276,
  "h_flg_15": 0,
  "k_m_15": 13.971,
  "k_msig_15": 0.418,
  "k_flg_15": 0,
  "j_m_20": null,
  "j_msig_20": null,
  "j_flg_20": null,
  "h_m_20": null,
  "h_msig_20": null,
  "h_flg_20": null,
  "k_m_20": null,
  "k_msig_20": null,
  "k_flg_20": null,
  "j_m_25": null,
  "j_msig_25": null,
  "j_flg_25": null,
  "h_m_25": null,
  "h_msig_25": null,
  "h_flg_25": null,
  "k_m_25": null,
  "k_msig_25": null,
  "k_flg_25": null,
  "j_m_30": null,
  "j_msig_30": null,
  "j_flg_30": null,
  "h_m_30": null,
  "h_msig_30": null,
  "h_flg_30": null,
  "k_m_30": null,
  "k_msig_30": null,
  "k_flg_30": null,
  "j_m_40": null,
  "j_msig_40": null,
  "j_flg_40": null,
  "h_m_40": null,
  "h_msig_40": null,
  "h_flg_40": null,
  "k_m_40": null,
  "k_msig_40": null,
  "k_flg_40": null,
  "j_m_50": null,
  "j_msig_50": null,
  "j_flg_50": null,
  "h_m_50": null,
  "h_msig_50": null,
  "h_flg_50": null,
  "k_m_50": null,
  "k_msig_50": null,
  "k_flg_50": null,
  "j_m_60": null,
  "j_msig_60": null,
  "j_flg_60": null,
  "h_m_60": null,
  "h_msig_60": null,
  "h_flg_60": null,
  "k_m_60": null,
  "k_msig_60": null,
  "k_flg_60": null,
  "j_m_70": null,
  "j_msig_70": null,
  "j_flg_70": null,
  "h_m_70": null,
  "h_msig_70": null,
  "h_flg_70": null,
  "k_m_70": null,
  "k_msig_70": null,
  "k_flg_70": null,
  "j_m_sys": 15.113,
  "j_msig_sys": 0.118,
  "h_m_sys": 14.386,
  "h_msig_sys": 0.137,
  "k_m_sys": 14.028,
  "k_msig_sys": 0.177,
  "sys_flg": 0,
  "contam_flg": 0,
  "j_5sig_ba": 0.58,
  "j_5sig_phi": 20,
  "h_5sig_ba": 1,
  "h_5sig_phi": 90,
  "k_5sig_ba": 1,
  "k_5sig_phi": 90,
  "j_d_area": null,
  "j_perc_darea": null,
  "h_d_area": null,
  "h_perc_darea": null,
  "k_d_area": null,
  "k_perc_darea": null,
  "j_bisym_rat": 0.488,
  "j_bisym_chi": 4.388,
  "h_bisym_rat": 0.978,
  "h_bisym_chi": 1.31,
  "k_bisym_rat": null,
  "k_bisym_chi": null,
  "j_sh0": 1.01,
  "j_sig_sh0": 0.04,
  "h_sh0": 1.01,
  "h_sig_sh0": 0.05,
  "k_sh0": 1,
  "k_sig_sh0": 0.06,
  "j_sc_mxdn": 7,
  "j_sc_sh": 9.1,
  "j_sc_wsh": 5.1,
  "j_sc_r23": null,
  "j_sc_1mm": 6.6,
  "j_sc_2mm": 7.5,
  "j_sc_vint": -1.4,
  "j_sc_r1": -0.6,
  "j_sc_msh": 0,
  "h_sc_mxdn": 5.6,
  "h_sc_sh": 9.3,
  "h_sc_wsh": 8.4,
  "h_sc_r23": 2.8,
  "h_sc_1mm": 5.5,
  "h_sc_2mm": 5.7,
  "h_sc_vint": 1.1,
  "h_sc_r1": 0.7,
  "h_sc_msh": 0,
  "k_sc_mxdn": 2.1,
  "k_sc_sh": 4,
  "k_sc_wsh": 4.2,
  "k_sc_r23": -0.1,
  "k_sc_1mm": 3.4,
  "k_sc_2mm": 4,
  "k_sc_vint": -0.9,
  "k_sc_r1": -2.6,
  "k_sc_msh": 0,
  "j_chif_ellf": 24.1,
  "k_chif_ellf": 20.2,
  "ellfit_flg": 0,
  "sup_chif_ellf": 20.2,
  "n_blank": 0,
  "n_sub": 0,
  "bl_sub_flg": 0,
  "id_flg": 0,
  "id_cat": "\\N",
  "fg_flg": "______",
  "blk_fac": 1,
  "dup_src": 0,
  "use_src": 0,
  "prox": 8.8,
  "pxpa": 205,
  "pxcntr": 1952688,
  "dist_edge_ns": 225,
  "dist_edge_ew": 153,
  "dist_edge_flg": "se",
  "pts_key": null,
  "mp_key": null,
  "night_key": 1247,
  "scan_key": 62781,
  "coadd_key": 1443963,
  "hemis": "s",
  "date": "2000-10-11",
  "scan": 105,
  "coadd": 267,
  "id": 122,
  "x_coadd": 161,
  "y_coadd": 414,
  "j_subst2": 0,
  "h_subst2": 0,
  "k_subst2": 0,
  "j_back": 104.4,
  "h_back": 369.6,
  "k_back": 452.8,
  "j_resid_ann": 0.065,
  "h_resid_ann": 0.128,
  "k_resid_ann": -0.021,
  "j_bndg_per": 84,
  "j_bndg_amp": 0.021,
  "h_bndg_per": 124,
  "h_bndg_amp": 0.037,
  "k_bndg_per": 112,
  "k_bndg_amp": 0.014,
  "j_seetrack": -0.2,
  "h_seetrack": -0.6,
  "k_seetrack": -0.4,
  "ext_key": 2311351,
  "coordinates": {
    "radec_str": [
      "23:20:46.3843",
      "-89:56:42.986"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        170.193268,
        -89.945274
      ]
    }
  }
}
```

## AllWISE

```json
{
  "_id": {
    "$numberLong": "189301351055692"
  },
  "designation": "J225517.54+895640.0",
  "ra": 343.82309130000004,
  "dec": 89.9444623,
  "sigra": 0.162,
  "sigdec": 0.1545,
  "sigradec": 0.0416,
  "glon": 122.9016452,
  "glat": 27.079785600000005,
  "elon": 89.8658246,
  "elat": 66.5761246,
  "wx": 2088.511,
  "wy": 3604.322,
  "w1mpro": 16.32,
  "w1sigmpro": 0.055999999999999994,
  "w1snr": 19.3,
  "w1rchi2": 0.969099998,
  "w2mpro": 16.355,
  "w2sigmpro": 0.166,
  "w2snr": 6.5,
  "w2rchi2": 0.977800012,
  "w3mpro": 12.777000000000001,
  "w3snr": -0.5,
  "w3rchi2": 1.01699996,
  "w4mpro": 9.118,
  "w4snr": -1.6,
  "w4rchi2": 1.08500004,
  "rchi2": 0.995100021,
  "nb": 1,
  "na": 0,
  "w1sat": 0.001,
  "w2sat": 0,
  "w3sat": 0,
  "w4sat": 0,
  "satnum": "9000",
  "ra_pm": 343.7976813,
  "dec_pm": 89.9444618,
  "sigra_pm": 0.2439,
  "sigdec_pm": 0.2288,
  "sigradec_pm": 0.0446,
  "pmra": -442,
  "sigpmra": 631,
  "pmdec": -2,
  "sigpmdec": 591,
  "w1rchi2_pm": 0.967700005,
  "w2rchi2_pm": 0.978399992,
  "w3rchi2_pm": 1.01699996,
  "w4rchi2_pm": 1.08500004,
  "rchi2_pm": 0.994799972,
  "pmcode": "1N000",
  "cc_flags": "0000",
  "ext_flg": 0,
  "var_flg": "0nnn",
  "ph_qual": "ABUU",
  "det_bit": 3,
  "moon_lev": "0",
  "w1nm": 27,
  "w1m": 41,
  "w2nm": 1,
  "w2m": 41,
  "w3nm": 0,
  "w3m": 18,
  "w4nm": 0,
  "w4m": 18,
  "w1cov": 42.299,
  "w2cov": 43.695,
  "w3cov": 19.366,
  "w4cov": 19.333,
  "n_2mass": 0,
  "coordinates": {
    "radec_str": [
      "22:55:17.5419",
      "89:56:40.064"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        163.82309130000004,
        89.9444623
      ]
    }
  }
}
```

## CLU_20190625

```json
{
  "_id": 713482,
  "cluid": 713482,
  "id_other": "-999",
  "name": "CLU J121345.8+132600",
  "ra": 183.440857184372,
  "dec": 13.4335828883417,
  "dm": 18.51103218916592,
  "dm_method": "Narrowband",
  "distmpc": 50.374,
  "dm_kin": 33.51656052406032,
  "z": 0.012128969342353857,
  "zerr": 0.011961357956969586,
  "a": -999,
  "b2a": -999,
  "pa": -999,
  "type_ned": "-999",
  "name_galex": "-999",
  "ra_galex": -999,
  "dec_galex": -999,
  "fuv": -999,
  "fuverr": -999,
  "nuv": -999,
  "nuverr": -999,
  "name_sdss": "-999",
  "ra_sdss": -999,
  "dec_sdss": -999,
  "modelmag_u": -999,
  "modelmagerr_u": -999,
  "modelmag_g": -999,
  "modelmagerr_g": -999,
  "modelmag_r": -999,
  "modelmagerr_r": -999,
  "modelmag_i": -999,
  "modelmagerr_i": -999,
  "modelmag_z": -999,
  "modelmagerr_z": -999,
  "name_ps1": "-999",
  "ra_ps1": -999,
  "dec_ps1": -999,
  "kronmag_g": -999,
  "kronmagerr_g": -999,
  "kronmag_r": -999,
  "kronmagerr_r": -999,
  "kronmag_i": -999,
  "kronmagerr_i": -999,
  "kronmag_z": -999,
  "kronmagerr_z": -999,
  "kronmag_y": -999,
  "kronmagerr_y": -999,
  "name_2mass": "-999",
  "ra_2mass": -999,
  "dec_2mass": -999,
  "r_k20fe": -999,
  "j_m_k20fe": -999,
  "j_msig_k20fe": -999,
  "j_flg_k20fe": -999,
  "h_m_k20fe": -999,
  "h_msig_k20fe": -999,
  "h_flg_k20fe": -999,
  "k_m_k20fe": -999,
  "k_msig_k20fe": -999,
  "k_flg_k20fe": -999,
  "name_wise": "-999",
  "ra_wise": -999,
  "dec_wise": -999,
  "w1mpro": -999,
  "w1sigmpro": -999,
  "w1snr": -999,
  "w2mpro": -999,
  "w2sigmpro": -999,
  "w2snr": -999,
  "w3mpro": -999,
  "w3sigmpro": -999,
  "w3snr": -999,
  "w4mpro": -999,
  "w4sigmpro": -999,
  "w4snr": -999,
  "m21": -999,
  "m21err": -999,
  "name_cluha": "CLU J121345.8+132600",
  "ra_cluha": 183.440857184372,
  "dec_cluha": 13.4335828883417,
  "maxcsig": 6.63853,
  "cluhamag": 17.4499,
  "cluhamagerr": 0.0673757,
  "sfr_ha": 0.016927568900334627,
  "sfr_haerr": 0.002792440596730025,
  "btc": -999,
  "btcerr": -999,
  "b_r25": -999,
  "b_r25err": -999,
  "magb": -999,
  "magberr": -999,
  "lum_b": -999,
  "lum_berr": -999,
  "sfr_fuv": -999,
  "sfr_fuverr": -999,
  "mstar": -999,
  "mstarerr": -999,
  "source": "CLUHA_20190329",
  "btc_source": "-999",
  "size_source": "-999",
  "dm_source": "CLUHA_20190329",
  "z_source": "CLUHA_20190329",
  "flags": -999,
  "coordinates": {
    "radec_str": [
      "12:13:45.8057",
      "13:26:00.898"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        3.4408571843719926,
        13.4335828883417
      ]
    },
    "radec_rad": [
      3.2016469405479864,
      0.23446025174113244
    ],
    "radec_deg": [
      183.440857184372,
      13.4335828883417
    ]
  }
}
```

### FIRST_20141217

```json
{
  "_id": {
    "$oid": "5dc3467e37526c469a332880"
  },
  "RA": 15.749116782559808,
  "DEC": -11.47248604131012,
  "SIDEPROB": 0.0597386360168457,
  "FPEAK": 1.6200000047683716,
  "FINT": 2.2112410068511963,
  "RMS": 0.15522806346416473,
  "MAJOR": 4.46999979019165,
  "MINOR": 2.0799999237060547,
  "POSANG": 79.5,
  "FITTED_MAJOR": 7.099999904632568,
  "FITTED_MINOR": 6.639999866485596,
  "FITTED_POSANG": 58.29999923706055,
  "FLDNAME": "01030-11200X",
  "NSDSS": -1,
  "SDSS_SEP": 99,
  "SDSS_MAG": 99,
  "SDSS_CLASS": "-",
  "NTMASS": 0,
  "TMASS_SEP": 99,
  "TMASS_MAG": 99,
  "YEAR": 1997.39892578125,
  "MJD": 2450595.098657408,
  "MJDRMS": 0,
  "MJDSTART": 2450595.098657408,
  "MJDSTOP": 2450595.100868056,
  "coordinates": {
    "epoch": 2450595.098657408,
    "radec_str": [
      "01:02:59.7880",
      "-11:28:20.950"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        -164.2508832174402,
        -11.47248604131012
      ]
    }
  }
}
```

### GALEX

```json
{
  "_id": {
    "$oid": "5e4f4dd9c4c622686b281b30"
  },
  "ra": 45.36642,
  "dec": 0.825997,
  "name": "GALEX J030127.9+004933",
  "b": 1,
  "NUVmag": 19.9817,
  "e_NUVmag": 0.1014,
  "Fafl": 0,
  "Nafl": 0,
  "Fexf": 0,
  "Nexf": 0,
  "Nr": 0.004,
  "coordinates": {
    "radec_str": [
      "03:01:27.9408",
      "00:49:33.589"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        -134.63358,
        0.825997
      ]
    }
  }
}
```

### Gaia_DR2

```json
{
  "_id": "999368933353362688",
  "solution_id": {
    "$numberLong": "1635721458409799680"
  },
  "designation": "Gaia DR2 999368933353362688",
  "source_id": {
    "$numberLong": "999368933353362688"
  },
  "random_index": 6350931,
  "ref_epoch": 2015.5,
  "ra": 92.558380311515,
  "ra_error": 0.12478790816365255,
  "dec": 58.627664231826344,
  "dec_error": 0.13508687403099942,
  "parallax": 0.5909578790579293,
  "parallax_error": 0.14437128001953808,
  "parallax_over_error": 4.0933204,
  "pmra": 2.5438885119623107,
  "pmra_error": 0.20254938210248896,
  "pmdec": -0.21396094042096406,
  "pmdec_error": 0.20904841088174855,
  "ra_dec_corr": -0.56457454,
  "ra_parallax_corr": 0.12009736,
  "ra_pmra_corr": -0.6078201,
  "ra_pmdec_corr": 0.47753105,
  "dec_parallax_corr": -0.41430187,
  "dec_pmra_corr": 0.2949177,
  "dec_pmdec_corr": -0.6960108,
  "parallax_pmra_corr": 0.27178344,
  "parallax_pmdec_corr": 0.19434129999999997,
  "pmra_pmdec_corr": -0.4180532,
  "astrometric_n_obs_al": 183,
  "astrometric_n_obs_ac": 0,
  "astrometric_n_good_obs_al": 182,
  "astrometric_n_bad_obs_al": 1,
  "astrometric_gof_al": 5.5943445999999994,
  "astrometric_chi2_al": 303.54388,
  "astrometric_excess_noise": 0.4833527523418856,
  "astrometric_excess_noise_sig": 5.443705462317363,
  "astrometric_params_solved": 31,
  "astrometric_primary_flag": false,
  "astrometric_weight_al": 1.6166749,
  "astrometric_pseudo_colour": 1.477695786147891,
  "astrometric_pseudo_colour_error": 0.023541713002533115,
  "mean_varpi_factor_al": -0.06028464,
  "astrometric_matched_observations": 21,
  "visibility_periods_used": 12,
  "astrometric_sigma5d_max": 0.25426537,
  "frame_rotator_object_type": 0,
  "matched_observations": 21,
  "duplicated_source": false,
  "phot_g_n_obs": 170,
  "phot_g_mean_flux": 2664.098798164812,
  "phot_g_mean_flux_error": 2.9041098922189583,
  "phot_g_mean_flux_over_error": 917.3547,
  "phot_g_mean_mag": 17.124489999999998,
  "phot_bp_n_obs": 19,
  "phot_bp_mean_flux": 1038.2146160401585,
  "phot_bp_mean_flux_error": 9.209846070483449,
  "phot_bp_mean_flux_over_error": 112.72877,
  "phot_bp_mean_mag": 17.810670000000002,
  "phot_rp_n_obs": 17,
  "phot_rp_mean_flux": 2348.3867026399985,
  "phot_rp_mean_flux_error": 9.584559177499207,
  "phot_rp_mean_flux_over_error": 245.0177,
  "phot_rp_mean_mag": 16.334995000000003,
  "phot_bp_rp_excess_factor": 1.2711996,
  "phot_proc_mode": 0,
  "bp_rp": 1.4756756000000002,
  "bp_g": 0.6861801,
  "g_rp": 0.78949547,
  "rv_nb_transits": 0,
  "l": 155.4862424582703,
  "b": 17.84647988940582,
  "ecl_lon": 91.62967191129887,
  "ecl_lat": 35.20285544159703,
  "coordinates": {
    "radec_str": [
      "06:10:14.0113",
      "58:37:39.591"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        -87.441619688485,
        58.627664231826344
      ]
    }
  }
}
```

### Gaia_DR2_2MASS_best_neighbour

```json
{
  "_id": {
    "$numberLong": "4197791981619356160"
  },
  "source_id": {
    "$numberLong": "4197791981619356160"
  },
  "original_ext_source_id": "19075003-1255214",
  "angular_distance": 0.06644709468616003,
  "gaia_astrometric_params": 5,
  "tmass_oid": 250000000,
  "number_of_neighbours": 1,
  "number_of_mates": 0,
  "best_neighbour_multiplicity": 1,
  "designation": "19075003-1255214",
  "ra": 286.958481,
  "dec": -12.922619000000001,
  "err_maj": 0.059999998658895486,
  "err_min": 0.059999998658895486,
  "err_ang": 90,
  "j_m": 14.045999526977539,
  "j_msigcom": 0.029999999329447743,
  "ext_key": "nan",
  "j_date": 2451634.9146,
  "ph_qual": "AAA",
  "coordinates": {
    "radec_str": [
      "19:07:50.0354",
      "-12:55:21.428"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        106.958481,
        -12.922619000000001
      ]
    }
  }
}
```

### Gaia_DR2_WD

```json
{
  "_id": {
    "$numberLong": "1944058569339736192"
  },
  "White_dwarf_name": "WDJ235959.90+512337.51",
  "Pwd": 0.978269,
  "Pwd_correction": 0,
  "designation": "Gaia DR2 1944058569339736192",
  "source_id": {
    "$numberLong": "1944058569339736192"
  },
  "ra": 359.9996991506746,
  "ra_error": 0.43441915533668496,
  "dec": 51.39371783225888,
  "dec_error": 0.3634619274508162,
  "parallax": 4.000771764633612,
  "parallax_error": 0.681225678190421,
  "pmra": 18.02463707635817,
  "pmra_error": 0.9332791802729818,
  "pmdec": -8.20204055385885,
  "pmdec_error": 0.6852187893440328,
  "astrometric_excess_noise": 0,
  "astrometric_sigma5d_max": 0.8586222,
  "phot_g_mean_flux": 145.5995025184722,
  "phot_g_mean_flux_error": 0.7758877493053826,
  "phot_g_mean_mag": 20.280466,
  "phot_bp_mean_flux": 127.96098808463923,
  "phot_bp_mean_flux_error": 7.4972849339003576,
  "phot_bp_mean_mag": 20.083694,
  "phot_rp_mean_flux": 91.92106867617287,
  "phot_rp_mean_flux_error": 5.717361518801369,
  "phot_rp_mean_mag": 19.853382,
  "phot_bp_rp_excess_factor": 1.5101841999999999,
  "l": 114.80801213883517,
  "b": -10.664831240511374,
  "density": 37501.363,
  "AG": 0.4737246894040745,
  "SDSS_name": null,
  "umag": null,
  "e_umag": null,
  "gmag": null,
  "e_gmag": null,
  "rmag": null,
  "e_rmag": null,
  "imag": null,
  "e_imag": null,
  "zmag": null,
  "e_zmag": null,
  "Teff": 8389.116262000001,
  "eTeff": 1413.407371,
  "log_g": 8.270042,
  "elog_g": 0.6133890000000001,
  "mass": 0.765633,
  "emass": 0.35701900000000003,
  "chi2": 24.418016,
  "Teff_He": 8595.502707,
  "eTeff_He": 1469.4622769999999,
  "log_g_He": 8.304577,
  "elog_g_He": 0.595058,
  "mass_He": 0.771932,
  "emass_He": 0.345866,
  "chisq_He": 23.735353,
  "coordinates": {
    "radec_str": [
      "23:59:59.9278",
      "51:23:37.384"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        179.9996991506746,
        51.39371783225888
      ]
    }
  }
}
```

### Gaia_DR_light_curves

```json
{
  "_id": {
    "$oid": "5d420e26af864fd0b46826d5"
  },
  "source_id": {
    "$numberLong": "1042493123719840384"
  },
  "transit_id": {
    "$numberLong": "51192665157191238"
  },
  "band": "RP",
  "time": 2322.635514503443,
  "mag": 13.969783515783753,
  "flux": 20742.189084981288,
  "flux_error": 143.24747955312785,
  "flux_over_error": 144.79968,
  "rejected_by_photometry": false,
  "rejected_by_variability": false,
  "other_flags": 0,
  "solution_id": {
    "$numberLong": "369295549951641967"
  }
}
```

### Gaia_EDR3

```json
{
  "_id": "46302603606323328",
  "solution_id": {
    "$numberLong": "1636042515805110273"
  },
  "designation": "Gaia EDR3 46302603606323328",
  "source_id": {
    "$numberLong": "46302603606323328"
  },
  "random_index": 1391774808,
  "ref_epoch": 2016,
  "ra": 60.46714097800324,
  "ra_error": 0.058414575,
  "dec": 16.943616134176196,
  "dec_error": 0.037906222,
  "parallax": 0.341877197611281,
  "parallax_error": 0.06903241,
  "parallax_over_error": 4.952416,
  "pm": 3.6085525,
  "pmra": -2.3924947524576625,
  "pmra_error": 0.08285938,
  "pmdec": -2.701410657974385,
  "pmdec_error": 0.046554293,
  "ra_dec_corr": 0.19460936,
  "ra_parallax_corr": -0.031472027,
  "ra_pmra_corr": -0.09550691,
  "ra_pmdec_corr": 0.16195059,
  "dec_parallax_corr": -0.19080144,
  "dec_pmra_corr": 0.07420638,
  "dec_pmdec_corr": 0.7235421,
  "parallax_pmra_corr": 0.3304192,
  "parallax_pmdec_corr": -0.27851942,
  "pmra_pmdec_corr": 0.06463895,
  "astrometric_n_obs_al": 385,
  "astrometric_n_obs_ac": 0,
  "astrometric_n_good_obs_al": 384,
  "astrometric_n_bad_obs_al": 1,
  "astrometric_gof_al": 0.7092198000000001,
  "astrometric_chi2_al": 415.75842,
  "astrometric_excess_noise": 0.04398744,
  "astrometric_excess_noise_sig": 0.12611096,
  "astrometric_params_solved": 31,
  "astrometric_primary_flag": false,
  "nu_eff_used_in_astrometry": 1.4846323000000001,
  "astrometric_matched_transits": 45,
  "visibility_periods_used": 16,
  "astrometric_sigma5d_max": 0.11609346400000001,
  "matched_transits": 50,
  "new_matched_transits": 9,
  "matched_transits_removed": 0,
  "ipd_gof_harmonic_amplitude": 0.02861196,
  "ipd_gof_harmonic_phase": 118.69746,
  "ipd_frac_multi_peak": 0,
  "ipd_frac_odd_win": 0,
  "ruwe": 1.0249834,
  "scan_direction_strength_k1": 0.45788577,
  "scan_direction_strength_k2": 0.64275295,
  "scan_direction_strength_k3": 0.41128325,
  "scan_direction_strength_k4": 0.21567367,
  "scan_direction_mean_k1": -14.759129000000001,
  "scan_direction_mean_k2": -2.8640985,
  "scan_direction_mean_k3": -10.605176,
  "scan_direction_mean_k4": 9.204896000000002,
  "duplicated_source": false,
  "phot_g_n_obs": 407,
  "phot_g_mean_flux": 4737.05123105242,
  "phot_g_mean_flux_error": 2.0616162,
  "phot_g_mean_flux_over_error": 2297.7368,
  "phot_g_mean_mag": 16.498596,
  "phot_bp_n_obs": 48,
  "phot_bp_mean_flux": 2182.778690601528,
  "phot_bp_mean_flux_error": 8.301160000000001,
  "phot_bp_mean_flux_over_error": 262.94864,
  "phot_bp_mean_mag": 16.991018,
  "phot_rp_n_obs": 48,
  "phot_rp_mean_flux": 3694.1100800097443,
  "phot_rp_mean_flux_error": 8.593036,
  "phot_rp_mean_flux_over_error": 429.8958,
  "phot_rp_mean_mag": 15.829120999999999,
  "phot_bp_n_contaminated_transits": 0,
  "phot_bp_n_blended_transits": 2,
  "phot_rp_n_contaminated_transits": 0,
  "phot_rp_n_blended_transits": 2,
  "phot_proc_mode": 0,
  "phot_bp_rp_excess_factor": 1.2406218,
  "bp_rp": 1.1618977,
  "bp_g": 0.4924221,
  "g_rp": 0.66947556,
  "dr2_rv_nb_transits": 0,
  "l": 174.85731678827995,
  "b": -26.17404860853566,
  "ecl_lon": 61.80428314163347,
  "ecl_lat": -3.651615738205456,
  "coordinates": {
    "radec_str": [
      "04:01:52.1138",
      "16:56:37.018"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        -119.53285902199676,
        16.943616134176196
      ]
    }
  }
}
```

### IPHAS_DR2

```json
{
  "_id": {
    "$oid": "5d412fc3781972ace824486b"
  },
  "name": "J192045.69+040924.3",
  "ra": 290.1903558152968,
  "dec": 4.156756491714779,
  "r": null,
  "rErr": null,
  "i": 20.398643493652344,
  "iErr": 0.18620002269744873,
  "ha": null,
  "haErr": null,
  "mergedClass": -2,
  "errBits": 0,
  "coordinates": {
    "radec_str": [
      "19:20:45.6854",
      "04:09:24.323"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        110.19035581529681,
        4.156756491714779
      ]
    }
  }
}
```

### LAMOST_DR5_v3

```json
{
  "_id": 585216248,
  "obsid": 585216248,
  "designation": "J165008.29+545144.1",
  "obsdate": "2017-05-05",
  "lmjd": 57879,
  "mjd": 57878,
  "planid": "HD165618N524154V01",
  "spid": 16,
  "fiberid": 248,
  "ra_obs": 252.534581,
  "dec_obs": 54.86225,
  "snru": 5.31,
  "snrg": 27.32,
  "snrr": 37.49,
  "snri": 37.11,
  "snrz": 21.2,
  "objtype": "Star",
  "class": "STAR",
  "subclass": "G2",
  "z": -0.0000755189,
  "z_err": 0.0000235163,
  "magtype": "gri",
  "mag1": 14.3,
  "mag2": 13.87,
  "mag3": 13.72,
  "mag4": 99,
  "mag5": 99,
  "mag6": 99,
  "mag7": 99,
  "tsource": "LEGUE_LCH",
  "fibertype": "Obj",
  "tfrom": "LCH000003",
  "tcomment": "15120423954341818",
  "offsets": 0,
  "offset_v": 0,
  "ra": 252.534581,
  "dec": 54.86225,
  "fibermask": 128,
  "coordinates": {
    "radec_str": [
      "16:50:08.2994",
      "54:51:44.100"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        72.534581,
        54.86225
      ]
    }
  }
}
```

### NVSS_41

```json
{
  "_id": {
    "$oid": "5dc3360e9cefcc4cb32fc7d2"
  },
  "RA": 359.9999552066248,
  "DEC": 36.27358579290813,
  "PEAK_INT": 0.007072302047163248,
  "MAJOR_AX": 0.013354524038732052,
  "MINOR_AX": 0.012883593328297138,
  "POSANGLE": 67.18267822265625,
  "Q_CENTER": -0.0007678649271838367,
  "U_CENTER": 0.0007418784080073237,
  "P_FLUX": 0.0011255634017288685,
  "I_RMS": 0.0004618219390977174,
  "POL_RMS": 0.00027888614567928016,
  "RES_RMS": 0.00026658238493837416,
  "RES_PEAK": 0.0007979057263582945,
  "RES_FLUX": -0.00031398344435729086,
  "CENTER_X": 512.0086669921875,
  "CENTER_Y": 578.6603393554688,
  "FIELD": "C0000P36",
  "JD_PROCESSED": 2450910,
  "coordinates": {
    "radec_str": [
      "23:59:59.9892",
      "36:16:24.909"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        179.9999552066248,
        36.27358579290813
      ]
    }
  }
}
```

### PS1_DR1

```json
{
  "_id": {
    "$numberLong": "96442852916841250"
  },
  "projectionID": 1125,
  "skyCellID": 59,
  "objInfoFlag": 436363264,
  "qualityFlag": 52,
  "raMean": 285.29153589,
  "decMean": -9.63258943,
  "raMeanErr": 0.08196,
  "decMeanErr": 0.08196,
  "epochMean": 56054.59271991,
  "nStackDetections": 3,
  "nDetections": 5,
  "ng": 0,
  "nr": 1,
  "ni": 3,
  "nz": 1,
  "ny": 0,
  "gMeanPSFMagNpt": 0,
  "gFlags": 16416,
  "rQfPerfect": 0.70198399,
  "rMeanPSFMag": 21.9111,
  "rMeanPSFMagErr": 0.25311601,
  "rMeanPSFMagNpt": 1,
  "rMeanPSFMagMin": 21.9111,
  "rMeanPSFMagMax": 21.9111,
  "rMeanKronMag": 21.5716,
  "rMeanKronMagErr": 0.25308001,
  "rFlags": 118840,
  "iQfPerfect": 0.99831599,
  "iMeanPSFMag": 21.6768,
  "iMeanPSFMagErr": 0.160105,
  "iMeanPSFMagNpt": 1,
  "iMeanPSFMagMin": 21.6768,
  "iMeanPSFMagMax": 21.6768,
  "iFlags": 115000,
  "zQfPerfect": 0.99831003,
  "zMeanPSFMag": 21.4736,
  "zMeanPSFMagErr": 0.17531399,
  "zMeanPSFMagNpt": 1,
  "zMeanPSFMagMin": 21.4736,
  "zMeanPSFMagMax": 21.4736,
  "zFlags": 115000,
  "yMeanPSFMagNpt": 0,
  "yFlags": 16416,
  "coordinates": {
    "radec_str": [
      "19:01:09.9686",
      "-9:37:57.322"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        105.29153588999998,
        -9.63258943
      ]
    }
  }
}
```

### RFC_2019d

```json
{
  "_id": "J2359+0042",
  "category": "N",
  "IVS_name": "2357+004",
  "J2000_name": "J2359+0042",
  "ra": 359.9950195541667,
  "dec": 0.7017562111111111,
  "ra_error_mas": 0.33,
  "dec_error_mas": 0.69,
  "corr": -0.382,
  "n_obs": 71,
  "S_band_flux_total": null,
  "S_band_flux_unres": null,
  "C_band_flux_total": null,
  "C_band_flux_unres": null,
  "X_band_flux_total": 0.021,
  "X_band_flux_unres": 0.021,
  "U_band_flux_total": null,
  "U_band_flux_unres": null,
  "K_band_flux_total": null,
  "K_band_flux_unres": null,
  "type": "X",
  "cat": "rfc_2019d",
  "coordinates": {
    "radec_str": [
      "23:59:58.804693",
      "00:42:06.32236"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        179.99501955416667,
        0.7017562111111111
      ]
    }
  }
}
```

### TGSS_ADR1

```json
{
  "_id": {
    "$oid": "5dc33a8c1860d303cfc00934"
  },
  "Source_name": "TGSSADR J233259.8+572816",
  "RA": 353.2493896484375,
  "E_RA": 2.700000047683716,
  "DEC": 57.47126007080078,
  "E_DEC": 2.299999952316284,
  "Total_flux": 170.10000610351562,
  "E_Total_flux": 31.200000762939453,
  "Peak_flux": 134.5,
  "E_Peak_flux": 21,
  "Maj": 32.099998474121094,
  "E_Maj": 4.300000190734863,
  "Min": 24.600000381469727,
  "E_Min": 2.5999999046325684,
  "PA": 78.9000015258789,
  "E_PA": 19.700000762939453,
  "RMS_noise": 15.600000381469727,
  "Source_code": "C",
  "Mosaic_name": "R72D67",
  "coordinates": {
    "radec_str": [
      "23:32:59.8535",
      "57:28:16.536"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        173.2493896484375,
        57.47126007080078
      ]
    }
  }
}
```

### TNS

```json
{
  "_id": 72839,
  "associated_group/s": "ZTF",
  "coordinates": {
    "radec_str": [
      "02:51:43.812",
      "+13:23:58.81"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        -137.06745,
        13.399669444444443
      ]
    }
  },
  "dec": "+13:23:58.81",
  "disc__instrument/s": "P48 - ZTF-Cam",
  "disc__internal_name": "ZTF20acwiaag",
  "discovery_data_source/s": "ZTF",
  "discovery_date": {
    "$date": "2020-12-10T05:37:53.760Z"
  },
  "discovery_date_(ut)": "2020-12-10 05:37:53.760",
  "discovery_filter": "r-ZTF",
  "discovery_mag/flux": 20.2947,
  "name": "AT 2020acko",
  "public": 1,
  "ra": "02:51:43.812",
  "reporting_group/s": "ZTF",
  "sender": "Fritz",
  "tns_at": 1
}
```

### ZTF_alerts

```json
{
  "_id": {
    "$oid": "5fe2f7b60533f71c0bbf4596"
  },
  "schemavsn": "3.3",
  "publisher": "ZTF (www.ztf.caltech.edu)",
  "objectId": "ZTF19acejuyb",
  "candid": {
    "$numberLong": "1452324664215015001"
  },
  "candidate": {
    "jd": 2459206.8246644,
    "fid": 1,
    "pid": {
      "$numberLong": "1452324664215"
    },
    "diffmaglim": 15.933797836303711,
    "pdiffimfilename": "ztf_20201223324549_000835_zg_c11_o_q3_scimrefdiffimg.fits",
    "programpi": "Kulkarni",
    "programid": 1,
    "candid": {
      "$numberLong": "1452324664215015001"
    },
    "isdiffpos": "t",
    "tblid": 1,
    "nid": 1452,
    "rcid": 42,
    "field": 835,
    "xpos": 1660.07666015625,
    "ypos": 137.2863006591797,
    "ra": 38.7890547,
    "dec": 70.2294522,
    "magpsf": 15.412940979003906,
    "sigmapsf": 0.20731626451015472,
    "chipsf": 1.1576299667358398,
    "magap": 15.888299942016602,
    "sigmagap": 0.3068000078201294,
    "distnr": 0.259865939617157,
    "magnr": 13.21399974822998,
    "sigmagnr": 0.019999999552965164,
    "chinr": 0.7929999828338623,
    "sharpnr": -0.019999999552965164,
    "sky": -0.7574638724327087,
    "magdiff": 0.4753590524196625,
    "fwhm": 1.5501855611801147,
    "classtar": 0.8220000267028809,
    "mindtoedge": 137.2863006591797,
    "magfromlim": 0.045497726649045944,
    "seeratio": 2,
    "aimage": 0.7730000019073486,
    "bimage": 0.625,
    "aimagerat": 0.4986499845981598,
    "bimagerat": 0.40317755937576294,
    "elong": 1.236799955368042,
    "nneg": 5,
    "nbad": 0,
    "rb": 0.5628571510314941,
    "ssdistnr": -999,
    "ssmagnr": -999,
    "ssnamenr": "null",
    "sumrat": 0.9724076986312866,
    "magapbig": 15.938400268554688,
    "sigmagapbig": 0.4090999960899353,
    "ranr": 38.7888508,
    "decnr": 70.2294279,
    "sgmag1": 13.369000434875488,
    "srmag1": 12.925000190734863,
    "simag1": 12.67300033569336,
    "szmag1": 12.470000267028809,
    "sgscore1": 0.980417013168335,
    "distpsnr1": 0.24479974806308746,
    "ndethist": 8,
    "ncovhist": 731,
    "jdstarthist": 2458471.6164931,
    "jdendhist": 2459206.8246644,
    "scorr": 6.40561294555664,
    "tooflag": 0,
    "objectidps1": {
      "$numberLong": "192270387888376085"
    },
    "objectidps2": {
      "$numberLong": "192270387891819606"
    },
    "sgmag2": -999,
    "srmag2": 20.968900680541992,
    "simag2": 20.556800842285156,
    "szmag2": 20.15489959716797,
    "sgscore2": 0.37995800375938416,
    "distpsnr2": 10.252285957336426,
    "objectidps3": {
      "$numberLong": "192270387920992348"
    },
    "sgmag3": 21.055200576782227,
    "srmag3": 19.960100173950195,
    "simag3": 19.442100524902344,
    "szmag3": 19.04560089111328,
    "sgscore3": 0.8418599963188171,
    "distpsnr3": 11.806835174560547,
    "nmtchps": 14,
    "rfid": 835120142,
    "jdstartref": 2458300.968889,
    "jdendref": 2458441.947164,
    "nframesref": 31,
    "rbversion": "t17_f5_c3",
    "dsnrms": 3.5873563289642334,
    "ssnrms": 12.106943130493164,
    "dsdiff": -8.519586563110352,
    "magzpsci": 22.813556671142578,
    "magzpsciunc": 0.0638810470700264,
    "magzpscirms": 0.08295299857854843,
    "nmatches": 11,
    "clrcoeff": 0.17836399376392365,
    "clrcounc": 0.13306497037410736,
    "zpclrcov": -0.09175434708595276,
    "zpmed": 22.929000854492188,
    "clrmed": 0.7009999752044678,
    "clrrms": 0.06783200055360794,
    "neargaia": 0.2567685544490814,
    "neargaiabright": 0.2567685544490814,
    "maggaia": 12.659767150878906,
    "maggaiabright": 12.659767150878906,
    "exptime": 30,
    "drb": 0.9354158639907837,
    "drbversion": "d6_m7"
  },
  "cutoutScience": {
    "fileName": "candid1452324664215015001_pid1452324664215_targ_sci.fits.gz",
    "stampData": {
      "$binary": "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",
      "$type": "0"
    }
  },
  "cutoutTemplate": {
    "fileName": "candid1452324664215015001_ref.fits.gz",
    "stampData": {
      "$binary": "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",
      "$type": "0"
    }
  },
  "cutoutDifference": {
    "fileName": "candid1452324664215015001_pid1452324664215_targ_scimref.fits.gz",
    "stampData": {
      "$binary": "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",
      "$type": "0"
    }
  },
  "classifications": {
    "braai": 0.7571563720703125,
    "braai_version": "d6_m9",
    "acai_h": 0.00014293193817138672,
    "acai_h_version": "d1_dnn_20201130",
    "acai_v": 0.013468354940414429,
    "acai_v_version": "d1_dnn_20201130",
    "acai_o": 2.014937017236207e-8,
    "acai_o_version": "d1_dnn_20201130",
    "acai_n": 4.422170718498819e-7,
    "acai_n_version": "d1_dnn_20201130",
    "acai_b": 0.4754488170146942,
    "acai_b_version": "d1_dnn_20201130"
  },
  "coordinates": {
    "radec_str": [
      "02:35:09.3731",
      "70:13:46.028"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        -141.2109453,
        70.2294522
      ]
    },
    "l": 131.54711164171042,
    "b": 9.11222550527289
  }
}
```

### ZTF_alerts_aux

```json
{
  "_id": "ZTF18aabptzk",
  "cross_matches": {
    "2MASS_PSC": [
      {
        "_id": "14163540+2622411 ",
        "j_m": 12.952,
        "h_m": 12.566,
        "k_m": 12.494,
        "coordinates": {
          "radec_str": [
            "14:16:35.4000",
            "26:22:41.138"
          ]
        }
      }
    ],
    "AllWISE": [
      {
        "_id": {
          "$numberLong": "2133125701351053671"
        },
        "w1mpro": 12.185,
        "w1sigmpro": 0.023,
        "w2mpro": 12.19,
        "w2sigmpro": 0.022000000000000002,
        "w3mpro": 11.987,
        "w3sigmpro": 0.19399999999999998,
        "w4mpro": 8.793,
        "ph_qual": "AABU",
        "coordinates": {
          "radec_str": [
            "14:16:35.3827",
            "26:22:40.938"
          ]
        }
      }
    ],
    "Gaia_DR2": [
      {
        "_id": "1259214459055603328",
        "parallax": 1.215137113556788,
        "parallax_error": 0.028347266797276286,
        "phot_g_mean_mag": 14.041173,
        "phot_bp_mean_mag": 14.449046,
        "phot_rp_mean_mag": 13.479729999999998,
        "coordinates": {
          "radec_str": [
            "14:16:35.3833",
            "26:22:40.746"
          ]
        }
      }
    ],
    "Gaia_DR2_WD": [],
    "galaxy_redshifts_20200522": [],
    "GALEX": [
      {
        "name": "GALEX J141635.3+262240",
        "NUVmag": 19.1232,
        "e_NUVmag": 0.0984,
        "coordinates": {
          "radec_str": [
            "14:16:35.3971",
            "26:22:40.706"
          ]
        }
      }
    ],
    "IPHAS_DR2": [],
    "LAMOST_DR5_v3": [],
    "PS1_DR1": [
      {
        "_id": {
          "$numberLong": "139652141474704181"
        },
        "gMeanPSFMag": 14.3737,
        "gMeanPSFMagErr": 0.0018969999999999998,
        "rMeanPSFMag": 13.9265,
        "rMeanPSFMagErr": 0.0068979999,
        "iMeanPSFMag": 13.8059,
        "iMeanPSFMagErr": 0.001468,
        "zMeanPSFMag": 13.679,
        "zMeanPSFMagErr": 0.0045349998,
        "yMeanPSFMag": 13.6453,
        "yMeanPSFMagErr": 0.0074849999999999995,
        "coordinates": {
          "radec_str": [
            "14:16:35.3831",
            "26:22:40.794"
          ]
        }
      }
    ],
    "CLU_20190625": [
      {
        "_id": 631235,
        "name": "AGC726341",
        "ra": 214.2046,
        "dec": 26.41028,
        "z": 0.0380164235830307,
        "a": -999,
        "b2a": -999,
        "pa": -999,
        "sfr_ha": 0,
        "sfr_fuv": -999,
        "mstar": 346170480.7863479,
        "coordinates": {
          "radec_str": [
            "14:16:49.1040",
            "26:24:37.008"
          ],
          "distance_arcsec": 217.92
        }
      },
      {
        "_id": 486420,
        "name": "2MASX J14164741+2624176",
        "ra": 214.1974967971,
        "dec": 26.4049194652,
        "z": 0.0362959988,
        "a": 0.0203667,
        "b2a": 0.84,
        "pa": 62,
        "sfr_ha": 0,
        "sfr_fuv": -999,
        "mstar": 10150461288.635296,
        "coordinates": {
          "radec_str": [
            "14:16:47.3992",
            "26:24:17.710"
          ],
          "distance_arcsec": 188.29
        }
      }
    ]
  },
  "prv_candidates": [
    {
      "jd": 2458156.9720486,
      "fid": 2,
      "pid": {
        "$numberLong": "402472041015"
      },
      "diffmaglim": 19.671100616455078,
      "pdiffimfilename": "/ztf/archive/sci/2018/0207/472037/ztf_20180207472037_001673_zr_c03_o_q3_scimrefdiffimg.fits.fz",
      "programpi": "Kulkarni",
      "programid": 0
    },
    {
      "jd": 2458156.9971065,
      "fid": 2,
      "pid": {
        "$numberLong": "402497101015"
      },
      "diffmaglim": 19.84280014038086,
      "pdiffimfilename": "/ztf/archive/sci/2018/0207/497095/ztf_20180207497095_001673_zr_c03_o_q3_scimrefdiffimg.fits.fz",
      "programpi": "Kulkarni",
      "programid": 0
    },
    {
      "jd": 2458157.0040278,
      "fid": 2,
      "pid": {
        "$numberLong": "402504021015"
      },
      "diffmaglim": 19.800500869750977,
      "pdiffimfilename": "/ztf/archive/sci/2018/0207/504028/ztf_20180207504028_001673_zr_c03_o_q3_scimrefdiffimg.fits.fz",
      "programpi": "Kulkarni",
      "programid": 0
    },
    {
      "jd": 2459110.63,
      "fid": 2,
      "pid": {
        "$numberLong": "1356129993515"
      },
      "diffmaglim": 19.51129913330078,
      "pdiffimfilename": "/ztf/archive/sci/2020/0918/130000/ztf_20200918130000_000628_zr_c09_o_q4_scimrefdiffimg.fits.fz",
      "programpi": "Prince",
      "programid": 2,
      "candid": {
        "$numberLong": "1356129993515015011"
      },
      "isdiffpos": "t",
      "tblid": 11,
      "nid": 1356,
      "rcid": 35,
      "field": 628,
      "xpos": 2856.429931640625,
      "ypos": 2591.010009765625,
      "ra": 214.1474621,
      "dec": 26.3772826,
      "magpsf": 16.773000717163086,
      "sigmapsf": 0.23663100600242615,
      "chipsf": 117.53299713134766,
      "magap": 17.54800033569336,
      "sigmagap": 0.08020000159740448,
      "distnr": 2.5294699668884277,
      "magnr": 13.934000015258789,
      "sigmagnr": 0.023000000044703484,
      "chinr": 0.8709999918937683,
      "sharpnr": -0.0430000014603138,
      "sky": 0.41200700402259827,
      "magdiff": 0.775048017501831,
      "fwhm": 1.2565399408340454,
      "classtar": 0.996999979019165,
      "mindtoedge": 216.06900024414062,
      "magfromlim": 1.9632899761199951,
      "seeratio": 2,
      "aimage": 0.593999981880188,
      "bimage": 0.3709999918937683,
      "aimagerat": 0.4727270007133484,
      "bimagerat": 0.29525500535964966,
      "elong": 1.6010799407958984,
      "nneg": 4,
      "nbad": 0,
      "rb": 0.21285699307918549,
      "sumrat": 0.9815809726715088,
      "magapbig": 17.520999908447266,
      "sigmagapbig": 0.09279999881982803,
      "ranr": 214.1474321,
      "decnr": 26.3779935,
      "scorr": 7.77304,
      "magzpsci": 25.989999771118164,
      "magzpsciunc": 0.000014299799659056589,
      "magzpscirms": 0.033022500574588776,
      "clrcoeff": 0.12168800085783005,
      "clrcounc": 0.000024869799744919874,
      "rbversion": "t17_f5_c3"
    }
  ]
}
```

### ZTF_ops

```json
{
  "_id": {
    "$oid": "5fe2f18a095ec1a17abffce2"
  },
  "utc_start": {
    "$date": "2020-12-23T06:20:51.500Z"
  },
  "sun_elevation": -69,
  "exp": 30,
  "filter": 1,
  "type": "targ",
  "field": 299,
  "pid": 1,
  "ra": 37.0367,
  "dec": -17.05,
  "slew": 17.97,
  "wait": 14.6,
  "fileroot": "ztf_20201223264213_000299_zg",
  "programpi": "Kulkarni",
  "qcomment": "all_sky",
  "utc_end": {
    "$date": "2020-12-23T06:21:21.500Z"
  },
  "jd_start": 2459206.764484954,
  "jd_end": 2459206.7648321763,
  "coordinates": {
    "radec_str": [
      37.0367,
      -17.05
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        -142.9633,
        -17.05
      ]
    }
  }
}
```

### cfht_w3_photozs

```json
{
  "_id": 5238493,
  "created_at": {
    "$date": "2019-01-28T02:34:06.369Z"
  },
  "cfht_id": "1309_75724",
  "ra": 218.2919617,
  "dec": 56.1931152,
  "flag": 0,
  "sg": 0,
  "r_eff": 2.69,
  "pz_final": 0.3483,
  "pz_zpdf": 0.3483,
  "pz_zpdf_l68": 0.2675,
  "pz_zpdf_u68": 0.4485,
  "chi2_zpdf": 0.3222355,
  "mod": 62,
  "ebv": 0.15,
  "nbfilt": 5,
  "pz_zmin": 0.3588,
  "pz_zmin_l68": 0.2679,
  "pz_zmin_u68": 0.4147,
  "chi2_best": 1.17004,
  "zp_2": -99,
  "chi2_2": 500000000,
  "mods": 68,
  "chis": 2.19897666666667,
  "zq": 0.2,
  "chiq": 0.80177,
  "modq": 4,
  "u": 24.796999999999997,
  "g": 24.084,
  "r": 23.391,
  "i": 23.250999999999998,
  "y": -99,
  "z": 22.874000000000002,
  "eu": 0.14,
  "eg": 0.052000000000000005,
  "er": 0.049,
  "ei": 0.06,
  "ey": -99,
  "ez": 0.151,
  "Mu": -17.075,
  "Mg": -17.631,
  "Mr": -18.098,
  "Mi": -18.209,
  "My": -18.187,
  "Mz": -18.386,
  "red": false,
  "coordinates": {
    "radec_str": [
      "14:33:10.0708",
      "56:11:35.215"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        38.2919617,
        56.1931152
      ]
    }
  }
}
```

### galaxy_redshifts_20200522

```json
{
  "_id": 3341943,
  "z": 0.12342000007629395,
  "ra": 251.2836086,
  "dec": 53.9663145,
  "l": 82.065621,
  "b": 40.007167,
  "source": "lam",
  "coordinates": {
    "radec_str": [
      "16:45:08.0661",
      "53:57:58.732"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        71.28360860000001,
        53.9663145
      ]
    }
  }
}
```

### legacysurveys_photoz_DR7

```json
{
  "_id": {
    "$oid": "5d43fb005a14fae85f48d335"
  },
  "TYPE": "EXP",
  "RA": 31.621614308122464,
  "DEC": -2.2719468735866255,
  "gmag": 23.042409896850586,
  "rmag": 22.15606117248535,
  "zmag": 21.336191177368164,
  "w1mag": 20.123031616210938,
  "w2mag": 20.547822952270508,
  "gmagerr": 0.06158291921019554,
  "rmagerr": 0.03132384270429611,
  "zmagerr": 0.044920437037944794,
  "w1magerr": 0.06707892566919327,
  "w2magerr": 0.22513341903686523,
  "z_phot": 0.743435263633728,
  "z_phot_err": 0.13711772859096527,
  "z_spec": -99,
  "mass_opt": 10.195596206511896,
  "coordinates": {
    "radec_str": [
      "02:06:29.1874",
      "-2:16:19.009"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        -148.37838569187753,
        -2.2719468735866255
      ]
    }
  }
}
```

### milliquas_v6

```json
{
  "_id": "SDSS J235959.98+344449.6",
  "RA": 359.9999552,
  "DEC": 34.7471334,
  "Name": "SDSS J235959.98+344449.6",
  "Descrip": "Q",
  "Rmag": 20.57,
  "Bmag": 20.89,
  "Comment": "g",
  "R": "-",
  "B": "-",
  "Z": 2.375,
  "Cite": "DR14Q",
  "Zcite": "DR14Q",
  "Qpct": 0,
  "Xname": "0",
  "Rname": "0",
  "Lobe1": "0",
  "Lobe2": "0",
  "coordinates": {
    "radec_str": [
      "23:59:59.9892",
      "34:44:49.680"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        179.9999552,
        34.7471334
      ]
    }
  }
}
```

### mzls_ellipticals

```json
{
  "_id": 2394376,
  "created_at": {
    "$date": "2019-01-28T09:13:01.864Z"
  },
  "type": "COMP",
  "ra": 237.684948977142,
  "dec": 41.600776522853295,
  "dchisq": [
    1478.58386230469,
    1451.13208007812,
    1429.71752929688,
    1463.20336914062,
    1212.61962890625
  ],
  "ebv": 0.0168251320719719,
  "flux_g": 1.4944832324981698,
  "flux_r": 3.6741538047790496,
  "flux_z": 21.915563583374,
  "flux_w1": 56.517063140869105,
  "flux_w2": 28.295207977294897,
  "flux_ivar_g": 20.5681457519531,
  "flux_ivar_r": 6.10129976272583,
  "flux_ivar_z": 2.9358487129211404,
  "flux_ivar_w1": 0.7006883025169369,
  "flux_ivar_w2": 0.15318673849105802,
  "nobs_g": 3,
  "nobs_r": 3,
  "nobs_z": 3,
  "fracflux_g": 0.0309776850044727,
  "fracflux_r": 0.0116703538224101,
  "fracflux_z": 0.00140351883601397,
  "fracflux_w1": 0.19883149862289398,
  "fracflux_w2": 0.32600337266921997,
  "fracmasked_g": 0.15513104200363198,
  "fracmasked_r": 0.155185341835022,
  "fracmasked_z": 0.131169781088829,
  "psfsize_g": 1.61460816860199,
  "psfsize_r": 1.3913586139679,
  "psfsize_z": 1.1434849500656101,
  "psfdepth_g": 636.57568359375,
  "psfdepth_r": 216.025207519531,
  "psfdepth_z": 131.34211730957,
  "galdepth_g": 427.070251464844,
  "galdepth_r": 130.93893432617202,
  "galdepth_z": 67.903205871582,
  "fracdev": 0.8228837251663209,
  "shapedev_r": 24.551856994628896,
  "shapedev_e1": -0.10663624852895699,
  "shapedev_e2": -0.205076441168785,
  "shapeexp_r": 0.6114488840103149,
  "shapeexp_e1": 0.21166861057281502,
  "shapeexp_e2": 0.28975990414619396,
  "allmask": 1,
  "anymask": 1,
  "z_phot": 0.8551718592643741,
  "z_phot_err": 0.115563660860062,
  "z_spec": -99,
  "survey": null,
  "training": 0,
  "w1_source": 0,
  "d2d_source": 0,
  "circ_flag": 0,
  "ds_flag": 0,
  "wisemask": 0,
  "gmag": 22.0637722015381,
  "rmag": 21.087106704711896,
  "zmag": 19.148118972778303,
  "w1mag": 18.1195507049561,
  "w2mag": 18.8707180023193,
  "coordinates": {
    "radec_str": [
      "15:50:44.3878",
      "41:36:02.795"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        57.684948977142,
        41.600776522853295
      ]
    }
  }
}
```

### sdss_eliipticals

```json
{
  "_id": {
    "$numberLong": "1237655744019825607"
  },
  "z": 0.338771,
  "zerr": 0.060242,
  "ra": 227.257698647415,
  "dec": 5.654407236446691,
  "absMagG": -17.0535,
  "absMagR": -18.92,
  "coordinates": {
    "radec_str": [
      "15:09:01.8477",
      "05:39:15.866"
    ],
    "radec_geojson": {
      "type": "Point",
      "coordinates": [
        47.257698647415,
        5.654407236446691
      ]
    }
  }
}
```
