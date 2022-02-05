const axios = require("axios");
const FormData = require("form-data");
const HTMLParser = require("node-html-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const baseURL = "https://world.optimizely.com/documentation/Release-Notes";
const packageQuery = "/?packageFilter=";
const package = "EPiServer.CMS.UI";
const newVersion = "11.36.4";
const oldVersion = "11.30.0";

const getRows = async () => {
  let fields = {
    IsService: "False",
    VersionFilters: "11.36.4",
    PackageFilter: package,
    TypeFilter: "All",
    TypeFilter: "All",
    pageSize: "10",
    ShowOnlyReleased: "false",
  };

  let formData = new FormData();
  let data = [];

  for (let key in fields) {
    formData.append(key, fields[key]);
  }

  try {
    const response = await axios({
      url: baseURL,
      method: "post",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
      },
      data: formData,
    });
    let root = HTMLParser.parse(response.data);

    let rows = root.querySelectorAll(".forum-table tr");

    for (i = 1; i < rows.length; i++) {
      let content = rows[i];

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
    return data;
  } catch (error) {
    console.log("request() error: ", error);
  }
};

//creates an array of version based on site's filters
//uses user input: old version, new version, package name
const getVersions = async (old, update, package) => {
  try {
    const response = await axios.get(baseURL + packageQuery + package);

    let root = HTMLParser.parse(response.data);

    let versionElements = root.querySelectorAll(".VersionFilters");
    let versions = versionElements.map((el) => {
      return el.attributes.value;
    });

    let filteredVersions = versions.slice(
      versions.indexOf(update),
      versions.indexOf(old)
    );

    return filteredVersions;
  } catch (error) {
    console.log("request() error: ", error);
  }
};

const makeFormData = async () => {
  //creates the form data that gets passed to getRows
  //uses getVerions()
  //uses user input for package

  return;
};
const writeCSV = async () => {
  const csvWriter = createCsvWriter({
    path: "out.csv",
    header: [
      { id: "id", title: "ID" },
      { id: "url", title: "URL" },
      { id: "type", title: "TYPE" },
      { id: "description", title: "DESCRIPTION" },
      { id: "package", title: "PACKAGE" },
      {},
    ],
  });

  csvWriter
    .writeRecords(data)
    .then(() => console.log("The CSV file was written successfully"))
    .catch((error) => {
      console.log("error", error);
    });
};

getVersions(oldVersion, newVersion, package).then((data) => {
  console.log(data);
});

getRows().then((data) => {
  console.log(data);
});
