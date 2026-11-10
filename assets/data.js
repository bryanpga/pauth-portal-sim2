/* Static reference data used by the generator. All names, organizations and
   identifiers produced from these lists are synthetic. */
window.REF = (() => {
  const firstNames = {
    F: ['Olivia','Emma','Ava','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Abigail','Emily','Elizabeth','Sofia','Avery','Ella','Scarlett','Grace','Chloe','Victoria','Riley','Aria','Lily','Aubrey','Zoey','Penelope','Lillian','Addison','Layla','Natalie','Camila','Hannah','Brooklyn','Zoe','Nora','Leah','Savannah','Audrey','Claire','Eleanor','Maria','Linda','Patricia','Barbara','Susan','Karen','Nancy','Donna','Carol','Sandra','Deborah','Sharon','Janet','Ruth','Gloria','Rosa','Yolanda','Keisha','Priya','Mei'],
    M: ['Liam','Noah','William','James','Oliver','Benjamin','Elijah','Lucas','Mason','Logan','Alexander','Ethan','Jacob','Michael','Daniel','Henry','Jackson','Sebastian','Aiden','Matthew','Samuel','David','Joseph','Carter','Owen','Wyatt','John','Jack','Luke','Jayden','Dylan','Grayson','Levi','Isaac','Gabriel','Julian','Robert','Richard','Thomas','Charles','Christopher','Anthony','Mark','Donald','Steven','Paul','Andrew','Kenneth','Kevin','Brian','George','Edward','Ronald','Timothy','Jose','Carlos','Luis','Darnell','Raj','Wei']
  };
  const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes','Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper','Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson','Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes','Price','Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez'];

  const places = [
    ['Columbus','OH','432'],['Dayton','OH','454'],['Cleveland','OH','441'],['Indianapolis','IN','462'],['Louisville','KY','402'],
    ['Nashville','TN','372'],['Memphis','TN','381'],['Atlanta','GA','303'],['Savannah','GA','314'],['Charlotte','NC','282'],
    ['Raleigh','NC','276'],['Richmond','VA','232'],['Pittsburgh','PA','152'],['Philadelphia','PA','191'],['Detroit','MI','482'],
    ['Grand Rapids','MI','495'],['Chicago','IL','606'],['Springfield','IL','627'],['St. Louis','MO','631'],['Kansas City','MO','641'],
    ['Milwaukee','WI','532'],['Minneapolis','MN','554'],['Des Moines','IA','503'],['Omaha','NE','681'],['Tulsa','OK','741'],
    ['Dallas','TX','752'],['Houston','TX','770'],['San Antonio','TX','782'],['Phoenix','AZ','850'],['Tucson','AZ','857'],
    ['Denver','CO','802'],['Albuquerque','NM','871'],['Jacksonville','FL','322'],['Tampa','FL','336'],['Orlando','FL','328']
  ];
  const streets = ['Maple','Oak','Cedar','Pine','Elm','Washington','Lake','Hill','Park','Main','Ridge','Walnut','Sunset','Highland','River','Church','Spring','Meadow','Forest','Jefferson','Lincoln','Chestnut','Willow','Franklin'];
  const streetTypes = ['St','Ave','Rd','Dr','Ln','Ct','Blvd','Way','Pl'];

  // copay = specialist copay, coins = member coinsurance fraction
  const plans = [
    { name: 'Commercial PPO',            prefix: 'WPP', group: true,  copay: 40, coins: 0.2,  deductible: 1500, weight: 26 },
    { name: 'Commercial HMO',            prefix: 'WHM', group: true,  copay: 30, coins: 0.1,  deductible: 750,  weight: 18 },
    { name: 'Commercial EPO',            prefix: 'WEP', group: true,  copay: 35, coins: 0.2,  deductible: 2000, weight: 8 },
    { name: 'Medicare Advantage HMO',    prefix: 'MAH', group: false, copay: 20, coins: 0.2,  deductible: 0,    weight: 16 },
    { name: 'Medicare Advantage PPO',    prefix: 'MAP', group: false, copay: 25, coins: 0.2,  deductible: 250,  weight: 10 },
    { name: 'Medicaid Managed Care',     prefix: 'MCD', group: false, copay: 0,  coins: 0,    deductible: 0,    weight: 14 },
    { name: 'Dual Special Needs (D-SNP)',prefix: 'DSN', group: false, copay: 0,  coins: 0,    deductible: 0,    weight: 4 },
    { name: 'Marketplace Silver EPO',    prefix: 'MKT', group: false, copay: 50, coins: 0.3,  deductible: 4500, weight: 4 }
  ];

  const employers = ['Brightwater Logistics','Harlow Manufacturing','Crescent Valley Schools','Northfield Credit Union','Summit Ridge Hospitality','Ironwood Construction','Bluestem Foods','Pioneer Freight Lines','Clearview County Government','Redwood Software Group','Lakeshore Retail Partners','Granite State Utilities'];

  // ICD-10 codes (stored with dot; displayed with or without per UI).
  const icd = {
    'E11.69': 'Type 2 diabetes mellitus with other specified complication',
    'E11.9':  'Type 2 diabetes mellitus without complications',
    'E55.9':  'Vitamin D deficiency, unspecified',
    'R53.1':  'Weakness',
    'E78.5':  'Hyperlipidemia, unspecified',
    'I10':    'Essential (primary) hypertension',
    'R73.03': 'Prediabetes',
    'E03.9':  'Hypothyroidism, unspecified',
    'D64.9':  'Anemia, unspecified',
    'Z00.00': 'Encounter for general adult medical examination without abnormal findings',
    'N18.3':  'Chronic kidney disease, stage 3',
    'M54.50': 'Low back pain, unspecified',
    'M17.11': 'Unilateral primary osteoarthritis, right knee',
    'M17.12': 'Unilateral primary osteoarthritis, left knee',
    'G43.909':'Migraine, unspecified, not intractable, without status migrainosus',
    'R10.9':  'Unspecified abdominal pain',
    'R91.1':  'Solitary pulmonary nodule',
    'M51.26': 'Other intervertebral disc displacement, lumbar region',
    'M51.16': 'Intervertebral disc disorders with radiculopathy, lumbar region',
    'S83.241A':'Other tear of medial meniscus, current injury, right knee, initial encounter',
    'M23.221':'Derangement of posterior horn of medial meniscus due to old tear, right knee',
    'M54.2':  'Cervicalgia',
    'M25.561':'Pain in right knee',
    'M75.101':'Unspecified rotator cuff tear or rupture of right shoulder, not specified as traumatic',
    'S46.011A':'Strain of muscle(s) and tendon(s) of the rotator cuff of right shoulder, initial encounter',
    'G47.33': 'Obstructive sleep apnea (adult) (pediatric)',
    'G47.00': 'Insomnia, unspecified',
    'R06.83': 'Snoring',
    'J44.9':  'Chronic obstructive pulmonary disease, unspecified',
    'M62.81': 'Muscle weakness (generalized)',
    'Z99.81': 'Dependence on supplemental oxygen',
    'R26.81': 'Unsteadiness on feet',
    'K80.20': 'Calculus of gallbladder without cholecystitis without obstruction',
    'H25.11': 'Age-related nuclear cataract, right eye',
    'H25.12': 'Age-related nuclear cataract, left eye',
    'K50.90': "Crohn's disease, unspecified, without complications",
    'M05.79': 'Rheumatoid arthritis with rheumatoid factor of multiple sites without organ or systems involvement',
    'C83.30': 'Diffuse large B-cell lymphoma, unspecified site',
    'D70.1':  'Agranulocytosis secondary to cancer chemotherapy',
    'C50.911':'Malignant neoplasm of unspecified site of right female breast',
    'F32.1':  'Major depressive disorder, single episode, moderate',
    'F41.1':  'Generalized anxiety disorder',
    'F43.10': 'Post-traumatic stress disorder, unspecified',
    'F90.0':  'Attention-deficit hyperactivity disorder, predominantly inattentive type',
    'I25.10': 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
    'R07.9':  'Chest pain, unspecified',
    'I48.91': 'Unspecified atrial fibrillation',
    'R00.2':  'Palpitations'
  };

  // Service categories: CPT/HCPCS codes with base charge + typical unit range.
  const categories = [
    {
      key: 'lab', label: 'Outpatient Laboratory', pos: ['81'], units: 'UN', paRequired: 0.35,
      icd: ['E11.69','E11.9','E55.9','R53.1','E78.5','I10','R73.03','E03.9','D64.9','N18.3'],
      codes: [
        ['80053','Comprehensive metabolic panel',25,[1,1]],
        ['80061','Lipid panel',25,[1,1]],
        ['81000','Urinalysis, non-automated, with microscopy',10,[1,1]],
        ['82306','Vitamin D; 25 hydroxy',70,[1,1]],
        ['83036','Hemoglobin; glycosylated (A1C)',30,[1,1]],
        ['85025','Complete blood count (CBC) with differential',20,[1,1]],
        ['84443','Thyroid stimulating hormone (TSH)',45,[1,1]],
        ['80048','Basic metabolic panel',18,[1,1]],
        ['82043','Albumin; urine, microalbumin, quantitative',22,[1,1]],
        ['81479','Unlisted molecular pathology procedure',1450,[1,1]]
      ],
      providers: ['Summit Diagnostics Laboratory','Clearpoint Reference Lab','Meridian Clinical Labs']
    },
    {
      key: 'imaging', label: 'Advanced Imaging', pos: ['22','24','11'], units: 'UN', paRequired: 1,
      icd: ['M54.50','M17.11','G43.909','R10.9','R91.1','M51.26','S83.241A','M51.16'],
      codes: [
        ['70553','MRI brain without contrast, followed by with contrast',2850,[1,1]],
        ['72148','MRI lumbar spine without contrast',1650,[1,1]],
        ['73721','MRI lower extremity joint without contrast',1480,[1,1]],
        ['74177','CT abdomen and pelvis with contrast',1920,[1,1]],
        ['71250','CT thorax without contrast',980,[1,1]],
        ['78815','PET with concurrently acquired CT; skull base to mid-thigh',5400,[1,1]],
        ['A9579','Gadolinium-based contrast, per ml',6,[5,20]]
      ],
      providers: ['Northgate Imaging Center','Riverside Advanced Radiology','Crescent MRI & CT']
    },
    {
      key: 'pt', label: 'Physical Therapy', pos: ['11','22'], units: 'UN', paRequired: 0.8,
      icd: ['M54.2','M25.561','M75.101','S46.011A','M54.50','M17.12','R26.81'],
      codes: [
        ['97161','PT evaluation, low complexity',165,[1,1]],
        ['97110','Therapeutic exercises, each 15 minutes',48,[1,4]],
        ['97140','Manual therapy techniques, each 15 minutes',44,[1,3]],
        ['97530','Therapeutic activities, each 15 minutes',52,[1,3]],
        ['97112','Neuromuscular reeducation, each 15 minutes',50,[1,2]],
        ['97014','Electrical stimulation, unattended',22,[1,1]]
      ],
      providers: ['Pinecrest Physical Therapy','MotionWorks Rehab','Keystone Sports & Spine PT']
    },
    {
      key: 'dme', label: 'Durable Medical Equipment', pos: ['12'], units: 'UN', paRequired: 0.9,
      icd: ['G47.33','J44.9','M62.81','Z99.81','R26.81'],
      codes: [
        ['E0601','Continuous positive airway pressure (CPAP) device',1150,[1,1]],
        ['A7030','Full face mask used with positive airway pressure device',185,[1,1]],
        ['E0260','Hospital bed, semi-electric, with mattress',1650,[1,1]],
        ['K0001','Standard wheelchair',540,[1,1]],
        ['E1390','Oxygen concentrator, single delivery port',2100,[1,1]],
        ['E0143','Walker, folding, wheeled, adjustable',135,[1,1]]
      ],
      providers: ['Keystone Medical Supply','HomeWell DME Services','Liberty Respiratory & Supply']
    },
    {
      key: 'surgery', label: 'Outpatient Surgery', pos: ['22','24'], units: 'UN', paRequired: 1,
      icd: ['M23.221','K80.20','M51.16','M17.11','H25.11','H25.12','S83.241A'],
      codes: [
        ['29881','Arthroscopy, knee, with meniscectomy (medial OR lateral)',6200,[1,1]],
        ['47562','Laparoscopic cholecystectomy',9800,[1,1]],
        ['63030','Laminotomy with decompression of nerve root(s), lumbar',14200,[1,1]],
        ['66984','Extracapsular cataract removal with IOL insertion',3900,[1,1]],
        ['01400','Anesthesia for open or surgical arthroscopic procedures on knee joint',1250,[1,1]],
        ['64483','Transforaminal epidural injection, lumbar or sacral, single level',1450,[1,1]]
      ],
      providers: ['Meadowbrook Surgical Center','Riverbend Orthopedics','Clearwater Eye Surgery Center']
    },
    {
      key: 'infusion', label: 'Specialty Drug / Infusion', pos: ['19','11'], units: 'UN', paRequired: 1,
      icd: ['K50.90','M05.79','C83.30','D70.1','C50.911'],
      codes: [
        ['J1745','Injection, infliximab, excludes biosimilar, 10 mg',95,[20,60]],
        ['J2506','Injection, pegfilgrastim, excludes biosimilar, 0.5 mg',520,[12,12]],
        ['J9312','Injection, rituximab, 10 mg',112,[50,100]],
        ['J9355','Injection, trastuzumab, excludes biosimilar, 10 mg',148,[30,60]],
        ['96413','Chemotherapy administration, IV infusion; up to 1 hour',420,[1,1]],
        ['96365','IV infusion, for therapy/prophylaxis; initial, up to 1 hour',285,[1,1]]
      ],
      providers: ['Cedar Valley Oncology','Lakeside Infusion Partners','Northshore Rheumatology Associates']
    },
    {
      key: 'sleep', label: 'Sleep Study', pos: ['11','22'], units: 'UN', paRequired: 1,
      icd: ['G47.33','G47.00','R06.83'],
      codes: [
        ['95810','Polysomnography; age 6 years or older, 4 or more parameters',2400,[1,1]],
        ['95811','Polysomnography with CPAP initiation and titration',2650,[1,1]],
        ['G0399','Home sleep test (HST), type III portable monitor',480,[1,1]]
      ],
      providers: ['Harbor Sleep Institute','Quietnight Sleep Diagnostics']
    },
    {
      key: 'bh', label: 'Behavioral Health', pos: ['11','02','10'], units: 'UN', paRequired: 0.6,
      icd: ['F32.1','F41.1','F43.10','F90.0'],
      codes: [
        ['90791','Psychiatric diagnostic evaluation',260,[1,1]],
        ['90837','Psychotherapy, 60 minutes with patient',210,[1,1]],
        ['90834','Psychotherapy, 45 minutes with patient',160,[1,1]],
        ['96130','Psychological testing evaluation services, first hour',230,[1,1]],
        ['96131','Psychological testing evaluation services, each additional hour',180,[1,3]]
      ],
      providers: ['Brightpath Behavioral Health','Stillwater Counseling Group']
    },
    {
      key: 'cardio', label: 'Cardiology', pos: ['11','22'], units: 'UN', paRequired: 0.9,
      icd: ['I25.10','R07.9','I48.91','R00.2','I10'],
      codes: [
        ['78452','Myocardial perfusion imaging, SPECT, multiple studies',2250,[1,1]],
        ['93306','Echocardiography, transthoracic, complete, with Doppler',1100,[1,1]],
        ['93350','Stress echocardiography',980,[1,1]],
        ['93224','External ECG recording up to 48 hours',420,[1,1]],
        ['93458','Left heart catheterization with coronary angiography',7800,[1,1]]
      ],
      providers: ['Heartland Cardiovascular Group','Parkview Heart & Vascular']
    }
  ];

  const pcps = ['Lakeside Family Medicine','Oakridge Primary Care','Westfield Internal Medicine','Sunrise Community Health','Greenway Family Practice','Bayview Medical Group'];
  const reviewers = ['Dr. A. Whitfield, MD','Dr. R. Okafor, MD','Dr. S. Lindqvist, DO','Dr. M. Castellanos, MD','J. Pruitt, RN','K. Delgado, RN','T. Nakamura, RN'];

  const posNames = {
    '02': 'Telehealth other than home', '10': 'Telehealth in home', '11': 'Office', '12': 'Home',
    '19': 'Off campus outpatient hospital', '22': 'On campus outpatient hospital', '24': 'Ambulatory surgical center', '81': 'Independent laboratory'
  };

  const denials = [
    ['CO-197','Precertification/authorization/notification/pre-treatment absent.'],
    ['CO-50','Non-covered service: not deemed a medical necessity by the payer.'],
    ['CO-16','Claim/service lacks information or has submission/billing error(s).'],
    ['CO-96','Non-covered charge(s).'],
    ['CO-11','The diagnosis is inconsistent with the procedure.'],
    ['CO-4','The procedure code is inconsistent with the modifier used.'],
    ['CO-27','Expenses incurred after coverage terminated.'],
    ['CO-151','Information submitted does not support this many/frequency of services.'],
    ['CO-167','This (these) diagnosis(es) is (are) not covered.'],
    ['CO-236','Procedure/modifier combination not compatible with another procedure on the same day.'],
    ['CO-B7','Provider was not certified/eligible to be paid for this procedure on this date of service.']
  ];
  const remarks = [
    ['N130','Consult plan benefit documents/guidelines for information about restrictions for this service.'],
    ['M127','Missing patient medical record for this service.'],
    ['N386','This decision was based on a National Coverage Determination (NCD).'],
    ['MA130','Your claim contains incomplete and/or invalid information.'],
    ['N290','Missing/incomplete/invalid rendering provider primary identifier.'],
    ['N115','This decision was based on a Local Coverage Determination (LCD).']
  ];
  const pendReasons = [
    'Clinical review in progress — nurse reviewer',
    'Escalated to medical director review',
    'Awaiting medical records: office notes (last 6 months)',
    'Awaiting imaging report / prior conservative therapy documentation',
    'Peer-to-peer review requested',
    'Awaiting lab results supporting medical necessity',
    'Out-of-network review — awaiting network adequacy determination'
  ];

  // Members that appear in every generated roster with the same details.
  // dob is [year, month (1-12), day]; plan must match a name in `plans`.
  const fixedMembers = [
    {
      id: 'YPS113094227', suffix: '', athenaId: '1100493',
      first: 'Itejere', last: 'Chesley', middle: '', gender: 'U', dob: [1975, 11, 21],
      plan: 'Commercial PPO', group: 'GRP410387', employer: 'Brightwater Logistics',
      eligibility: 'Active', effective: [2023, 1, 1], term: null,
      pcp: 'Lakeside Family Medicine', relationship: 'Subscriber',
      address: '2417 Maple Ave', city: 'Columbus', state: 'OH', zip: '43215', phone: '(614) 555-0148'
    }
  ];

  return { firstNames, lastNames, places, streets, streetTypes, plans, employers, icd, categories, pcps, reviewers, posNames, denials, remarks, pendReasons, fixedMembers };
})();
