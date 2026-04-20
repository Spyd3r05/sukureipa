const puppeteer = require("puppeteer");

async function scrapeDoctors() {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(120000); // 2 minutes
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto("https://kmpdc.go.ke/Registers/medical_practitioners.php", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    // Ensure navbar toggle is visible and click it (needed for mobile view)
    await page.waitForSelector(".navbar-toggle", { visible: true });
    await page.click(".navbar-toggle");

    // Wait for the main table to appear
    await page.waitForSelector("#DataTables_Table_0", { timeout: 10000 });

    // Select 100 entries per page using a more resilient selector
    await page.waitForSelector("div.dataTables_length select", {
      visible: true,
    });
    await page.select("div.dataTables_length select", "100");

    // Wait for the table to be repopulated after changing entries
    await page.waitForSelector("#DataTables_Table_0 tbody tr td:nth-child(2)", {
      timeout: 10000,
    });

    let hasNextPage = true;
    const allData = [];

    while (hasNextPage) {
      // Scrape current page data
      const pageData = await page.evaluate((rowSelector) => {
        const rows = Array.from(document.querySelectorAll(rowSelector));
        return rows
          .map((row) => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 9) return null; // skip malformed rows
            return {
              fullname: cells[0]?.innerText.trim() || "",
              reg_no: cells[1]?.innerText.trim() || "",
              address: cells[2]?.innerText.trim() || "",
              qualifications: cells[3]?.innerText.trim() || "",
              discipline: cells[4]?.innerText.trim() || "",
              speciality: cells[5]?.innerText.trim() || "",
              sub_speciality: cells[6]?.innerText.trim() || "",
              status: cells[7]?.innerText.trim() || "",
            };
          })
          .filter((item) => item !== null);
      }, "#DataTables_Table_0 tbody tr");

      allData.push(...pageData);
      // --- PAGINATION HANDLING (AJAX, NO FULL PAGE RELOAD) ---
      // Check if the "Next" button is enabled
      const nextButton = await page.$("ul.pagination li.next:not(.disabled) a");
      if (!nextButton) {
        hasNextPage = false;
        break;
      }

      // CHANGE: Because the site uses AJAX pagination, we must NOT use waitForNavigation.
      // Instead, we wait for the table content to actually change.

      // 1. Capture a reference to the first row's text content BEFORE clicking.
      const oldFirstRowText = await page.$eval(
        "#DataTables_Table_0 tbody tr:first-child",
        (el) => el.innerText,
      );

      await nextButton.click();

      await page.waitForFunction(
        (oldText) => {
          const firstRow = document.querySelector(
            "#DataTables_Table_0 tbody tr:first-child",
          );
          return !firstRow || firstRow.innerText !== oldText;
        },
        { timeout: 10000 },
        oldFirstRowText,
      );

      // Fixed wait to ensure the page is fully loaded
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await page.waitForSelector(
        "#DataTables_Table_0 tbody tr td:nth-child(2)",
        { timeout: 5000 },
      );
    }

    await browser.close();
    return allData;
  } catch (error) {
    return [];
  }
}

module.exports = { scrapeDoctors };
