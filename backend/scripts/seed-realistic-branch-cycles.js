require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const QMSForm = require('../models/QMSForm');
const Application = require('../models/Application');
const Certificate = require('../models/Certificate');

const ORGANIZATIONS = [
  {
    company: 'Apex Precision Engineering Pvt Ltd', domain: 'apexprecision.in', contact: 'Ananya Deshmukh', phone: '9876501101',
    scope: 'Manufacture and supply of precision-machined automotive and industrial components.',
    branches: [
      ['Pune Corporate Office', 'Senapati Bapat Road, Shivajinagar, Pune, Maharashtra 411016', 'ISO 9001:2015'],
      ['Chakan Manufacturing Plant', 'Plot A-18, MIDC Chakan Phase II, Pune, Maharashtra 410501', 'ISO 45001:2018'],
      ['Nashik Components Unit', 'Plot 42, Satpur MIDC, Nashik, Maharashtra 422007', 'ISO 14001:2015'],
    ], extraStandard: 'ISO 27001:2022', cycles: 3,
  },
  {
    company: 'Suryodaya Foods and Beverages Ltd', domain: 'suryodayafoods.in', contact: 'Raghav Malhotra', phone: '9876502202',
    scope: 'Processing, packaging, storage and distribution of ready-to-eat foods and beverages.',
    branches: [
      ['Delhi Head Office', '12 Institutional Area, Jasola, New Delhi 110025', 'ISO 9001:2015'],
      ['Noida Food Processing Plant', 'Plot B-7, Sector 80, Noida, Uttar Pradesh 201305', 'ISO 22000:2018'],
      ['Kundli Distribution Centre', 'HSIIDC Industrial Estate, Kundli, Haryana 131028', 'ISO 45001:2018'],
    ], extraStandard: 'ISO 14001:2015', cycles: 2,
  },
  {
    company: 'Nimbus Digital Services Pvt Ltd', domain: 'nimbusdigital.in', contact: 'Kavya Rao', phone: '9876503303',
    scope: 'Cloud application development, managed infrastructure, cybersecurity and business continuity services.',
    branches: [
      ['Bengaluru Headquarters', '8th Floor, Prestige Tech Park, Kadubeesanahalli, Bengaluru, Karnataka 560103', 'ISO 27001:2022'],
      ['Hyderabad Delivery Centre', 'Building 4, Mindspace Madhapur, Hyderabad, Telangana 500081', 'ISO 9001:2015'],
      ['Pune Engineering Centre', 'Tower B, EON IT Park, Kharadi, Pune, Maharashtra 411014', 'ISO 22301:2019'],
    ], extraStandard: 'ISO/IEC 42001:2023', cycles: 2,
  },
  {
    company: 'MedNova Devices India Pvt Ltd', domain: 'mednovadevices.in', contact: 'Dr. Neha Iyer', phone: '9876504404',
    scope: 'Design, manufacture and servicing of sterile diagnostic and patient-monitoring medical devices.',
    branches: [
      ['Chennai Registered Office', 'Anna Salai, Guindy, Chennai, Tamil Nadu 600032', 'ISO 13485:2016'],
      ['Sriperumbudur Medical Plant', 'SIPCOT Industrial Park, Sriperumbudur, Tamil Nadu 602105', 'ISO 9001:2015'],
      ['Bengaluru R&D Centre', 'KIADB Aerospace Park, Devanahalli, Karnataka 562149', 'ISO 27001:2022'],
    ], extraStandard: 'ISO 14001:2015', cycles: 3,
  },
  {
    company: 'GreenGrid Renewable Energy Ltd', domain: 'greengridenergy.in', contact: 'Arjun Mehta', phone: '9876505505',
    scope: 'Engineering, installation, operation and maintenance of solar and wind power assets.',
    branches: [
      ['Ahmedabad Corporate Office', 'SG Highway, Bodakdev, Ahmedabad, Gujarat 380054', 'ISO 50001:2018'],
      ['Kutch Solar Operations', 'Renewable Energy Park, Bhuj, Kutch, Gujarat 370001', 'ISO 14001:2015'],
      ['Jaisalmer Wind Site', 'Industrial Area, Jaisalmer, Rajasthan 345001', 'ISO 45001:2018'],
    ], extraStandard: 'ISO 9001:2015', cycles: 2,
  },
  {
    company: 'Vardhan Textiles and Exports Ltd', domain: 'vardhantextiles.in', contact: 'Meera Shah', phone: '9876506606',
    scope: 'Manufacture, dyeing, finishing and export of woven and knitted textile products.',
    branches: [
      ['Mumbai Export Office', 'Nariman Point, Mumbai, Maharashtra 400021', 'ISO 9001:2015'],
      ['Surat Weaving Plant', 'Sachin GIDC, Surat, Gujarat 394230', 'ISO 14001:2015'],
      ['Coimbatore Processing Unit', 'SIDCO Industrial Estate, Coimbatore, Tamil Nadu 641021', 'ISO 45001:2018'],
    ], extraStandard: 'ISO 50001:2018', cycles: 2,
  },
  {
    company: 'Eastern Steelworks Ltd', domain: 'easternsteelworks.in', contact: 'Siddharth Bose', phone: '9876507707',
    scope: 'Production, testing and dispatch of structural steel, alloy billets and fabricated assemblies.',
    branches: [
      ['Kolkata Corporate Office', 'Sector V, Salt Lake, Kolkata, West Bengal 700091', 'ISO 9001:2015'],
      ['Durgapur Steel Plant', 'Durgapur Industrial Area, Paschim Bardhaman, West Bengal 713212', 'ISO 14001:2015'],
      ['Jamshedpur Fabrication Unit', 'Adityapur Industrial Area, Jamshedpur, Jharkhand 832109', 'ISO 45001:2018'],
    ], extraStandard: 'ISO 50001:2018', cycles: 3,
  },
  {
    company: 'BlueWave Logistics and Warehousing Pvt Ltd', domain: 'bluewavelogistics.in', contact: 'Ishaan Kapoor', phone: '9876508808',
    scope: 'Integrated freight forwarding, temperature-controlled warehousing and distribution services.',
    branches: [
      ['Gurugram Head Office', 'Udyog Vihar Phase IV, Gurugram, Haryana 122015', 'ISO 9001:2015'],
      ['Nhava Sheva Logistics Hub', 'JNPT Logistics Park, Navi Mumbai, Maharashtra 400707', 'ISO 45001:2018'],
      ['Bengaluru Cold Chain Centre', 'Nelamangala Industrial Area, Bengaluru Rural, Karnataka 562123', 'ISO 22000:2018'],
    ], extraStandard: 'ISO 14001:2015', cycles: 2,
  },
];

