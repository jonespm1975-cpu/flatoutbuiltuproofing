/* Flat Out Built-Up Roofing — free section link upgrade. Load AFTER the existing inline homepage script. */
(() => {
  if (typeof content === 'undefined') return;
  const a = (label, url) => [label, url];
  Object.assign(content, {
    home: ['Home','Explore the free roofing handbook, beginner training, gallery, safety and discussion resources.',[a('Free learning library','free-hub.html'),a('Beginner training','new-to-flat-roofing.html')]],
    learn: ['Learn','Free UK built-up felt roofing lessons, illustrated diagrams and knowledge checks.',[a('Free handbook and lessons','free-hub.html'),a('New to flat roofing','new-to-flat-roofing.html'),a('Original introductory lesson','lessons/introduction.html')]],
    academy: ['Academy','Free learning material is available now. Paid courses remain separate and are not activated by this update.',[a('Free training library','free-hub.html'),a('Original introductory lesson','lessons/introduction.html')]],
    safety: ['Safety Centre','UK safety learning, work-at-height awareness, hot works and official HSE references.',[a('Safety training','free-hub.html#working-at-height'),a('Fire and hot works','free-hub.html#hot-works'),a('HSE official guidance','https://www.hse.gov.uk/construction/')]],
    gallery: ['Contractor Gallery','Gallery information and a submission route for photographs. Submissions are reviewed before publication; there is no automatic public upload.',[a('Open gallery','gallery.html')]],
    sponsors: ['Sponsors','Sponsor recognition and supplier information, with no implied paid endorsements.',[a('Sponsor and supplier information','sponsors.html')]],
    community: ['Community','Community rules, questions and information about the discussion space. Public posting requires a connected moderation service.',[a('Community and discussion','community.html')]],
    tools: ['Tools & Workwear','Electrical tool, battery, PPE and equipment safety information.',[a('110V site tools','free-hub.html#110v-tools'),a('Battery tools','free-hub.html#battery-tools'),a('PPE and workwear','free-hub.html#ppe')]],
    cscs: ['CSCS','Original practice questions and official CITB/CSCS guidance. Not an official test bank.',[a('CSCS practice and revision','free-hub.html#cscs')]],
    qa: ['Q&A','Original roofing questions, common defects and guidance on asking for help.',[a('Roofing Q&A','free-hub.html#qa'),a('Community information','community.html')]],
    free: ['Free — New to Flat Roofing','All free beginner guides and the extended roofing handbook.',[a('Six beginner subjects','new-to-flat-roofing.html'),a('Full free learning library','free-hub.html')]],
    '110v':['110V Tools','Electrical safety and safe equipment checks.',[a('Open free guide','free-hub.html#110v-tools')]],
    battery:['Battery Tools','Battery charging, storage and inspection.',[a('Open free guide','free-hub.html#battery-tools')]],
    harness:['Harness Safety','Hierarchy of control, equipment checks and rescue arrangements.',[a('Open free guide','free-hub.html#working-at-height')]],
    health:['Health & Safety','Risk assessments, roof access, fragile surfaces and emergency planning.',[a('Open free guide','free-hub.html#health-safety')]],
    hot:['Hot Works','Fire prevention and emergency awareness for roof works.',[a('Open free guide','free-hub.html#hot-works')]],
    maintenance:['Maintenance','Roof inspections and reporting defects.',[a('Open free guide','free-hub.html#maintenance')]]
  });
})();
