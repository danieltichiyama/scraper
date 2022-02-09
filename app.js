const axios = require("axios");
const FormData = require("form-data");
const HTMLParser = require("node-html-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const csv = require("csv-parser");
const fs = require("fs");

const baseURL = "https://world.optimizely.com/documentation/Release-Notes";
const packageQuery = "/?packageFilter=";

let packageData = [];

let stream = fs.createReadStream("input.csv").pipe(csv({ headers: false }));

stream.on("data", (row) => {
  let rowObj = {
    package: row["0"],
    oldVersion: row["1"],
    newVersion: row["2"],
  };
  packageData.push(rowObj);
});

let end = new Promise(function (resolve, reject) {
  stream.on("end", () => {
    console.log("CSV file successfully processed");
    resolve(packageData);
  });
});

//outputs an array of version based on site's filters
const getVersions = async (old, updated, package) => {
  try {
    let uri = encodeURI(baseURL + packageQuery + package);
    const response = await axios.get(uri);

    if (response.status !== 200) {
      throw new Error(`HTTP Error, status: ${response.status}`);
    }

    let root = HTMLParser.parse(response.data);
    let versionElements = root.querySelectorAll(".VersionFilters");

    if (versionElements.length === 0) {
      return;
    }
    let versions = versionElements.map((el) => {
      return el.attributes.value;
    });

    let filteredVersions = versions.slice(
      versions.indexOf(updated),
      versions.indexOf(old)
    );

    console.log("versionArray built.");
    return filteredVersions;
  } catch (error) {
    console.log("getVersions() error: ", error);
  }
};

//outputs a FormData object to post to API
const makeFormData = (versionArray, package, count) => {
  if (versionArray.length < 1) {
    throw new Error("makeFormData() error: versionArray length < 1");
  }

  let fields = {
    IsService: "False",
    PackageFilter: package,
    TypeFilter: "All",
    TypeFilter: "All",
    pageSize: count.toString(),
    ShowOnlyReleased: "false",
  };

  let formData = new FormData();

  for (let key in fields) {
    formData.append(key, fields[key]);
  }

  for (let i = 0; i < versionArray.length; i++) {
    formData.append("VersionFilters", versionArray[i]);
  }

  console.log("formData built");
  return formData;
};

//outputs a object of data from Optimizely
const getRows = async (formData, package) => {
  let data = [];

  try {
    let response = await axios({
      url: baseURL,
      method: "post",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
      },
      data: formData,
    });

    if (response.status !== 200) {
      throw new Error(`HTTP Error, status: ${response.status}`);
    }

    let root = HTMLParser.parse(response.data);

    let rows = root.querySelectorAll(".forum-table tr");

    for (i = 1; i < rows.length; i++) {
      let content = rows[i];

      if (i == 1 && content.innerHTML.includes("No matching records found.")) {
        console.log(`No release notes found for ${package}`);
        continue;
      }

      let id = content.querySelector("td > span > a").innerText;
      let url =
        "https://world.optimizely.com" +
        content.querySelector("td > span > a").attributes.href;
      let type = content.querySelector("td > i").attributes.title;
      let description = content
        .querySelector(".w-60 .clickable")
        .textContent.trim();

      let rowObj = { package, id, url, type, description };

      data.push(rowObj);
    }

    console.log(`changelog rows for ${package} retrieved successfully`);
    return data;
  } catch (error) {
    console.log("getRows() Error: ", error);
  }
};

//outputs a CSV file
const writeCSV = async (data) => {
  const csvWriter = createCsvWriter({
    path: `output.csv`,
    header: [
      { id: "id", title: "id" },
      { id: "url", title: "url" },
      { id: "type", title: "type" },
      { id: "description", title: "description" },
      { id: "package", title: "package" },
    ],
  });

  csvWriter
    .writeRecords(data)
    .then(() => console.log("The CSV file was written successfully"))
    .catch((error) => {
      console.log("error", error);
    });
};

async function myAsyncFunction() {
  let data = await end;
  console.log("Looping through packages...");
  let masterArray = [];

  for (let i = 0; i < data.length; i++) {
    let { oldVersion, newVersion, package } = data[i];

    console.log(
      `Finding updates for ${package}, from version ${oldVersion} to ${newVersion}...`
    );

    let versionArray = await getVersions(oldVersion, newVersion, package);

    if (versionArray == undefined) {
      console.log(
        `no versions between ${oldVersion} and ${newVersion} found for ${package}`
      );
      continue;
    }

    let formData = makeFormData(versionArray, package, 1000);

    let rows = await getRows(formData, package);

    masterArray = masterArray.concat(rows);
  }
  writeCSV(masterArray);
}

myAsyncFunction();

//this works... but it the EPiServer.CMS doesn't work when in the for-loop...
//it's the first call, maybe it's happening too soon after the data is written??

// getVersions("11.20.0", "11.20.11", "EPiServer.CMS");