const FORM_META = {
  1: ['AUD-F-02', 'Application Form'], 2: ['AUD-F-03', 'Application Review and Audit Plan'],
  3: ['AUD-F-03A', 'Three Year Audit Planning'], 4: ['AD-F-03', 'Auditor Declaration'],
  5: ['AUD-F-05', 'Stage 1 Audit Plan'], 6: ['AUD-F-07 S1', 'Stage 1 Meetings'],
  7: ['AUD-F-09', 'Stage 1 Audit Report'], 8: ['AUD-F-22', 'Stage 1 Review Report'],
  9: ['AUD-F-11', 'Stage 2 Audit Plan'], 10: ['AUD-F-07 S2', 'Stage 2 Meetings'],
  11: ['AUD-F-15', 'Stage 2 Audit Report'], 12: ['AUD-F-16', 'Corrective Action Report'],
  13: ['AUD-F-17', 'Corrective Action Closure'], 14: ['AUD-F-21', 'Draft Certificate'],
  15: ['AUD-F-22', 'Final Review Report'], 16: ['AUD-F-02-A', 'Surveillance Application'],
  17: ['AUD-F-06', 'Surveillance Audit Plan'], 18: ['AUD-F-07 (S)', 'Surveillance Meetings'],
  19: ['AUD-F-15 (S)', 'Surveillance Audit Report'], 20: ['AUD-F-22 (S)', 'Surveillance Review'],
  21: ['AUD-F-17 (S)', 'Surveillance CAR'], 22: ['ADMN-F-01', 'Continuation Letter'],
  23: ['AUD-F-09-B', 'Observation Sheet'],
};

