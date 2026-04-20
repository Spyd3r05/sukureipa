const { scrapeDoctors } = require("./scraper");
const { parseDoctors } = require("./parseDoctor");
const fs = require("fs");
(async () => {
  const raw = await scrapeDoctors();
  const parsed = parseDoctors(raw);

  //save the data in a file in a json file
  fs.writeFileSync("doctors.json", JSON.stringify(parsed, null, 2));
})();
