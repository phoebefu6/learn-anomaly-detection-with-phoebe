# Official course map - learn-anomaly-detection-with-phoebe

**Course:** Anomaly detection - finding the points that do not belong, end to end
**Scope:** The full picture of anomaly detection: the types of anomaly (point, contextual, collective), the method families (statistical, distance/density, isolation, one-class, time-series-specific, deep), how detection is measured on rare events (precision/recall, not accuracy) and why alert fatigue is the real enemy, the team + pipeline / R&R (analyst labels + baselines -> data scientist builds -> engineering streams it -> ops responds -> monitor the detector), the tech implementation (real Python), and strategy/pitfalls. Explained for the layman with a visual per concept, and for the practitioner with real code.
**Arc:** Topic-session, two-track, with a running series **Lumen web analytics** (the Lumen skincare brand from the Statistics / Intro-ML / Forecasting courses, now detecting spikes, drops, bot surges, and contextual dips in daily site traffic). Sibling to the forecasting course (its monitoring session hands off here). Leader track (a1-a6) + builder track (b1-b10, real Python).
**Bucket:** `ds` (Data Science). Palette: alert red `#DC2626` + charcoal. Convention: normal = charcoal, anomaly = red.
**Coverage bar:** ~80% of the mapped sources' working content per session; the survey papers stay official (cited).
**Build mode:** course-taking loop PAUSED (built direct from verified sources, no learner-notes step).

## Source universe (verified public sources, with citations)

| Source | What it covers | Maps to |
|---|---|---|
| **Chandola, Banerjee & Kumar (2009), "Anomaly Detection: A Survey," ACM Computing Surveys 41(3):15** | the canonical taxonomy: point/contextual/collective anomalies, supervised/semi-supervised/unsupervised, technique families | a1, a2, a3, b1 |
| **Breunig, Kriegel, Ng & Sander (2000), "LOF: Identifying Density-Based Local Outliers," ACM SIGMOD** | Local Outlier Factor; density-based local anomalies | b4 |
| **Liu, Ting & Zhou (2008), "Isolation Forest," IEEE ICDM 2008** | isolation-based detection; anomalies are few and different, so easy to isolate | b5 |
| **Scholkopf, Platt, Shawe-Taylor, Smola & Williamson (2001), "Estimating the Support of a High-Dimensional Distribution" (One-Class SVM), Neural Computation 13(7)** | one-class / novelty detection boundary | b6 |
| **Rousseeuw & Van Driessen (1999), Minimum Covariance Determinant (robust covariance / Elliptic Envelope)** | Gaussian/covariance-based outlier detection | b6 |
| **Page (1954) CUSUM; Basseville & Nikiforov (1993), change detection** | change-point / CUSUM for time-series shifts | b7 |
| **Pang, Shen, Cao & van den Hengel (2021), "Deep Learning for Anomaly Detection: A Review," ACM Computing Surveys 54(2); arXiv:2007.02500** | autoencoder reconstruction error, deep one-class, deep methods survey | b8 |
| **scikit-learn "Novelty and Outlier Detection" user guide + `statsmodels`** | practical IsolationForest, LOF, OneClassSVM, EllipticEnvelope, z/IQR/MAD, STL | b2-b6, b9 |
| **Numenta Anomaly Benchmark (NAB, Lavin & Ahmad 2015)** | streaming detection + evaluation caution | a5, b9, b10 |

## Layman anchors (verified, cite on landing / a1)

- Anomaly detection is behind fraud alerts, outage detection, quality control, and security intrusion detection - the same core idea across all of them.
- The central honesty lesson: on rare events, accuracy lies (a detector that says "never an anomaly" is 99.9% accurate and useless). Precision and recall are the real scoreboard.
- The second lesson: a detector that cries wolf gets muted. Alert fatigue, not model math, is what kills most detection systems.

## Per-session coverage

### Leader track (a1-a6) - PM / biz / product leaders, no code
| # | Session | Primary sources | Coverage |
|---|---|---|---|
| a1 | Why detect anomalies | Chandola survey, industry | ✓ fraud/outage/quality/security; cost of a miss vs a false alarm |
| a2 | Types of anomalies | Chandola survey | ✓ point, contextual, collective - visual-heavy |
| a3 | The methods, without math | Chandola, sklearn, deep survey | ✓ statistical -> ML -> deep; supervised vs unsupervised |
| a4 | The team + the pipeline (R&R) | industry practice | ✓ analyst -> DS -> engineering -> ops -> monitoring |
| a5 | Measuring detection | Chandola, NAB | ✓ precision/recall, alert fatigue, why accuracy lies on rare events |
| a6 | Strategy & pitfalls | survey, practice | ◐ thresholds, drift, human-in-the-loop, when NOT to auto-flag |

### Builder track (b1-b10) - analysts / DS / engineers (real Python)
| # | Session | Primary sources | Coverage |
|---|---|---|---|
| b1 | Anomaly foundations | Chandola survey | ✓ the labeled Lumen series, point/contextual/collective, base-rate problem, eval split |
| b2 | Statistical detectors | sklearn/statsmodels | ✓ z-score, 3-sigma, IQR/Tukey, robust MAD |
| b3 | Rolling & seasonal | statsmodels STL | ✓ moving mean/std, EWMA, STL-residual + `anomaly-live.js` real demo |
| b4 | Distance & density | Breunig 2000 (LOF) | ✓ kNN distance, Local Outlier Factor |
| b5 | Isolation Forest | Liu, Ting & Zhou 2008 | ✓ isolation trees, path length, `sklearn.ensemble.IsolationForest` |
| b6 | One-class & covariance | Scholkopf 2001, MCD | ✓ One-Class SVM, Elliptic Envelope, when each fits |
| b7 | Time-series anomalies | CUSUM, forecast residual | ✓ change-point, CUSUM, forecast-residual anomalies (ties to forecasting course) |
| b8 | Deep anomaly detection | Pang et al. 2021 | ◐ autoencoder reconstruction error, LSTM-AE - cited, illustrative sketch (re-verify) |
| b9 | Evaluation | Chandola, NAB, sklearn | ✓ precision/recall/F1, PR-AUC, point-adjust, threshold tuning, imbalance |
| b10 | Productionizing & alerting | industry practice, NAB | ✓ streaming detection, alert routing, feedback loop, monitoring the detector |

## Hard rails / honesty

- **Accuracy lies on rare events.** Report precision, recall, F1, and PR-AUC - never accuracy alone. A "never anomalous" detector scores 99%+ accuracy and catches nothing.
- **Alert fatigue is the real failure mode.** A detector that fires too often gets ignored; tuning the threshold is a precision/recall (business) decision, not just a model one.
- **Most real detection is unsupervised.** Labels are scarce and late; teach unsupervised/semi-supervised methods honestly, and treat any labels as precious.
- **Context matters.** A value normal globally can be an anomaly for its context (weekday, season). Deseasonalize before flagging.
- **The simulator is real math on a small labeled teaching series**, not a production detector - state it.
- Deep methods (b8) are surveyed with citations; full training belongs to a dedicated deep-learning course. Re-verify b8.

## Not covered by design (say so honestly)

- Full deep-model training from scratch (b8 is a cited survey + illustrative sketch).
- High-dimensional / image / graph anomaly detection beyond a mention.
- Full streaming-infrastructure engineering (Kafka/Flink) beyond the serving concept.
- Vendor anomaly products (AWS Lookout, Datadog, etc.) beyond a buy-vs-build note.

**Re-verify before delivery:** b8 (deep anomaly detection moves fast); keep the NAB / evaluation framing current.