function buildProfiles(clientIds) {
  const profiles = [];
  let idIndex = 0;
  ORGANIZATIONS.forEach((org, orgIndex) => {
    org.branches.forEach((branch, branchIndex) => {
      profiles.push(makeProfile(clientIds[idIndex++], org, orgIndex, branch, branchIndex, false));
    });
  });
  ORGANIZATIONS.forEach((org, orgIndex) => {
    profiles.push(makeProfile(clientIds[idIndex++], org, orgIndex, org.branches[0], 0, true));
  });
  return profiles;
}

function makeProfile(clientId, org, orgIndex, branch, branchIndex, extra) {
  const [branchLabel, address, primaryStandard] = branch;
  const standard = extra ? org.extraStandard : primaryStandard;
  const suffix = extra ? 'compliance' : ['hq', 'plant', 'unit'][branchIndex];
  return {
    clientId, orgIndex, branchIndex, extra, company: org.company, branchLabel, address,
    isoStandard: standard, scope: org.scope, name: org.contact, phone: org.phone,
    email: `${suffix}.${String(clientId).toLowerCase().replace(/[^a-z0-9]/g, '')}@${org.domain}`,
    country: 'India', isActive: true, pendingApproval: false,
  };
}

function coreFormData(profile, cycleNumber) {
  return {
    organizationName: profile.company, orgName: profile.company, address: profile.address,
    standards: [profile.isoStandard], isoStandard: profile.isoStandard,
    auditStandards: profile.isoStandard, scopeOfCertification: profile.scope,
    contactPerson: profile.name, emailId: profile.email, mobileNumber: profile.phone,
    countryCode: '+91', modeOfWorking: 'Onsite', applicationType: cycleNumber === 1 ? 'Initial' : 'Re-certification',
    accreditationBody: 'EAS', refno: `QCC/${profile.clientId}/C${cycleNumber}`,
  };
}

