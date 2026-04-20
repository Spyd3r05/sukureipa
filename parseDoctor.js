function parseDoctor(raw) {
  return {
    fullname: raw.fullname || null,
    regNo: raw.reg_no || null,
    address: raw.address || null,
    qualifications: raw.qualifications || null,
    discipline: raw.discipline || null,
    speciality: raw.speciality || null,
    subSpeciality: raw.sub_speciality || null,
    status: raw.status?.toUpperCase() || "UNKNOWN",
  };
}

function parseDoctors(rawList) {
  return rawList.map(parseDoctor);
}

module.exports = { parseDoctors };
