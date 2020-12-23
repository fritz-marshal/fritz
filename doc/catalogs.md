# Kowalski collection schemas

Fritz hosts a number of astronomical catalogs on its Kowalski backend.
Below you will find a list of available catalogs and the approximate contents of
individual entries therein (example documents per MongoDB collection).
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

# CLU_20190625

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

## FIRST_20141217

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

## GALEX

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

## Gaia_DR2

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

## Gaia_DR2_2MASS_best_neighbour

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

## Gaia_DR2_WD

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

## Gaia_DR_light_curves

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

## Gaia_EDR3

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

## IPHAS_DR2

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

## LAMOST_DR5_v3

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

## PS1_DR1

```json

```

## galaxy_redshifts_20200522

```json

```