async function backupCollections() {
  const names = ['users', 'qmsforms', 'applications', 'certificates'];
  const backup = { createdAt: new Date().toISOString(), database: mongoose.connection.name, collections: {} };
  for (const name of names) backup.collections[name] = await mongoose.connection.db.collection(name).find({}).toArray();
  const dir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `before-realistic-branches-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  return file;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const backupFile = await backupCollections();

  const existing = await User.find({ role: 'client' }).sort({ clientId: 1 });
  const existingIds = existing.map(user => user.clientId);
  let nextNumeric = Math.max(999, ...existingIds.filter(id => /^\d{4}$/.test(id)).map(Number)) + 1;
  const allIds = [...existingIds];
  while (allIds.length < 32) allIds.push(String(nextNumeric++));
  const profiles = buildProfiles(allIds);
  const password = await bcrypt.hash('Demo@123', 10);

  for (const profile of profiles) {
    await User.findOneAndUpdate(
      { clientId: profile.clientId },
      { $set: profile, $setOnInsert: { password, role: 'client' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  }

  const users = await User.find({ clientId: { $in: profiles.map(p => p.clientId) } });
  const userById = Object.fromEntries(users.map(user => [user.clientId, user]));

  for (const profile of profiles) {
    const user = userById[profile.clientId];
    const core = coreFormData(profile, 1);
    const forms = await QMSForm.find({ clientId: profile.clientId });
    for (const form of forms) {
      form.clientRef = user._id;
      form.formData = { ...(form.formData || {}), ...coreFormData(profile, form.cycleNumber || 1) };
      await form.save();
    }

    await Application.updateMany({ client: user._id }, {
      $set: {
        organizationName: profile.company, address: profile.address, country: 'India',
        contactPerson: profile.name, contactNumbers: profile.phone, emailId: profile.email,
        standards: [profile.isoStandard], isoStandard: profile.isoStandard,
        scopeOfCertification: profile.scope, scope: profile.scope,
      },
    });
    await Certificate.updateMany({ clientId: profile.clientId }, {
      $set: {
        orgName: profile.company, address: profile.address, standard: profile.isoStandard,
        scope: profile.scope, contactPerson: profile.name, contactNumber: profile.phone, email: profile.email,
      },
    });
  }

  const templateForms = await QMSForm.find({ clientId: 'CLT-DEMO-001', cycleNumber: 1 }).lean();
  const cycleTargets = profiles.filter(profile => !profile.extra && profile.branchIndex === 0);
  for (const profile of cycleTargets) {
    const user = userById[profile.clientId];
    const cycleCount = ORGANIZATIONS[profile.orgIndex].cycles;
    for (let cycleNumber = 1; cycleNumber <= cycleCount; cycleNumber++) {
      for (let formType = 1; formType <= 23; formType++) {
        const source = templateForms.find(form => form.formType === formType);
        const [formCode, formName] = FORM_META[formType];
        const formData = { ...(source?.formData || {}), ...coreFormData(profile, cycleNumber) };
        await QMSForm.findOneAndUpdate(
          { clientId: profile.clientId, formType, cycleNumber },
          { $set: { clientRef: user._id, formCode, formName, status: cycleNumber < cycleCount ? 'completed' : 'saved', formData } },
          { upsert: true, setDefaultsOnInsert: true },
        );
      }

      let application = await Application.findOne({ client: user._id, cycleNumber });
      if (!application) application = new Application({ client: user._id, cycleNumber });
      Object.assign(application, {
        refno: `QCC/${profile.clientId}/C${cycleNumber}`, status: cycleNumber < cycleCount ? 'certified' : 'under_review',
        progressPercentage: cycleNumber < cycleCount ? 100 : 45,
        progressStages: cycleNumber < cycleCount ? ['submitted', 'under_review', 'audit_stage1', 'audit_stage2', 'approved', 'certified'] : ['submitted', 'under_review'],
        organizationName: profile.company, address: profile.address, country: 'India', contactPerson: profile.name,
        contactNumbers: profile.phone, emailId: profile.email, standards: [profile.isoStandard], isoStandard: profile.isoStandard,
        scopeOfCertification: profile.scope, scope: profile.scope, applicationType: cycleNumber === 1 ? 'Initial' : 'Re-certification',
        accreditationBody: 'EAS', submittedAt: new Date(2023 + cycleNumber, profile.orgIndex, 10),
      });
      await application.save();
      await QMSForm.updateOne({ clientId: profile.clientId, formType: 1, cycleNumber }, { $set: { application: application._id } });

      if (cycleNumber < cycleCount) {
        const a = String(profile.orgIndex + 10).padStart(2, '0');
        const b = String(cycleNumber + profile.orgIndex + 20).padStart(2, '0');
        const certNumber = `QCC/${a}${String.fromCharCode(65 + profile.orgIndex)}${b}${String.fromCharCode(75 + cycleNumber)}/0${(profile.orgIndex % 8) + 1}26`;
        const issueDate = new Date(2023 + cycleNumber, profile.orgIndex, 15);
        const expiryDate = new Date(issueDate); expiryDate.setFullYear(issueDate.getFullYear() + 3);
        await Certificate.findOneAndUpdate(
          { certNumber },
          { $set: { orgName: profile.company, standard: profile.isoStandard, scope: profile.scope, address: profile.address,
            contactPerson: profile.name, contactNumber: profile.phone, email: profile.email, accreditation: 'EAS', clientId: profile.clientId,
            issueDate, expiryDate, surveillanceDate: new Date(issueDate.getFullYear() + 1, issueDate.getMonth(), issueDate.getDate()),
            surveillanceDate2: new Date(issueDate.getFullYear() + 2, issueDate.getMonth(), issueDate.getDate()), linkedApplication: application._id } },
          { upsert: true, setDefaultsOnInsert: true },
        );
      }
    }
  }

  const result = {
    backupFile,
    clients: await User.countDocuments({ role: 'client' }),
    companies: new Set(profiles.map(p => p.company)).size,
    branches: new Set(profiles.map(p => `${p.company}|${p.branchLabel}`)).size,
    qmsForms: await QMSForm.countDocuments(),
    applications: await Application.countDocuments(),
    certificates: await Certificate.countDocuments(),
  };
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
